import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

/**
 * /426307 등록 캠페인을 426307 웨비나에 연동하는 스크립트
 */
async function link426307ToCampaign() {
  try {
    const admin = createAdminSupabase()
    
    // 1. /426307 등록 캠페인 찾기
    console.log('\n🔍 /426307 등록 캠페인 조회 중...')
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, type, client_id, agency_id')
      .eq('public_path', '/426307')
      .eq('type', 'registration')
      .maybeSingle()
    
    if (campaignError) {
      console.error(`❌ 등록 캠페인 조회 실패:`, campaignError.message)
      process.exit(1)
    }
    
    if (!campaign) {
      console.error(`❌ /426307 등록 캠페인을 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 등록 캠페인 찾음: ${campaign.title} (ID: ${campaign.id})`)
    console.log(`   Client ID: ${campaign.client_id}`)
    console.log(`   Agency ID: ${campaign.agency_id}`)
    
    // 2. 426307 웨비나 찾기 또는 생성
    console.log('\n🔍 426307 웨비나 조회 중...')
    const { data: existingWebinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, registration_campaign_id, client_id, agency_id')
      .eq('slug', '426307')
      .maybeSingle()
    
    if (webinarError && webinarError.code !== 'PGRST116') {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (existingWebinar) {
      console.log(`✅ 웨비나 찾음: ${existingWebinar.title || '제목 없음'} (ID: ${existingWebinar.id})`)
      console.log(`   현재 registration_campaign_id: ${existingWebinar.registration_campaign_id || '없음'}`)
      
      // 웨비나에 registration_campaign_id 설정
      console.log('\n🔗 웨비나에 등록 캠페인 연동 중...')
      const { error: updateError } = await admin
        .from('webinars')
        .update({
          registration_campaign_id: campaign.id,
          // client_id와 agency_id도 업데이트 (없는 경우에만)
          ...(existingWebinar.client_id ? {} : { client_id: campaign.client_id }),
          ...(existingWebinar.agency_id ? {} : { agency_id: campaign.agency_id }),
        })
        .eq('id', existingWebinar.id)
      
      if (updateError) {
        console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
        process.exit(1)
      }
      
      console.log(`✅ 웨비나 업데이트 완료`)
      console.log(`   registration_campaign_id = ${campaign.id}`)
    } else {
      console.log(`⚠️  426307 웨비나가 없습니다. 새로 생성합니다...`)
      
      // 웨비나 생성
      const { data: newWebinar, error: createError } = await admin
        .from('webinars')
        .insert({
          slug: '426307',
          title: '원프레딕트 웨비나',
          description: '원프레딕트 웨비나',
          youtube_url: '',
          start_time: null,
          end_time: null,
          access_policy: 'email_auth',
          client_id: campaign.client_id,
          agency_id: campaign.agency_id,
          registration_campaign_id: campaign.id,
          is_public: true,
        })
        .select('id, slug, registration_campaign_id')
        .single()
      
      if (createError) {
        console.error(`❌ 웨비나 생성 실패:`, createError.message)
        process.exit(1)
      }
      
      console.log(`✅ 웨비나 생성 완료: ID = ${newWebinar.id}, slug = ${newWebinar.slug}`)
      console.log(`   registration_campaign_id = ${newWebinar.registration_campaign_id}`)
    }
    
    // 3. 결과 출력
    console.log('\n✅ 연동 완료!')
    console.log(`   - 등록 페이지: /event/426307 (캠페인 ID: ${campaign.id})`)
    console.log(`   - 웨비나: /webinar/426307`)
    console.log(`   - 웨비나 등록 페이지: /webinar/426307/register`)
    
  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message)
    process.exit(1)
  }
}

// 스크립트 실행
link426307ToCampaign()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error)
    process.exit(1)
  })
