import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const WERT_CAMPAIGN_ID = '3a88682e-6fab-463c-8328-6b403c8c5c7a'

async function checkWertVisitAPIDebug() {
  const admin = createAdminSupabase()
  
  console.log('🔍 워트 Visit API 디버깅\n')
  console.log(`캠페인 ID: ${WERT_CAMPAIGN_ID}\n`)
  
  // 1. 캠페인 존재 확인
  console.log('1️⃣ 캠페인 존재 확인')
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, client_id, public_path')
    .eq('id', WERT_CAMPAIGN_ID)
    .maybeSingle()
  
  if (campaignError) {
    console.error('❌ 캠페인 조회 실패:', campaignError)
    return
  }
  
  if (!campaign) {
    console.error('❌ 캠페인을 찾을 수 없습니다!')
    console.log('\n가능한 원인:')
    console.log('  - 캠페인 ID가 잘못되었거나')
    console.log('  - 캠페인이 삭제되었거나')
    console.log('  - DB 연결 문제')
    return
  }
  
  console.log('✅ 캠페인 찾음:')
  console.log(`   제목: ${campaign.title}`)
  console.log(`   ID: ${campaign.id}`)
  console.log(`   client_id: ${campaign.client_id}`)
  console.log(`   public_path: ${campaign.public_path}`)
  console.log()
  
  // 2. 웨비나로 조회 시도
  console.log('2️⃣ 웨비나 ID로 조회 시도')
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, client_id, registration_campaign_id')
    .eq('id', WERT_CAMPAIGN_ID)
    .maybeSingle()
  
  if (webinarError) {
    console.log('   웨비나 조회 실패 (정상 - 캠페인 ID이므로)')
  } else if (webinar) {
    console.log('   ⚠️  웨비나도 찾음 (중복 가능성)')
    console.log(`   웨비나 ID: ${webinar.id}`)
    console.log(`   slug: ${webinar.slug}`)
    console.log(`   client_id: ${webinar.client_id}`)
    console.log(`   registration_campaign_id: ${webinar.registration_campaign_id}`)
  } else {
    console.log('   웨비나 없음 (정상 - 캠페인 ID이므로)')
  }
  console.log()
  
  // 3. 최근 Visit 로그 확인
  console.log('3️⃣ 최근 Visit 로그 확인')
  const { data: recentVisits, error: visitsError } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at, created_at')
    .or(`campaign_id.eq.${WERT_CAMPAIGN_ID},webinar_id.eq.${WERT_CAMPAIGN_ID}`)
    .order('accessed_at', { ascending: false })
    .limit(10)
  
  if (visitsError) {
    console.error('❌ Visit 로그 조회 실패:', visitsError)
  } else {
    console.log(`   최근 Visit: ${recentVisits?.length || 0}건`)
    if (recentVisits && recentVisits.length > 0) {
      recentVisits.forEach((visit, index) => {
        console.log(`\n   Visit #${index + 1}:`)
        console.log(`     ID: ${visit.id}`)
        console.log(`     campaign_id: ${visit.campaign_id || 'null'}`)
        console.log(`     webinar_id: ${visit.webinar_id || 'null'}`)
        console.log(`     session_id: ${visit.session_id}`)
        console.log(`     accessed_at: ${visit.accessed_at}`)
      })
    } else {
      console.log('   ⚠️  Visit 로그가 없습니다')
    }
  }
  console.log()
  
  // 4. 테스트 Visit 저장 시도
  console.log('4️⃣ 테스트 Visit 저장 시도')
  const testSessionId = `test-${Date.now()}`
  const testInsertData = {
    campaign_id: WERT_CAMPAIGN_ID,
    session_id: testSessionId,
    accessed_at: new Date().toISOString(),
  }
  
  const { data: testVisit, error: testInsertError } = await admin
    .from('event_access_logs')
    .insert(testInsertData)
    .select()
    .single()
  
  if (testInsertError) {
    console.error('❌ 테스트 Visit 저장 실패:')
    console.error(`   에러 코드: ${testInsertError.code}`)
    console.error(`   에러 메시지: ${testInsertError.message}`)
    console.error(`   에러 상세: ${JSON.stringify(testInsertError, null, 2)}`)
    
    // 에러 코드별 분석
    if (testInsertError.code === '23503') {
      console.log('\n   🔍 분석: Foreign Key 제약조건 위반')
      console.log('   - campaign_id가 event_survey_campaigns 테이블에 존재하지 않음')
      console.log('   - 또는 참조 무결성 문제')
    } else if (testInsertError.code === '23514') {
      console.log('\n   🔍 분석: Check 제약조건 위반')
      console.log('   - campaign_id 또는 webinar_id 중 하나는 필수')
    } else if (testInsertError.code === '42501') {
      console.log('\n   🔍 분석: 권한 문제')
      console.log('   - RLS 정책에 의해 차단됨')
    }
  } else {
    console.log('✅ 테스트 Visit 저장 성공!')
    console.log(`   저장된 Visit ID: ${testVisit.id}`)
    
    // 테스트 데이터 삭제
    await admin
      .from('event_access_logs')
      .delete()
      .eq('id', testVisit.id)
    console.log('   테스트 데이터 삭제 완료')
  }
  console.log()
  
  // 5. 종합 분석
  console.log('=' .repeat(60))
  console.log('\n📊 종합 분석\n')
  
  if (!campaign) {
    console.log('🔴 문제: 캠페인을 찾을 수 없음')
    console.log('   Visit API가 404를 반환해야 하지만 200을 반환하는 것으로 보아')
    console.log('   다른 경로로 처리되고 있을 가능성')
  } else if (testInsertError) {
    console.log('🔴 문제: DB 저장 실패')
    console.log(`   에러 코드: ${testInsertError.code}`)
    console.log(`   에러 메시지: ${testInsertError.message}`)
    console.log('\n   이것이 Visit이 저장되지 않는 원인입니다!')
  } else {
    console.log('✅ 캠페인과 DB 저장은 정상')
    console.log('   Visit API 호출은 되지만 다른 이유로 저장되지 않을 수 있음')
    console.log('   - 응답 본문 확인 필요')
    console.log('   - 서버 로그 확인 필요')
  }
}

checkWertVisitAPIDebug().catch(console.error)
