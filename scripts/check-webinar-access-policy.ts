import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkWebinarAccessPolicy() {
  try {
    const admin = createAdminSupabase()
    
    console.log('=== 웨비나 access_policy 확인 ===\n')
    
    // slug로 웨비나 조회
    const slug = '884372'
    const { data: webinar, error } = await admin
      .from('webinars')
      .select('id, slug, title, is_public, access_policy, client_id')
      .eq('slug', slug)
      .single()
    
    if (error) {
      console.error('❌ 웨비나 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      process.exit(1)
    }
    
    if (!webinar) {
      console.error('❌ 웨비나를 찾을 수 없습니다')
      process.exit(1)
    }
    
    console.log('✅ 웨비나 정보:')
    console.log(`   ID: ${webinar.id}`)
    console.log(`   Slug: ${webinar.slug}`)
    console.log(`   제목: ${webinar.title}`)
    console.log(`   is_public: ${webinar.is_public}`)
    console.log(`   access_policy: ${webinar.access_policy}`)
    console.log(`   client_id: ${webinar.client_id}`)
    
    // RLS 정책 조건 확인
    console.log('\n=== RLS 정책 조건 분석 ===')
    console.log('공개 접근 조건: is_public = true AND access_policy = \'guest_allowed\'')
    console.log(`현재 상태: is_public = ${webinar.is_public}, access_policy = '${webinar.access_policy}'`)
    
    const isPublicAccessible = webinar.is_public === true && webinar.access_policy === 'guest_allowed'
    console.log(`\n공개 접근 가능 여부: ${isPublicAccessible ? '✅ 예' : '❌ 아니오'}`)
    
    if (!isPublicAccessible) {
      console.log('\n⚠️  현재 설정으로는 비로그인 사용자가 접근할 수 없습니다.')
      console.log('   RLS 정책에 따라 다음 중 하나를 만족해야 합니다:')
      console.log('   1. 슈퍼어드민')
      console.log('   2. 소속 에이전시/클라이언트 멤버')
      console.log('   3. 웨비나 등록자')
      console.log('   4. is_public = true AND access_policy = \'guest_allowed\'')
    }
    
    // Admin Supabase 검증
    console.log('\n=== Admin Supabase 검증 ===')
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const serviceRoleKeyLength = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    console.log(`SUPABASE_SERVICE_ROLE_KEY 존재: ${hasServiceRoleKey ? '✅' : '❌'}`)
    console.log(`키 길이: ${serviceRoleKeyLength} (예상: ~200자)`)
    
    if (hasServiceRoleKey && serviceRoleKeyLength > 100) {
      console.log('✅ Service Role Key가 정상적으로 설정되어 있습니다.')
      console.log('   → Admin Supabase는 RLS를 우회해야 합니다.')
    } else {
      console.log('⚠️  Service Role Key가 제대로 설정되지 않았을 수 있습니다.')
    }
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

checkWebinarAccessPolicy()
