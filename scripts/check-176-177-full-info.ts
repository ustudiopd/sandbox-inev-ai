/**
 * 176, 177번 참가자의 전체 정보 조회 (이메일 포함)
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function check176177FullInfo() {
  const admin = createAdminSupabase()
  
  console.log('🔍 176, 177번 참가자 전체 정보 조회\n')
  
  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트 캠페인
  
  // survey_no로 직접 조회
  const { data: entries, error } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('survey_no', [176, 177])
    .order('survey_no', { ascending: true })
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  console.log(`검색 결과: ${entries?.length || 0}개\n`)
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  데이터가 없습니다.')
    return
  }
  
  for (const entry of entries) {
    console.log('='.repeat(80))
    console.log(`📋 ${entry.name} (survey_no: ${entry.survey_no}, code6: ${entry.code6})`)
    console.log('='.repeat(80))
    console.log('')
    
    console.log('📝 기본 정보:')
    console.log(`   이름: ${entry.name}`)
    console.log(`   회사: ${entry.company || entry.registration_data?.company || 'N/A'}`)
    console.log(`   직함: ${entry.registration_data?.position || 'N/A'}`)
    console.log(`   전화번호: ${entry.phone_norm || 'N/A'}`)
    
    // 이메일 확인 (registration_data에서)
    let email = null
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      email = regData.email || null
    }
    console.log(`   이메일: ${email || 'N/A'}`)
    
    console.log(`   생성일: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
    if (entry.completed_at) {
      console.log(`   완료일: ${new Date(entry.completed_at).toLocaleString('ko-KR')}`)
    }
    
    console.log('')
    console.log('📊 UTM 정보:')
    const hasUTM = !!(entry.utm_source || entry.utm_medium || entry.utm_campaign)
    console.log(`   UTM 기록: ${hasUTM ? '✅ 있음' : '❌ 없음'}`)
    if (hasUTM) {
      console.log(`   utm_source: ${entry.utm_source || '없음'}`)
      console.log(`   utm_medium: ${entry.utm_medium || '없음'}`)
      console.log(`   utm_campaign: ${entry.utm_campaign || '없음'}`)
      console.log(`   utm_term: ${entry.utm_term || '없음'}`)
      console.log(`   utm_content: ${entry.utm_content || '없음'}`)
    }
    
    console.log('')
    console.log('🔗 링크 정보:')
    console.log(`   marketing_campaign_link_id: ${entry.marketing_campaign_link_id || '❌ 없음'}`)
    
    // CID 확인
    let cid = null
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      cid = regData.cid || regData.CID || null
    }
    console.log(`   CID: ${cid || '없음'}`)
    
    console.log('')
    console.log('📦 registration_data 전체:')
    if (entry.registration_data) {
      console.log(JSON.stringify(entry.registration_data, null, 2))
    } else {
      console.log('   없음')
    }
    
    console.log('')
  }
  
  console.log('='.repeat(80))
  console.log('✅ 조회 완료')
}

check176177FullInfo()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
