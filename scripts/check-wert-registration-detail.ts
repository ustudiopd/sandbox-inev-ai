import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const WERT_CAMPAIGN_ID = '3a88682e-6fab-463c-8328-6b403c8c5c7a'

async function checkWertRegistrationDetail() {
  const admin = createAdminSupabase()

  // 이메일로 검색 (명령줄 인자 또는 기본값)
  const searchEmail = process.argv[2] || 'ju@naver.com'
  const email = searchEmail
  const name = '황상원' // 이전 검색용

  console.log('🔍 워트 등록 상세 확인\n')
  console.log(`검색 조건:`)
  console.log(`  - 이메일: ${email}`)
  console.log(`  - 이름: ${name}`)
  console.log(`  - 캠페인 ID: ${WERT_CAMPAIGN_ID}\n`)

  // 이메일로 검색 (registration_data에서)
  const { data: allEntries, error: allError } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', WERT_CAMPAIGN_ID)
    .order('created_at', { ascending: false })
    .limit(200)

  if (allError) {
    console.error('❌ 등록 조회 실패:', allError)
    return
  }

  // registration_data에서 이메일로 필터링
  const entriesByEmail = allEntries?.filter(entry => {
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      const entryEmail = regData.email || ''
      return entryEmail.toLowerCase().includes(email.toLowerCase())
    }
    return false
  }) || []

  // 이름으로 검색
  const { data: entriesByName, error: nameError } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', WERT_CAMPAIGN_ID)
    .ilike('name', `%${name}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (nameError) {
    console.error('❌ 이름 검색 실패:', nameError)
  }

  // 최근 등록 확인 (최근 1시간)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentEntries, error: recentError } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', WERT_CAMPAIGN_ID)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  if (recentError) {
    console.error('❌ 최근 등록 검색 실패:', recentError)
    return
  }

  // 결과 출력
  console.log('=' .repeat(80))
  console.log('📧 이메일로 검색 결과\n')
  
  if (entriesByEmail && entriesByEmail.length > 0) {
    entriesByEmail.forEach((entry, index) => {
      console.log(`\n등록 #${index + 1}`)
      console.log(`  ID: ${entry.id}`)
      console.log(`  이름: ${entry.name || 'N/A'}`)
      
      // 이메일 확인 (registration_data에서)
      let entryEmail = null
      if (entry.registration_data && typeof entry.registration_data === 'object') {
        const regData = entry.registration_data as any
        entryEmail = regData.email || null
      }
      console.log(`  이메일: ${entryEmail || 'N/A'}`)
      console.log(`  회사: ${entry.company || 'N/A'}`)
      console.log(`  전화: ${entry.phone_norm || 'N/A'}`)
      console.log(`  생성일: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
      
      console.log(`\n  📊 UTM 파라미터:`)
      console.log(`    utm_source: ${entry.utm_source || '❌ 없음'}`)
      console.log(`    utm_medium: ${entry.utm_medium || '❌ 없음'}`)
      console.log(`    utm_campaign: ${entry.utm_campaign || '❌ 없음'}`)
      console.log(`    utm_term: ${entry.utm_term || '❌ 없음'}`)
      console.log(`    utm_content: ${entry.utm_content || '❌ 없음'}`)
      
      // CID 확인
      let cidValue = null
      if (entry.registration_data && typeof entry.registration_data === 'object') {
        const regData = entry.registration_data as any
        cidValue = regData.cid || regData.CID || null
      }
      
      console.log(`\n  🔗 추적 정보:`)
      console.log(`    CID: ${cidValue ? `✅ ${cidValue}` : '❌ 없음'}`)
      console.log(`    marketing_campaign_link_id: ${entry.marketing_campaign_link_id || '❌ 없음'}`)
      console.log(`    utm_first_visit_at: ${entry.utm_first_visit_at || '❌ 없음'}`)
      console.log(`    utm_referrer: ${entry.utm_referrer || '❌ 없음'}`)
      
      // registration_data 전체 출력 (디버깅용)
      if (entry.registration_data) {
        console.log(`\n  📦 Registration Data:`)
        console.log(`    ${JSON.stringify(entry.registration_data, null, 2)}`)
      }
    })
  } else {
    console.log('  ❌ 검색 결과 없음')
  }

  console.log('\n' + '=' .repeat(80))
  console.log('👤 이름으로 검색 결과\n')
  
  if (entriesByName && entriesByName.length > 0) {
    entriesByName.forEach((entry, index) => {
      console.log(`\n등록 #${index + 1}`)
      console.log(`  ID: ${entry.id}`)
      console.log(`  이름: ${entry.name || 'N/A'}`)
      
      // 이메일 확인 (registration_data에서)
      let entryEmail = null
      if (entry.registration_data && typeof entry.registration_data === 'object') {
        const regData = entry.registration_data as any
        entryEmail = regData.email || null
      }
      console.log(`  이메일: ${entryEmail || 'N/A'}`)
      console.log(`  생성일: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
      console.log(`  UTM Source: ${entry.utm_source || '❌ 없음'}`)
      console.log(`  CID: ${entry.registration_data && typeof entry.registration_data === 'object' ? (entry.registration_data as any).cid || '❌ 없음' : '❌ 없음'}`)
    })
  } else {
    console.log('  ❌ 검색 결과 없음')
  }

  console.log('\n' + '=' .repeat(80))
  console.log('📅 오늘 워트 등록 (최근 10건)\n')
  
  if (recentEntries && recentEntries.length > 0) {
    recentEntries.forEach((entry, index) => {
      const hasUTM = !!(entry.utm_source || entry.utm_medium || entry.utm_campaign)
      const regData = entry.registration_data && typeof entry.registration_data === 'object' ? entry.registration_data as any : null
      const hasCID = !!(regData?.cid || regData?.CID)
      const entryEmail = regData?.email || null
      
      console.log(`\n${index + 1}. ${entry.name || 'N/A'} (${entryEmail || 'N/A'})`)
      console.log(`   생성일: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
      console.log(`   UTM: ${hasUTM ? '✅ 있음' : '❌ 없음'} ${hasUTM ? `(${entry.utm_source || '-'}/${entry.utm_medium || '-'})` : ''}`)
      console.log(`   CID: ${hasCID ? `✅ ${regData?.cid || regData?.CID}` : '❌ 없음'}`)
      console.log(`   Link ID: ${entry.marketing_campaign_link_id ? '✅ 있음' : '❌ 없음'}`)
    })
    
    // 통계
    const withUTM = recentEntries.filter(e => !!(e.utm_source || e.utm_medium || e.utm_campaign)).length
    const withCID = recentEntries.filter(e => {
      if (e.registration_data && typeof e.registration_data === 'object') {
        const regData = e.registration_data as any
        return !!(regData?.cid || regData?.CID)
      }
      return false
    }).length
    const withLinkId = recentEntries.filter(e => !!e.marketing_campaign_link_id).length
    
    console.log('\n' + '=' .repeat(80))
    console.log('📊 오늘 등록 통계\n')
    console.log(`  전체 등록: ${recentEntries.length}건`)
    console.log(`  UTM 저장: ${withUTM}건 (${((withUTM / recentEntries.length) * 100).toFixed(1)}%)`)
    console.log(`  CID 저장: ${withCID}건 (${((withCID / recentEntries.length) * 100).toFixed(1)}%)`)
    console.log(`  Link ID 저장: ${withLinkId}건 (${((withLinkId / recentEntries.length) * 100).toFixed(1)}%)`)
  } else {
    console.log('  ❌ 오늘 등록 없음')
  }
}

checkWertRegistrationDetail().catch(console.error)
