/**
 * 이름 또는 이메일로 등록 데이터 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const CAMPAIGN_ID = 'd220d5dc-1f01-4b1b-9c33-e1badd793e98' // 모두의특강 테스트 등록 페이지

// 검색할 이름 또는 이메일 (명령줄 인자로 받거나 여기서 수정)
const searchTerm = process.argv[2] || 'CID테스트' // 기본값: CID테스트

async function checkRegistrationByNameOrEmail() {
  const admin = createAdminSupabase()
  
  console.log(`🔍 "${searchTerm}"로 등록 데이터 검색\n`)
  console.log('=' .repeat(60))
  
  // 이름으로 검색
  const { data: entriesByName, error: nameError } = await admin
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
    .ilike('name', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(10)
  
  // 이메일로 검색 (registration_data에서)
  const { data: allEntries, error: allError } = await admin
    .from('event_survey_entries')
    .select(`
      id,
      campaign_id,
      name,
      utm_source,
      utm_medium,
      utm_campaign,
      registration_data,
      created_at
    `)
    .eq('campaign_id', CAMPAIGN_ID)
    .order('created_at', { ascending: false })
    .limit(50)
  
  // registration_data에서 이메일로 필터링
  const entriesByEmail = allEntries?.filter(entry => {
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      const email = regData.email || ''
      return email.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return false
  }) || []
  
  const allMatches = [
    ...(entriesByName || []),
    ...entriesByEmail.filter(e => !entriesByName?.some(n => n.id === e.id))
  ]
  
  if (allMatches.length === 0) {
    console.log(`⚠️  "${searchTerm}"로 검색된 등록이 없습니다.\n`)
    console.log('최근 등록 10건 확인 중...\n')
    
    const { data: recentEntries } = await admin
      .from('event_survey_entries')
      .select(`
        id,
        name,
        registration_data,
        created_at
      `)
      .eq('campaign_id', CAMPAIGN_ID)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentEntries && recentEntries.length > 0) {
      recentEntries.forEach((entry, index) => {
        const email = entry.registration_data && typeof entry.registration_data === 'object'
          ? (entry.registration_data as any).email || null
          : null
        console.log(`${index + 1}. 이름: ${entry.name || 'N/A'}, 이메일: ${email || 'N/A'}, 시간: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
      })
    }
    
    return
  }
  
  console.log(`✅ 검색 결과 ${allMatches.length}건 발견\n`)
  
  allMatches.forEach((entry, index) => {
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
    
    // registration_data 전체 출력
    if (entry.registration_data) {
      console.log(`   Registration Data: ${JSON.stringify(entry.registration_data, null, 2)}`)
    }
    
    console.log('')
  })
  
  // CID 저장 통계
  const cidCount = allMatches.filter(e => {
    if (e.registration_data && typeof e.registration_data === 'object') {
      const regData = e.registration_data as any
      return !!(regData.cid || regData.CID)
    }
    return false
  }).length
  
  console.log('=' .repeat(60))
  console.log('\n📊 CID 저장 통계\n')
  console.log(`   검색 결과: ${allMatches.length}건`)
  console.log(`   CID 저장: ${cidCount}건 (${allMatches.length > 0 ? ((cidCount / allMatches.length) * 100).toFixed(1) : 0}%)\n`)
  
  if (cidCount > 0) {
    console.log('✅ CID 저장 정상 동작 중!')
  } else {
    console.log('⚠️  CID 저장이 확인되지 않았습니다.')
  }
}

checkRegistrationByNameOrEmail().catch(console.error)
