/**
 * 149403 등록 캠페인을 149402 웨비나에 연동하는 스크립트
 * 사용법: npx tsx scripts/link-149403-to-149402.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function link149403To149402() {
  try {
    const admin = createAdminSupabase()
    
    // 1. /149403 등록 캠페인 찾기
    console.log('\n🔍 /149403 등록 캠페인 조회 중...')
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, type')
      .eq('public_path', '/149403')
      .eq('type', 'registration')
      .maybeSingle()
    
    if (campaignError) {
      console.error(`❌ 등록 캠페인 조회 실패:`, campaignError.message)
      process.exit(1)
    }
    
    if (!campaign) {
      console.error(`❌ /149403 등록 캠페인을 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 등록 캠페인 찾음: ${campaign.title} (ID: ${campaign.id})`)
    
    // 2. 149402 웨비나 찾기
    console.log('\n🔍 149402 웨비나 조회 중...')
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, registration_campaign_id')
      .eq('slug', '149402')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (!webinar) {
      console.error(`❌ 149402 웨비나를 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 찾음: ${webinar.title} (ID: ${webinar.id})`)
    
    // 3. 웨비나에 registration_campaign_id 설정
    console.log('\n🔗 웨비나에 등록 캠페인 연동 중...')
    const { error: updateError } = await admin
      .from('webinars')
      .update({
        registration_campaign_id: campaign.id,
      })
      .eq('id', webinar.id)
    
    if (updateError) {
      console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 업데이트 완료`)
    
    // 4. 결과 출력
    console.log('\n✅ 연동 완료!')
    console.log(`   - 등록 페이지: /event/149403 (캠페인 ID: ${campaign.id})`)
    console.log(`   - 웨비나: /webinar/149402 (웨비나 ID: ${webinar.id})`)
    console.log(`   - 연동 완료: 웨비나의 registration_campaign_id가 설정되었습니다`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

link149403To149402()
