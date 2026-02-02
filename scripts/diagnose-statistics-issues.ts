import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 통계 시스템 문제 진단 상세 스크립트
 * 
 * 각 문제의 구체적인 원인을 찾기 위한 상세 분석
 */
async function diagnoseStatisticsIssues() {
  const admin = createAdminSupabase()

  console.log('='.repeat(80))
  console.log('통계 시스템 문제 진단 (상세)')
  console.log('='.repeat(80))
  console.log()

  // ==========================================
  // 1. Visit API 저장 실패 원인 확인
  // ==========================================
  console.log('1️⃣ Visit API 저장 실패 원인 확인\n')

  // 최근 등록 중 Visit이 없는 항목 확인
  const { data: recentEntries } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, marketing_campaign_link_id')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log('  최근 등록 20건 중 Visit 확인:')
  for (const entry of recentEntries || []) {
    const { data: visits } = await admin
      .from('event_access_logs')
      .select('id, session_id, accessed_at, converted_at')
      .eq('campaign_id', (entry as any).campaign_id)
      .gte('accessed_at', new Date((entry as any).created_at).getTime() - 24 * 60 * 60 * 1000)
      .lte('accessed_at', new Date((entry as any).created_at).getTime() + 60 * 60 * 1000)

    const visitCount = visits?.length || 0
    const convertedCount = visits?.filter((v: any) => v.converted_at).length || 0
    const status = visitCount === 0 ? '❌ Visit 없음' : convertedCount > 0 ? '✅ 연결됨' : '⚠️  Visit 있으나 미연결'
    console.log(`    ${status} - 등록 ID: ${(entry as any).id}, Visit: ${visitCount}건, 연결: ${convertedCount}건`)
  }
  console.log()

  // ==========================================
  // 2. UTM 전달 경로 확인
  // ==========================================
  console.log('2️⃣ UTM 전달 경로 확인\n')

  // UTM이 있는 등록 vs 없는 등록 비교
  const { data: entriesWithUTM } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, utm_medium, marketing_campaign_link_id')
    .not('utm_source', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: entriesWithoutUTM } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, marketing_campaign_link_id')
    .is('utm_source', null)
    .is('marketing_campaign_link_id', null)
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('  UTM이 있는 등록 (최근 10건):')
  entriesWithUTM?.forEach((e: any) => {
    console.log(`    - ${(e as any).id}: Source=${(e as any).utm_source}, Medium=${(e as any).utm_medium}, Link=${(e as any).marketing_campaign_link_id ? '있음' : '없음'}`)
  })
  console.log()

  console.log('  UTM이 없는 등록 (최근 10건):')
  entriesWithoutUTM?.forEach((e: any) => {
    console.log(`    - ${(e as any).id}: Source=null, Link=null`)
  })
  console.log()

  // ==========================================
  // 3. 링크 사용 현황 확인
  // ==========================================
  console.log('3️⃣ 링크 사용 현황 확인\n')

  const { data: activeLinks } = await admin
    .from('campaign_link_meta')
    .select('id, name, cid, utm_source, utm_medium, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log('  활성 링크별 사용 현황:')
  for (const link of activeLinks || []) {
    const { count: conversionCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_campaign_link_id', (link as any).id)

    const { count: visitCount } = await admin
      .from('event_access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_campaign_link_id', (link as any).id)

    const usage = (conversionCount ?? 0) > 0 || (visitCount ?? 0) > 0 ? '✅ 사용됨' : '❌ 미사용'
    console.log(`    ${usage} - ${(link as any).name || (link as any).cid}: 전환=${conversionCount ?? 0}건, Visit=${visitCount ?? 0}건`)
  }
  console.log()

  // ==========================================
  // 4. 집계 함수 문제 확인
  // ==========================================
  console.log('4️⃣ 집계 함수 문제 확인\n')

  // 클라이언트별 캠페인 확인
  const { data: clients } = await admin
    .from('clients')
    .select('id, name')
    .limit(5)

  for (const client of clients || []) {
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id, title, client_id')
      .eq('client_id', client.id)
      .limit(5)

    const { count: entriesCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaigns?.map((c: any) => c.id) || [])

    console.log(`  ${client.name}:`)
    console.log(`    - 캠페인 수: ${campaigns?.length || 0}개`)
    console.log(`    - 등록 수: ${entriesCount ?? 0}건`)

    if (campaigns && campaigns.length > 0 && (entriesCount ?? 0) > 0) {
      // RPC 함수 테스트
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const toDate = new Date().toISOString().split('T')[0]

      try {
        const { data: summary, error } = await admin.rpc('get_marketing_summary', {
          p_client_id: client.id,
          p_from_date: fromDate,
          p_to_date: toDate,
        })

        if (error) {
          console.log(`    - RPC 오류: ${error.message}`)
        } else {
          const total = (summary as any)?.total_conversions || 0
          console.log(`    - RPC 결과: 전환 ${total}건`)
          if (total === 0 && (entriesCount ?? 0) > 0) {
            console.log(`    - ⚠️  문제: 등록은 ${entriesCount}건인데 RPC는 0건 반환`)
          }
        }
      } catch (err: any) {
        console.log(`    - RPC 예외: ${err.message}`)
      }
    }
    console.log()
  }

  // ==========================================
  // 5. 워트 캠페인 상세 분석
  // ==========================================
  console.log('5️⃣ 워트 캠페인 상세 분석\n')

  const wertCampaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a'

  const { data: wertEntries } = await admin
    .from('event_survey_entries')
    .select('id, created_at, utm_source, utm_medium, marketing_campaign_link_id')
    .eq('campaign_id', wertCampaignId)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: wertVisits } = await admin
    .from('event_access_logs')
    .select('id, accessed_at, utm_source, marketing_campaign_link_id, converted_at')
    .eq('campaign_id', wertCampaignId)
    .order('accessed_at', { ascending: false })
    .limit(20)

  console.log(`  워트 캠페인 (${wertCampaignId}):`)
  console.log(`    - 등록 수: ${wertEntries?.length || 0}건 (최근 20건)`)
  console.log(`    - Visit 수: ${wertVisits?.length || 0}건 (최근 20건)`)

  if (wertEntries && wertEntries.length > 0) {
    const withUTM = wertEntries.filter((e: any) => (e as any).utm_source).length
    const withLink = wertEntries.filter((e: any) => (e as any).marketing_campaign_link_id).length
    console.log(`    - UTM 있는 등록: ${withUTM}건`)
    console.log(`    - 링크 있는 등록: ${withLink}건`)
  }

  if (wertVisits && wertVisits.length > 0) {
    const converted = wertVisits.filter((v: any) => (v as any).converted_at).length
    console.log(`    - 전환된 Visit: ${converted}건`)
  }
  console.log()

  console.log('='.repeat(80))
  console.log('진단 완료')
  console.log('='.repeat(80))
}

diagnoseStatisticsIssues().catch(console.error)
