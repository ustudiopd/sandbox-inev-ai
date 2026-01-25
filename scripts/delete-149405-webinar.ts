/**
 * 149405 웨비나 삭제 스크립트
 * 사용법: npx tsx scripts/delete-149405-webinar.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function delete149405Webinar() {
  try {
    const admin = createAdminSupabase()
    
    // 1. 149405 웨비나 찾기
    console.log('\n🔍 149405 웨비나 조회 중...')
    
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, slug, registration_campaign_id')
      .eq('slug', '149405')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (!webinar) {
      console.log(`⚠️  149405 웨비나를 찾을 수 없습니다 (이미 삭제되었을 수 있음)`)
      process.exit(0)
    }
    
    console.log(`✅ 웨비나 찾음: ${webinar.title} (ID: ${webinar.id})`)
    
    // 2. 관련 데이터 삭제
    console.log('\n🔍 관련 데이터 삭제 중...')
    
    // webinar_allowed_emails 삭제
    const { error: emailsError } = await admin
      .from('webinar_allowed_emails')
      .delete()
      .eq('webinar_id', webinar.id)
    
    if (emailsError) {
      console.error(`   ⚠️  허용 이메일 삭제 실패:`, emailsError.message)
    } else {
      console.log(`   ✅ 허용 이메일 삭제 완료`)
    }
    
    // registrations 삭제
    const { error: registrationsError } = await admin
      .from('registrations')
      .delete()
      .eq('webinar_id', webinar.id)
    
    if (registrationsError) {
      console.error(`   ⚠️  등록 정보 삭제 실패:`, registrationsError.message)
    } else {
      console.log(`   ✅ 등록 정보 삭제 완료`)
    }
    
    // 3. 웨비나 삭제
    console.log('\n🔍 웨비나 삭제 중...')
    const { error: deleteError } = await admin
      .from('webinars')
      .delete()
      .eq('id', webinar.id)
    
    if (deleteError) {
      console.error(`❌ 웨비나 삭제 실패:`, deleteError.message)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 삭제 완료`)
    
    console.log('\n✅ 작업 완료!')
    console.log(`   - 149405 웨비나가 삭제되었습니다`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

delete149405Webinar()
