import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

;(async () => {
  const admin = createAdminSupabase()
  
  // 이벤트 조회
  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, code, slug, module_webinar, client_id')
    .eq('code', '722895')
    .single()
  
  if (eventError || !event) {
    console.error('이벤트를 찾을 수 없습니다:', eventError)
    process.exit(1)
  }
  
  console.log('✅ 이벤트 찾음:')
  console.log(`   - ID: ${event.id}`)
  console.log(`   - Code: ${event.code}`)
  console.log(`   - Slug: ${event.slug}`)
  console.log(`   - module_webinar: ${event.module_webinar}`)
  
  // event_id로 웨비나 조회 시도
  console.log('\n📋 event_id로 웨비나 조회 시도...')
  try {
    const { data: webinarByEventId, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, event_id')
      .eq('event_id', event.id)
      .maybeSingle()
    
    if (webinarError) {
      console.log('   ⚠️  조회 오류:', webinarError.message)
      if (webinarError.code === '42703') {
        console.log('   → event_id 컬럼이 없는 것 같습니다 (마이그레이션 미적용)')
      }
    } else if (webinarByEventId) {
      console.log('   ✅ 웨비나 찾음 (event_id):')
      console.log(`      - ID: ${webinarByEventId.id}`)
      console.log(`      - Slug: ${webinarByEventId.slug}`)
      console.log(`      - Title: ${webinarByEventId.title}`)
    } else {
      console.log('   ❌ event_id로 연결된 웨비나 없음')
    }
  } catch (error: any) {
    console.log('   ⚠️  예외 발생:', error.message)
  }
  
  // registration_campaign_id로도 확인 (하위 호환성)
  console.log('\n📋 registration_campaign_id로 웨비나 조회 시도...')
  const { data: webinars, error: webinarsError } = await admin
    .from('webinars')
    .select('id, slug, title, registration_campaign_id, client_id')
    .eq('client_id', event.client_id)
    .limit(10)
  
  if (webinarsError) {
    console.log('   ⚠️  조회 오류:', webinarsError.message)
  } else if (webinars && webinars.length > 0) {
    console.log(`   ✅ 같은 클라이언트의 웨비나 ${webinars.length}개 찾음:`)
    webinars.forEach((w, i) => {
      console.log(`      ${i + 1}. ${w.slug} (${w.title})`)
      console.log(`         - ID: ${w.id}`)
      console.log(`         - registration_campaign_id: ${w.registration_campaign_id || '없음'}`)
    })
  } else {
    console.log('   ❌ 같은 클라이언트의 웨비나 없음')
  }
  
})()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('예외 발생:', error)
    setTimeout(() => process.exit(1), 100)
  })
