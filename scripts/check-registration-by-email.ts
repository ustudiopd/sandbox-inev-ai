/**
 * 이메일로 등록 데이터 확인 (CID 저장 여부)
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const CAMPAIGN_ID = 'd220d5dc-1f01-4b1b-9c33-e1badd793e98' // 모두의특강 테스트 등록 페이지

async function checkRegistrationByEmail() {
  const admin = createAdminSupabase()
  
  console.log('🔍 이메일로 등록 데이터 확인\n')
  console.log('=' .repeat(60))
  
  // 최근 1시간 내 등록 확인
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data: entries, error } = await admin
    .from('event_survey_entries')
    .select(`
      id,
      campaign_id,
      name,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      registration_data,
      marketing_campaign_link_id,
      created_at
    `)
    .eq('campaign_id', CAMPAIGN_ID)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  최근 1시간 내 등록이 없습니다.')
    return
  }
  
  console.log(`✅ 최근 1시간 내 등록 ${entries.length}건 발견\n`)
  
  entries.forEach((entry, index) => {
    console.log(`📌 등록 #${index + 1}`)
    console.log(`   ID: ${entry.id}`)
    console.log(`   이름: ${entry.name || 'N/A'}`)
    
    // 이메일 확인
    let email = null
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      email = regData.email || null
    }
    console.log(`   이메일: ${email || 'N/A'}`)
    
    console.log(`   생성일: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
    console.log(`   UTM Source: ${entry.utm_source || '❌ 없음'}`)
    console.log(`   UTM Medium: ${entry.utm_medium || '❌ 없음'}`)
    console.log(`   UTM Campaign: ${entry.utm_campaign || '❌ 없음'}`)
    
    // CID 확인
    let cidValue = null
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      cidValue = regData.cid || regData.CID || null
    }
    
    if (cidValue) {
      console.log(`   CID: ✅ ${cidValue}`)
    } else {
      console.log(`   CID: ❌ 없음`)
    }
    
    // registration_data 전체 출력 (디버깅용)
    if (entry.registration_data) {
      console.log(`   Registration Data: ${JSON.stringify(entry.registration_data, null, 2)}`)
    }
    
    console.log('')
  })
  
  // CID 저장 통계
  const cidCount = entries.filter(e => {
    if (e.registration_data && typeof e.registration_data === 'object') {
      const regData = e.registration_data as any
      return !!(regData.cid || regData.CID)
    }
    return false
  }).length
  
  console.log('=' .repeat(60))
  console.log('\n📊 CID 저장 통계\n')
  console.log(`   최근 1시간 내 등록: ${entries.length}건`)
  console.log(`   CID 저장: ${cidCount}건 (${entries.length > 0 ? ((cidCount / entries.length) * 100).toFixed(1) : 0}%)\n`)
  
  if (cidCount > 0) {
    console.log('✅ CID 저장 정상 동작 중!')
  } else {
    console.log('⚠️  CID 저장이 확인되지 않았습니다.')
    console.log('   배포가 완료되었는지 확인하거나, 잠시 후 다시 시도해주세요.\n')
  }
}

checkRegistrationByEmail().catch(console.error)
