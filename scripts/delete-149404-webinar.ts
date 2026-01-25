import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function delete149404Webinar() {
  try {
    const admin = createAdminSupabase()
    
    // 1. 149404 웨비나 찾기
    console.log('\n🔍 149404 웨비나 찾기...')
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, registration_campaign_id')
      .eq('slug', '149404')
      .maybeSingle()
    
    if (webinarError) {
      console.error('❌ 웨비나 조회 오류:', webinarError)
      process.exit(1)
    }
    
    if (!webinar) {
      console.log('⚠️  149404 웨비나를 찾을 수 없습니다.')
      process.exit(0)
    }
    
    console.log(`✅ 웨비나 찾음: ${webinar.id} (${webinar.title})`)
    
    // 2. 관련 데이터 삭제
    console.log('\n🗑️  관련 데이터 삭제 중...')
    
    // allowed_emails 삭제
    const { error: allowedEmailsError } = await admin
      .from('allowed_emails')
      .delete()
      .eq('webinar_id', webinar.id)
    
    if (allowedEmailsError) {
      console.warn('⚠️  allowed_emails 삭제 실패:', allowedEmailsError)
    } else {
      console.log('✅ allowed_emails 삭제 완료')
    }
    
    // registrations 삭제
    const { error: registrationsError } = await admin
      .from('registrations')
      .delete()
      .eq('webinar_id', webinar.id)
    
    if (registrationsError) {
      console.warn('⚠️  registrations 삭제 실패:', registrationsError)
    } else {
      console.log('✅ registrations 삭제 완료')
    }
    
    // 3. 웨비나 삭제
    console.log('\n🗑️  웨비나 삭제 중...')
    const { error: deleteError } = await admin
      .from('webinars')
      .delete()
      .eq('id', webinar.id)
    
    if (deleteError) {
      console.error('❌ 웨비나 삭제 실패:', deleteError)
      process.exit(1)
    }
    
    console.log('✅ 웨비나 삭제 완료')
    
    // 4. 등록 캠페인이 있으면 확인 (삭제하지 않음 - 사용자가 별도로 요청할 수 있음)
    if (webinar.registration_campaign_id) {
      console.log(`\nℹ️  등록 캠페인 ID: ${webinar.registration_campaign_id}`)
      console.log('   등록 캠페인은 별도로 삭제하지 않았습니다.')
      console.log('   필요시 등록 캠페인도 삭제하려면 별도 스크립트를 실행하세요.')
    }
    
    console.log('\n✅ 149404 웨비나 삭제 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

delete149404Webinar()
