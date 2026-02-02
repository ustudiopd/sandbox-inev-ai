/**
 * 테스트(test@example.com) 등록 데이터 삭제 스크립트
 * 모든 웨비나/캠페인에서 해당 이메일로 등록된 데이터를 삭제합니다
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const TEST_EMAIL = 'test@example.com'

async function deleteTestRegistration() {
  const admin = createAdminSupabase()
  
  console.log('=== 테스트 등록 데이터 삭제 ===\n')
  console.log(`이메일: ${TEST_EMAIL}\n`)
  
  // 1. 프로필 조회
  console.log('🔍 프로필 조회 중...')
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, display_name, nickname')
    .eq('email', TEST_EMAIL.toLowerCase())
    .maybeSingle()
  
  if (profileError) {
    console.error('❌ 프로필 조회 실패:', profileError.message)
    process.exit(1)
  }
  
  if (!profile) {
    console.log(`⚠️  이메일 "${TEST_EMAIL}"로 등록된 프로필을 찾을 수 없습니다.`)
    console.log('   event_survey_entries에서만 확인하겠습니다.\n')
  } else {
    console.log(`✅ 프로필 찾음: ${profile.display_name || profile.nickname || '이름 없음'} (ID: ${profile.id})\n`)
  }
  
  // 2. event_survey_entries에서 등록 데이터 찾기 및 삭제
  console.log('🔍 event_survey_entries 조회 중...')
  const { data: allEntries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, name, survey_no, registration_data, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  
  if (entriesError) {
    console.error('❌ 등록 엔트리 조회 실패:', entriesError.message)
  } else {
    // registration_data에서 이메일로 필터링
    const testEntries = allEntries?.filter(entry => {
      if (entry.registration_data && typeof entry.registration_data === 'object') {
        const regData = entry.registration_data as any
        const entryEmail = regData.email || ''
        return entryEmail.toLowerCase() === TEST_EMAIL.toLowerCase()
      }
      return false
    }) || []
    
    if (testEntries.length > 0) {
      console.log(`✅ event_survey_entries에서 ${testEntries.length}건 발견:`)
      testEntries.forEach((entry, index) => {
        console.log(`   ${index + 1}. ID: ${entry.id}, 이름: ${entry.name || '(이름 없음)'}, survey_no: ${entry.survey_no}, 캠페인: ${entry.campaign_id}`)
      })
      console.log(`   삭제 중...`)
      
      const entryIds = testEntries.map(e => e.id)
      const { error: deleteEntryError } = await admin
        .from('event_survey_entries')
        .delete()
        .in('id', entryIds)
      
      if (deleteEntryError) {
        console.error('   ❌ event_survey_entries 삭제 실패:', deleteEntryError.message)
      } else {
        console.log(`   ✅ event_survey_entries 삭제 완료 (${testEntries.length}건)\n`)
      }
    } else {
      console.log(`⚠️  event_survey_entries에서 해당 이메일로 등록된 데이터를 찾을 수 없습니다.\n`)
    }
  }
  
  // 3. registrations에서 웨비나 등록 데이터 삭제
  if (profile) {
    console.log('🔍 registrations 조회 중...')
    const { data: registrations, error: regError } = await admin
      .from('registrations')
      .select('webinar_id, user_id, nickname, created_at, webinars:webinar_id (slug, title)')
      .eq('user_id', profile.id)
    
    if (regError) {
      console.error('❌ registrations 조회 실패:', regError.message)
    } else if (registrations && registrations.length > 0) {
      console.log(`✅ registrations에서 ${registrations.length}건 발견:`)
      registrations.forEach((reg, index) => {
        const webinar = Array.isArray(reg.webinars) ? reg.webinars[0] : reg.webinars
        console.log(`   ${index + 1}. 웨비나: ${webinar?.slug || reg.webinar_id} (${webinar?.title || '제목 없음'}), 닉네임: ${reg.nickname || '(없음)'}`)
      })
      console.log(`   삭제 중...`)
      
      const { error: deleteRegError } = await admin
        .from('registrations')
        .delete()
        .eq('user_id', profile.id)
      
      if (deleteRegError) {
        console.error('   ❌ registrations 삭제 실패:', deleteRegError.message)
      } else {
        console.log(`   ✅ registrations 삭제 완료 (${registrations.length}건)\n`)
      }
    } else {
      console.log(`⚠️  registrations에서 해당 사용자의 등록 데이터를 찾을 수 없습니다.\n`)
    }
  }
  
  // 4. webinar_allowed_emails에서 삭제
  console.log('🔍 webinar_allowed_emails 조회 중...')
  const { data: allowedEmails, error: emailsError } = await admin
    .from('webinar_allowed_emails')
    .select('webinar_id, email, webinars:webinar_id (slug, title)')
    .eq('email', TEST_EMAIL.toLowerCase())
  
  if (emailsError) {
    console.error('❌ webinar_allowed_emails 조회 실패:', emailsError.message)
  } else if (allowedEmails && allowedEmails.length > 0) {
    console.log(`✅ webinar_allowed_emails에서 ${allowedEmails.length}건 발견:`)
    allowedEmails.forEach((item, index) => {
      const webinar = Array.isArray(item.webinars) ? item.webinars[0] : item.webinars
      console.log(`   ${index + 1}. 웨비나: ${webinar?.slug || item.webinar_id} (${webinar?.title || '제목 없음'})`)
    })
    console.log(`   삭제 중...`)
    
    const { error: deleteEmailError } = await admin
      .from('webinar_allowed_emails')
      .delete()
      .eq('email', TEST_EMAIL.toLowerCase())
    
    if (deleteEmailError) {
      console.error('❌ webinar_allowed_emails 삭제 실패:', deleteEmailError.message)
    } else {
      console.log(`✅ webinar_allowed_emails 삭제 완료 (${allowedEmails.length}건)\n`)
    }
  } else {
    console.log(`⚠️  webinar_allowed_emails에서 해당 이메일을 찾을 수 없습니다.\n`)
  }
  
  console.log('=' .repeat(60))
  console.log('\n✅ 작업 완료!')
  console.log(`   이메일 "${TEST_EMAIL}"로 등록된 데이터가 삭제되었습니다.\n`)
}

deleteTestRegistration().catch(console.error)
