import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * WebinarPage에서 사용하는 것과 동일한 쿼리를 테스트
 */
async function testWebinarPageQuery() {
  try {
    const admin = createAdminSupabase()
    const slug = '884372'
    
    console.log('=== WebinarPage 쿼리 테스트 ===\n')
    console.log('1. Admin Supabase 클라이언트 생성 확인')
    console.log(`   Service Role Key 존재: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)
    console.log(`   Service Role Key 길이: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0}`)
    
    console.log('\n2. WebinarPage와 동일한 쿼리 실행')
    console.log(`   Slug: ${slug}`)
    
    // email_thumbnail_url은 마이그레이션 054에서 추가되므로 선택적으로 처리
    let queryBuilder = admin
      .from('webinars')
      .select('id, slug, title, description, youtube_url, start_time, end_time, access_policy, client_id, is_public')
    
    const slugValue = String(slug)
    console.log(`   slugValue: ${slugValue} (타입: ${typeof slugValue})`)
    
    queryBuilder = queryBuilder.eq('slug', slugValue).not('slug', 'is', null)
    
    console.log('\n3. 쿼리 실행 중...')
    const { data: webinar, error } = await queryBuilder.single()
    
    if (error) {
      console.error('\n❌ 쿼리 실패:')
      console.error('   Code:', error.code)
      console.error('   Message:', error.message)
      console.error('   Details:', error.details)
      console.error('   Hint:', error.hint)
      // Status는 PostgrestError에 없을 수 있음
      if ('status' in error) {
        console.error('   Status:', (error as any).status)
      }
      console.error('\n전체 에러 객체:', JSON.stringify(error, null, 2))
      process.exit(1)
    }
    
    if (!webinar) {
      console.error('\n❌ 웨비나를 찾을 수 없습니다')
      process.exit(1)
    }
    
    console.log('\n✅ 쿼리 성공:')
    console.log('   ID:', webinar.id)
    console.log('   Slug:', webinar.slug)
    console.log('   Title:', webinar.title)
    console.log('   is_public:', webinar.is_public)
    console.log('   access_policy:', webinar.access_policy)
    console.log('   client_id:', webinar.client_id)
    
    console.log('\n4. 클라이언트 정보 조회 테스트')
    if (webinar.client_id) {
      const { data: client, error: clientError } = await admin
        .from('clients')
        .select('id, name, logo_url, brand_config')
        .eq('id', webinar.client_id)
        .single()
      
      if (clientError) {
        console.error('   ❌ 클라이언트 조회 실패:', {
          code: clientError.code,
          message: clientError.message,
          details: clientError.details,
          hint: clientError.hint
        })
      } else {
        console.log('   ✅ 클라이언트 조회 성공:', {
          id: client?.id,
          name: client?.name
        })
      }
    }
    
    console.log('\n✅ 모든 테스트 통과!')
    console.log('   → WebinarPage에서도 동일하게 작동해야 합니다.')
    
  } catch (error: any) {
    console.error('\n❌ 예외 발생:')
    console.error('   Message:', error.message)
    console.error('   Stack:', error.stack)
    console.error('\n전체 에러 객체:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    process.exit(1)
  }
}

testWebinarPageQuery()
