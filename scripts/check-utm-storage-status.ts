import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkUTMStorageStatus() {
  const admin = createAdminSupabase()
  
  console.log('🔍 오늘 등록 데이터 UTM 저장 현황 확인\n')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data, error } = await admin
    .from('event_survey_entries')
    .select('id, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  console.log(`📊 전체 등록: ${data?.length || 0}개`)
  console.log(`✅ utm_source 있는 것: ${data?.filter(e => e.utm_source).length || 0}개`)
  console.log(`✅ utm_medium 있는 것: ${data?.filter(e => e.utm_medium).length || 0}개`)
  console.log(`✅ marketing_campaign_link_id 있는 것: ${data?.filter(e => e.marketing_campaign_link_id).length || 0}개`)
  
  if (data && data.length > 0) {
    console.log('\n📋 샘플 데이터 (최근 5개):')
    data.slice(0, 5).forEach((e, i) => {
      console.log(`${i + 1}. utm_source: ${e.utm_source || 'null'}, utm_medium: ${e.utm_medium || 'null'}, link_id: ${e.marketing_campaign_link_id || 'null'}`)
    })
    
    const utmRate = ((data.filter(e => e.utm_source).length / data.length) * 100).toFixed(1)
    const linkRate = ((data.filter(e => e.marketing_campaign_link_id).length / data.length) * 100).toFixed(1)
    
    console.log(`\n📈 통계:`)
    console.log(`- UTM 저장률: ${utmRate}%`)
    console.log(`- 링크 ID 저장률: ${linkRate}%`)
    
    if (data.filter(e => e.utm_source).length === 0) {
      console.log('\n⚠️ 경고: UTM이 저장되지 않았습니다.')
      console.log('가능한 원인:')
      console.log('1. 등록 페이지에서 UTM 파라미터가 전달되지 않음')
      console.log('2. 등록 API에서 UTM 저장 로직 문제')
    } else {
      console.log('\n✅ UTM 추적이 정상 작동 중입니다 (Visit API와 무관)')
    }
  } else {
    console.log('\n⚠️ 오늘 등록 데이터가 없습니다.')
  }
}

checkUTMStorageStatus().catch(console.error)
