/**
 * 149400 테스트 웨비나 생성 스크립트
 * /149400 등록 캠페인을 생성하고 149400 웨비나를 연동합니다
 * 149402 (Wert 웨비나)와 동일한 구조로 테스트 환경 구성
 * 사용법: npx tsx scripts/create-149400-test-webinar.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function create149400TestWebinar() {
  try {
    const admin = createAdminSupabase()
    
    // 1. 149402 웨비나 정보 조회 (참고용)
    console.log('\n🔍 149402 웨비나 정보 조회 중...')
    const { data: wertWebinar, error: wertError } = await admin
      .from('webinars')
      .select('id, slug, title, description, client_id, agency_id, registration_campaign_id, access_policy, youtube_url, start_time, end_time')
      .eq('slug', '149402')
      .maybeSingle()
    
    if (wertError) {
      console.error(`❌ 149402 웨비나 조회 실패:`, wertError.message)
      process.exit(1)
    }
    
    if (!wertWebinar) {
      console.error(`❌ 149402 웨비나를 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 149402 웨비나 찾음: ${wertWebinar.title} (ID: ${wertWebinar.id})`)
    console.log(`   Client ID: ${wertWebinar.client_id}`)
    console.log(`   Agency ID: ${wertWebinar.agency_id}`)
    
    // 2. 149403 등록 캠페인 정보 조회 (참고용)
    console.log('\n🔍 149403 등록 캠페인 정보 조회 중...')
    const { data: wertCampaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id, agency_id, type, status')
      .eq('public_path', '/149403')
      .eq('type', 'registration')
      .maybeSingle()
    
    if (campaignError) {
      console.error(`❌ 149403 캠페인 조회 실패:`, campaignError.message)
      process.exit(1)
    }
    
    if (!wertCampaign) {
      console.error(`❌ 149403 등록 캠페인을 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 149403 캠페인 찾음: ${wertCampaign.title} (ID: ${wertCampaign.id})`)
    
    // 3. created_by를 위한 사용자 찾기
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
      if (wertWebinar.client_id) {
        const { data: clientMember } = await admin
          .from('client_members')
          .select('user_id')
          .eq('client_id', wertWebinar.client_id)
          .limit(1)
          .maybeSingle()
        
        if (clientMember) {
          createdByUserId = clientMember.user_id
          console.log(`✅ 클라이언트 멤버 사용: ${clientMember.user_id}`)
        }
      }
    }
    
    if (!createdByUserId) {
      console.error('❌ created_by를 위한 사용자를 찾을 수 없습니다.')
      process.exit(1)
    }
    
    // 4. /149400 등록 캠페인 확인 또는 생성
    console.log('\n🔍 /149400 등록 캠페인 조회 중...')
    
    const { data: existingCampaign, error: checkCampaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id, agency_id, type')
      .eq('public_path', '/149400')
      .maybeSingle()
    
    if (checkCampaignError && checkCampaignError.code !== 'PGRST116') {
      console.error(`❌ 캠페인 조회 실패:`, checkCampaignError.message)
      process.exit(1)
    }
    
    let campaignId: string
    
    if (existingCampaign) {
      console.log(`⚠️  /149400 캠페인이 이미 존재합니다 (ID: ${existingCampaign.id})`)
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
          title: '[테스트] 149400 웨비나',
          public_path: '/149400',
          type: 'registration',
          client_id: wertWebinar.client_id,
          agency_id: wertWebinar.agency_id,
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
    
    // 5. 149400 웨비나 확인 또는 생성
    console.log('\n🔍 slug가 149400인 웨비나 조회 중...')
    
    const { data: existingWebinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, slug, client_id, registration_campaign_id')
      .eq('slug', '149400')
      .maybeSingle()
    
    if (webinarError && webinarError.code !== 'PGRST116') {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (existingWebinar) {
      console.log(`⚠️  slug가 149400인 웨비나가 이미 존재합니다 (ID: ${existingWebinar.id})`)
      console.log(`   기존 웨비나에 등록 캠페인 연동 중...`)
      
      const { error: updateError } = await admin
        .from('webinars')
        .update({
          registration_campaign_id: campaignId,
          client_id: wertWebinar.client_id,
          agency_id: wertWebinar.agency_id,
          access_policy: 'name_email_auth', // 149402와 동일하게
        })
        .eq('id', existingWebinar.id)
      
      if (updateError) {
        console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
        process.exit(1)
      }
      
      console.log(`✅ 웨비나 업데이트 완료: registration_campaign_id = ${campaignId}`)
    } else {
      console.log(`   새 웨비나 생성 중...`)
      
      // 149402 웨비나의 설정을 참고하여 생성
      const { data: newWebinar, error: createWebinarError } = await admin
        .from('webinars')
        .insert({
          slug: '149400',
          title: '[테스트] 149400 웨비나',
          description: wertWebinar.description || '',
          youtube_url: wertWebinar.youtube_url || '',
          start_time: wertWebinar.start_time || null,
          end_time: wertWebinar.end_time || null,
          access_policy: 'name_email_auth', // 149402와 동일하게
          client_id: wertWebinar.client_id,
          agency_id: wertWebinar.agency_id,
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
    console.log(`   - 등록 페이지: /event/149400 (캠페인 ID: ${campaignId})`)
    console.log(`   - 입장 페이지: /webinar/149400`)
    console.log(`   - 시청 페이지: /webinar/149400/live`)
    console.log(`   - 대시보드에서 확인 가능합니다`)
    console.log(`\n📝 참고: 149402 (Wert 웨비나)와 동일한 구조로 생성되었습니다.`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

create149400TestWebinar()
