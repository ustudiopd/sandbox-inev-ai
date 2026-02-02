/**
 * 양승철(ad@ustudio.co.kr) 테스트 등록 데이터 삭제 스크립트
 * 웨비나 426307에서 등록된 데이터를 삭제합니다
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const TEST_EMAIL = 'ad@ustudio.co.kr'
const WEBINAR_SLUG = '426307'

async function deleteYangSeungCheolRegistration() {
  const admin = createAdminSupabase()
  
  console.log('=== 양승철 테스트 등록 데이터 삭제 ===\n')
  console.log(`이메일: ${TEST_EMAIL}`)
  console.log(`웨비나: ${WEBINAR_SLUG}\n`)
  
  // 1. 웨비나 426307 조회
  console.log('🔍 웨비나 426307 조회 중...')
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, title, slug, registration_campaign_id')
    .eq('slug', WEBINAR_SLUG)
    .maybeSingle()
  
  if (webinarError) {
    console.error('❌ 웨비나 조회 실패:', webinarError.message)
    process.exit(1)
  }
  
  if (!webinar) {
    console.error(`❌ 웨비나 ${WEBINAR_SLUG}을 찾을 수 없습니다.`)
    process.exit(1)
  }
  
  console.log(`✅ 웨비나 찾음: ${webinar.title} (ID: ${webinar.id})`)
  console.log(`   등록 캠페인 ID: ${webinar.registration_campaign_id || '없음'}\n`)
  
  // 2. 프로필 조회 (이메일로)
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
  
  // 3. event_survey_entries에서 등록 데이터 찾기
  if (webinar.registration_campaign_id) {
    console.log('🔍 event_survey_entries 조회 중...')
    const { data: allEntries, error: entriesError } = await admin
      .from('event_survey_entries')
      .select('*')
      .eq('campaign_id', webinar.registration_campaign_id)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (entriesError) {
      console.error('❌ 등록 엔트리 조회 실패:', entriesError.message)
    } else {
      // registration_data에서 이메일로 필터링
      const testEntry = allEntries?.find(entry => {
        if (entry.registration_data && typeof entry.registration_data === 'object') {
          const regData = entry.registration_data as any
          const entryEmail = regData.email || ''
          return entryEmail.toLowerCase() === TEST_EMAIL.toLowerCase()
        }
        return false
      })
      
      if (testEntry) {
        console.log(`✅ event_survey_entries에서 등록 발견:`)
        console.log(`   ID: ${testEntry.id}`)
        console.log(`   이름: ${testEntry.name || '(이름 없음)'}`)
        console.log(`   survey_no: ${testEntry.survey_no}`)
        console.log(`   등록일시: ${testEntry.created_at}`)
        console.log(`   삭제 중...`)
        
        const { error: deleteEntryError } = await admin
          .from('event_survey_entries')
          .delete()
          .eq('id', testEntry.id)
        
        if (deleteEntryError) {
          console.error('   ❌ event_survey_entries 삭제 실패:', deleteEntryError.message)
        } else {
          console.log(`   ✅ event_survey_entries 삭제 완료 (survey_no: ${testEntry.survey_no})\n`)
        }
      } else {
        console.log(`⚠️  event_survey_entries에서 해당 이메일로 등록된 데이터를 찾을 수 없습니다.\n`)
      }
    }
  }
  
  // 4. registrations에서 웨비나 등록 데이터 삭제
  if (profile) {
    console.log('🔍 registrations 조회 중...')
    const { data: registration, error: regError } = await admin
      .from('registrations')
      .select('*')
      .eq('webinar_id', webinar.id)
      .eq('user_id', profile.id)
      .maybeSingle()
    
    if (regError) {
      console.error('❌ registrations 조회 실패:', regError.message)
    } else if (registration) {
      console.log(`✅ registrations에서 등록 발견:`)
      console.log(`   웨비나 ID: ${registration.webinar_id}`)
      console.log(`   사용자 ID: ${registration.user_id}`)
      console.log(`   닉네임: ${registration.nickname || '(없음)'}`)
      console.log(`   등록일시: ${registration.created_at}`)
      console.log(`   삭제 중...`)
      
      const { error: deleteRegError } = await admin
        .from('registrations')
        .delete()
        .eq('webinar_id', webinar.id)
        .eq('user_id', profile.id)
      
      if (deleteRegError) {
        console.error('   ❌ registrations 삭제 실패:', deleteRegError.message)
      } else {
        console.log(`   ✅ registrations 삭제 완료\n`)
      }
    } else {
      console.log(`⚠️  registrations에서 해당 사용자의 등록 데이터를 찾을 수 없습니다.\n`)
    }
  }
  
  // 5. webinar_allowed_emails에서 삭제
  console.log('🔍 webinar_allowed_emails 조회 중...')
  const { error: deleteEmailError } = await admin
    .from('webinar_allowed_emails')
    .delete()
    .eq('webinar_id', webinar.id)
    .eq('email', TEST_EMAIL.toLowerCase())
  
  if (deleteEmailError) {
    console.error('❌ webinar_allowed_emails 삭제 실패:', deleteEmailError.message)
  } else {
    console.log(`✅ webinar_allowed_emails 삭제 완료 (있다면)\n`)
  }
  
  console.log('=' .repeat(60))
  console.log('\n✅ 작업 완료!')
  console.log(`   이메일 "${TEST_EMAIL}"로 등록된 데이터가 삭제되었습니다.\n`)
}

deleteYangSeungCheolRegistration().catch(console.error)
