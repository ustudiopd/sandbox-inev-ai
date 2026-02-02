import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

/**
 * /426307 경로의 원프레딕트 등록 캠페인 생성 및 웨비나 연동
 */
async function create426307Campaign() {
  try {
    const admin = createAdminSupabase()
    
    // 1. 웨비나 426307 정보 조회
    console.log('\n🔍 웨비나 426307 조회 중...')
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, client_id, agency_id, registration_campaign_id')
      .eq('slug', '426307')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (!webinar) {
      console.error(`❌ 웨비나 426307을 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 찾음: ${webinar.title}`)
    console.log(`   Client ID: ${webinar.client_id}`)
    console.log(`   Agency ID: ${webinar.agency_id}`)
    console.log(`   현재 연결된 캠페인 ID: ${webinar.registration_campaign_id || '없음'}`)
    
    // 2. /426307 경로의 캠페인이 이미 있는지 확인
    console.log('\n🔍 /426307 캠페인 확인 중...')
    const { data: existingCampaign } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id')
      .eq('public_path', '/426307')
      .maybeSingle()
    
    if (existingCampaign) {
      console.log(`⚠️  /426307 경로의 캠페인이 이미 존재합니다 (ID: ${existingCampaign.id})`)
      console.log(`   기존 캠페인에 웨비나 연동 중...`)
      
      // 웨비나에 연동
      const { error: updateError } = await admin
        .from('webinars')
        .update({
          registration_campaign_id: existingCampaign.id,
        })
        .eq('id', webinar.id)
      
      if (updateError) {
        console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
        process.exit(1)
      }
      
      console.log(`✅ 웨비나 업데이트 완료: registration_campaign_id = ${existingCampaign.id}`)
      process.exit(0)
    }
    
    // 3. 새 캠페인 생성
    console.log(`\n📝 새 캠페인 생성 중...`)
    console.log(`   Title: ${webinar.title}`)
    console.log(`   Public Path: /426307`)
    console.log(`   Type: registration`)
    console.log(`   Client ID: ${webinar.client_id}`)
    
    // created_by를 위해 슈퍼어드민 프로필 찾기
    const { data: superAdmin } = await admin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    if (!superAdmin) {
      console.error(`❌ 프로필을 찾을 수 없습니다 (created_by 필요)`)
      process.exit(1)
    }
    
    const { data: newCampaign, error: createError } = await admin
      .from('event_survey_campaigns')
      .insert({
        client_id: webinar.client_id,
        agency_id: webinar.agency_id,
        title: webinar.title,
        public_path: '/426307',
        type: 'registration',
        status: 'published',
        next_survey_no: 1,
        created_by: superAdmin.id,
      })
      .select('id, title, public_path')
      .single()
    
    if (createError) {
      console.error(`❌ 캠페인 생성 실패:`, createError.message)
      process.exit(1)
    }
    
    console.log(`✅ 캠페인 생성 완료: ID = ${newCampaign.id}`)
    console.log(`   Public Path: ${newCampaign.public_path}`)
    
    // 4. 웨비나에 연동
    console.log(`\n🔗 웨비나에 등록 캠페인 연동 중...`)
    const { error: updateError } = await admin
      .from('webinars')
      .update({
        registration_campaign_id: newCampaign.id,
      })
      .eq('id', webinar.id)
    
    if (updateError) {
      console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 업데이트 완료: registration_campaign_id = ${newCampaign.id}`)
    
    console.log('\n✅ 작업 완료!')
    console.log(`   - 등록 페이지: /event/426307/register (캠페인 ID: ${newCampaign.id})`)
    console.log(`   - 웨비나: /webinar/426307`)
    console.log(`   - 대시보드에서 확인 가능합니다`)
    
  } catch (error: any) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

create426307Campaign()
