/**
 * 149405 웨비나 생성 스크립트
 * /149405 등록 캠페인을 생성하고 149405 웨비나를 연동합니다
 * 사용법: npx tsx scripts/create-149405-webinar.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function create149405Webinar() {
  try {
    const admin = createAdminSupabase()
    
    // 1. 워트인텔리전트 클라이언트 찾기
    console.log('\n🔍 워트인텔리전트 클라이언트 조회 중...')
    
    const { data: wertClient, error: clientError } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .ilike('name', '%워트인텔리전트%')
      .maybeSingle()
    
    if (clientError) {
      console.error(`❌ 클라이언트 조회 실패:`, clientError.message)
      process.exit(1)
    }
    
    if (!wertClient) {
      console.error(`❌ 워트인텔리전트 클라이언트를 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 클라이언트 찾음: ${wertClient.name} (ID: ${wertClient.id}, Agency ID: ${wertClient.agency_id})`)
    
    if (!wertClient.agency_id) {
      console.error(`❌ 클라이언트에 agency_id가 없습니다`)
      process.exit(1)
    }
    
    // 2. created_by를 위한 사용자 찾기 (슈퍼 어드민 또는 클라이언트 멤버)
    console.log('\n🔍 created_by를 위한 사용자 찾기...')
    let createdByUserId: string | null = null
    const { data: superAdmin } = await admin
      .from('profiles')
      .select('id')
      .eq('is_super_admin', true)
      .limit(1)
      .maybeSingle()
    
    if (superAdmin) {
      createdByUserId = superAdmin.id
      console.log(`✅ 슈퍼 어드민 사용: ${superAdmin.id}`)
    } else {
      // 클라이언트 멤버 중 하나 찾기
      const { data: clientMember } = await admin
        .from('client_members')
        .select('user_id')
        .eq('client_id', wertClient.id)
        .limit(1)
        .maybeSingle()
      
      if (clientMember) {
        createdByUserId = clientMember.user_id
        console.log(`✅ 클라이언트 멤버 사용: ${clientMember.user_id}`)
      }
    }
    
    if (!createdByUserId) {
      console.error('❌ created_by를 위한 사용자를 찾을 수 없습니다.')
      process.exit(1)
    }
    
    // 3. /149405 등록 캠페인 확인 또는 생성
    console.log('\n🔍 /149405 등록 캠페인 조회 중...')
    
    const { data: existingCampaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id, agency_id, type')
      .eq('public_path', '/149405')
      .maybeSingle()
    
    if (campaignError && campaignError.code !== 'PGRST116') {
      console.error(`❌ 캠페인 조회 실패:`, campaignError.message)
      process.exit(1)
    }
    
    let campaignId: string
    
    if (existingCampaign) {
      console.log(`⚠️  /149405 캠페인이 이미 존재합니다 (ID: ${existingCampaign.id})`)
      if (existingCampaign.type !== 'registration') {
        console.error(`❌ 이 캠페인은 등록 페이지 타입이 아닙니다 (type: ${existingCampaign.type})`)
        process.exit(1)
      }
      campaignId = existingCampaign.id
    } else {
      console.log(`   새 등록 캠페인 생성 중...`)
      
      const { data: newCampaign, error: createCampaignError } = await admin
        .from('event_survey_campaigns')
        .insert({
          title: '149405 웨비나',
          public_path: '/149405',
          type: 'registration',
          client_id: wertClient.id,
          agency_id: wertClient.agency_id,
          status: 'published',
          created_by: createdByUserId,
          next_survey_no: 1,
        })
        .select('id, title, public_path')
        .single()
      
      if (createCampaignError) {
        console.error(`❌ 캠페인 생성 실패:`, createCampaignError.message)
        process.exit(1)
      }
      
      console.log(`✅ 캠페인 생성 완료: ID = ${newCampaign.id}, 제목 = ${newCampaign.title}`)
      campaignId = newCampaign.id
    }
    
    // 4. 149405 웨비나 확인 또는 생성
    console.log('\n🔍 slug가 149405인 웨비나 조회 중...')
    
    const { data: existingWebinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, slug, client_id, registration_campaign_id')
      .eq('slug', '149405')
      .maybeSingle()
    
    if (webinarError && webinarError.code !== 'PGRST116') {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (existingWebinar) {
      console.log(`⚠️  slug가 149405인 웨비나가 이미 존재합니다 (ID: ${existingWebinar.id})`)
      console.log(`   기존 웨비나에 등록 캠페인 연동 중...`)
      
      const { error: updateError } = await admin
        .from('webinars')
        .update({
          registration_campaign_id: campaignId,
          client_id: wertClient.id,
          agency_id: wertClient.agency_id,
        })
        .eq('id', existingWebinar.id)
      
      if (updateError) {
        console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
        process.exit(1)
      }
      
      console.log(`✅ 웨비나 업데이트 완료: registration_campaign_id = ${campaignId}`)
    } else {
      console.log(`   새 웨비나 생성 중...`)
      
      const { data: newWebinar, error: createWebinarError } = await admin
        .from('webinars')
        .insert({
          slug: '149405',
          title: '149405 웨비나',
          description: '',
          youtube_url: '',
          start_time: '2026-02-06T14:00:00Z',
          end_time: '2026-02-06T15:30:00Z',
          access_policy: 'name_email_auth',
          client_id: wertClient.id,
          agency_id: wertClient.agency_id,
          registration_campaign_id: campaignId,
          is_public: true,
        })
        .select('id, slug, registration_campaign_id')
        .single()
      
      if (createWebinarError) {
        console.error(`❌ 웨비나 생성 실패:`, createWebinarError.message)
        process.exit(1)
      }
      
      console.log(`✅ 웨비나 생성 완료: ID = ${newWebinar.id}, slug = ${newWebinar.slug}`)
      console.log(`   registration_campaign_id = ${newWebinar.registration_campaign_id}`)
    }
    
    console.log('\n✅ 작업 완료!')
    console.log(`   - 등록 페이지: /event/149405 (캠페인 ID: ${campaignId})`)
    console.log(`   - 웨비나: /webinar/149405`)
    console.log(`   - 대시보드에서 확인 가능합니다`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

create149405Webinar()
