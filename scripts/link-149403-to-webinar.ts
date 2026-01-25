/**
 * /149403 등록 페이지와 웨비나 연동 스크립트
 * 사용법: npx tsx scripts/link-149403-to-webinar.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function link149403ToWebinar() {
  try {
    const admin = createAdminSupabase()
    
    // 1. /149404 웨비나 삭제
    console.log('\n🔍 /149404 웨비나 조회 중...')
    
    const { data: webinar149404, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, slug, client_id')
      .eq('slug', '149404')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
    } else if (!webinar149404) {
      console.log(`⚠️  /149404 웨비나를 찾을 수 없습니다 (이미 삭제되었거나 존재하지 않음)`)
    } else {
      console.log(`✅ 웨비나 찾음: ${webinar149404.title} (ID: ${webinar149404.id}, Slug: ${webinar149404.slug})`)
      
      // 관련 데이터 삭제
      console.log(`   관련 데이터 삭제 중...`)
      
      // webinar_allowed_emails 삭제
      const { error: emailsError } = await admin
        .from('webinar_allowed_emails')
        .delete()
        .eq('webinar_id', webinar149404.id)
      
      if (emailsError) {
        console.error(`   ⚠️  허용 이메일 삭제 실패:`, emailsError.message)
      } else {
        console.log(`   ✅ 허용 이메일 삭제 완료`)
      }
      
      // registrations 삭제
      const { error: registrationsError } = await admin
        .from('registrations')
        .delete()
        .eq('webinar_id', webinar149404.id)
      
      if (registrationsError) {
        console.error(`   ⚠️  등록 정보 삭제 실패:`, registrationsError.message)
      } else {
        console.log(`   ✅ 등록 정보 삭제 완료`)
      }
      
      // 웨비나 삭제
      console.log(`   웨비나 삭제 중...`)
      const { error: deleteWebinarError } = await admin
        .from('webinars')
        .delete()
        .eq('id', webinar149404.id)
      
      if (deleteWebinarError) {
        console.error(`   ❌ 웨비나 삭제 실패:`, deleteWebinarError.message)
      } else {
        console.log(`   ✅ 웨비나 삭제 완료`)
      }
    }
    
    // 2. /149403 등록 캠페인 조회
    console.log('\n🔍 /149403 등록 캠페인 조회 중...')
    
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id, agency_id, type')
      .eq('public_path', '/149403')
      .maybeSingle()
    
    if (campaignError) {
      console.error(`❌ 캠페인 조회 실패:`, campaignError.message)
      process.exit(1)
    }
    
    if (!campaign) {
      console.error(`❌ /149403 캠페인을 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 캠페인 찾음: ${campaign.title} (ID: ${campaign.id}, Client ID: ${campaign.client_id}, Agency ID: ${campaign.agency_id})`)
    
    if (campaign.type !== 'registration') {
      console.error(`❌ 이 캠페인은 등록 페이지 타입이 아닙니다 (type: ${campaign.type})`)
      process.exit(1)
    }
    
    if (!campaign.agency_id) {
      console.error(`❌ 캠페인에 agency_id가 없습니다`)
      process.exit(1)
    }
    
    // 3. 웨비나 생성 또는 업데이트
    console.log('\n🔍 slug가 149404인 웨비나 조회 중...')
    
    const { data: existingWebinar, error: existingWebinarError } = await admin
      .from('webinars')
      .select('id, title, slug, client_id, registration_campaign_id')
      .eq('slug', '149404')
      .maybeSingle()
    
    if (existingWebinarError && existingWebinarError.code !== 'PGRST116') {
      console.error(`❌ 웨비나 조회 실패:`, existingWebinarError.message)
      process.exit(1)
    }
    
    if (existingWebinar) {
      console.log(`⚠️  slug가 149404인 웨비나가 이미 존재합니다 (ID: ${existingWebinar.id})`)
      console.log(`   기존 웨비나에 등록 캠페인 연동 중...`)
      
      const { error: updateError } = await admin
        .from('webinars')
        .update({
          registration_campaign_id: campaign.id,
          client_id: campaign.client_id,
          agency_id: campaign.agency_id,
        })
        .eq('id', existingWebinar.id)
      
      if (updateError) {
        console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
        process.exit(1)
      }
      
      console.log(`✅ 웨비나 업데이트 완료: registration_campaign_id = ${campaign.id}`)
    } else {
      console.log(`   새 웨비나 생성 중...`)
      
      const { data: newWebinar, error: createError } = await admin
        .from('webinars')
        .insert({
          slug: '149404',
          title: 'AI 특허리서치 실무 활용 웨비나',
          description: '실제 고객사례로 알아보는 AI 특허리서치 실무 활용 웨비나',
          youtube_url: '',
          start_time: '2026-02-06T14:00:00Z',
          end_time: '2026-02-06T15:30:00Z',
          access_policy: 'name_email_auth',
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
    
    console.log('\n✅ 연동 작업 완료!')
    console.log(`   - 등록 페이지: /event/149403 (캠페인 ID: ${campaign.id})`)
    console.log(`   - 웨비나: /webinar/149404`)
    console.log(`   - 연동 완료: 웨비나의 registration_campaign_id가 설정되었습니다`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

link149403ToWebinar()
