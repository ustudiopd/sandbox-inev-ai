/**
 * 426307 웨비나의 등록 페이지 제거 스크립트
 * /426307 등록 캠페인을 삭제하고 웨비나의 registration_campaign_id를 제거합니다
 * 사용법: npx tsx scripts/remove-426307-registration.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function remove426307Registration() {
  try {
    const admin = createAdminSupabase()
    
    // 1. 426307 웨비나 찾기
    console.log('\n🔍 426307 웨비나 조회 중...')
    
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, slug, registration_campaign_id')
      .eq('slug', '426307')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (!webinar) {
      console.error(`❌ 426307 웨비나를 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 찾음: ${webinar.title} (ID: ${webinar.id})`)
    console.log(`   현재 registration_campaign_id: ${webinar.registration_campaign_id || '없음'}`)
    
    // 2. 등록 캠페인 삭제
    if (webinar.registration_campaign_id) {
      console.log('\n🔍 등록 캠페인 조회 중...')
      
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path')
        .eq('id', webinar.registration_campaign_id)
        .maybeSingle()
      
      if (campaignError) {
        console.error(`❌ 캠페인 조회 실패:`, campaignError.message)
        process.exit(1)
      }
      
      if (campaign) {
        console.log(`✅ 캠페인 찾음: ${campaign.title} (ID: ${campaign.id}, Path: ${campaign.public_path})`)
        console.log(`   등록 캠페인 삭제 중...`)
        
        const { error: deleteError } = await admin
          .from('event_survey_campaigns')
          .delete()
          .eq('id', campaign.id)
        
        if (deleteError) {
          console.error(`❌ 캠페인 삭제 실패:`, deleteError.message)
          process.exit(1)
        }
        
        console.log(`✅ 등록 캠페인 삭제 완료`)
      } else {
        console.log(`⚠️  등록 캠페인을 찾을 수 없습니다 (이미 삭제되었을 수 있음)`)
      }
    } else {
      console.log(`⚠️  웨비나에 등록 캠페인이 연결되어 있지 않습니다`)
    }
    
    // 3. 웨비나의 registration_campaign_id 제거
    console.log('\n🔍 웨비나의 registration_campaign_id 제거 중...')
    
    const { error: updateError } = await admin
      .from('webinars')
      .update({
        registration_campaign_id: null,
      })
      .eq('id', webinar.id)
    
    if (updateError) {
      console.error(`❌ 웨비나 업데이트 실패:`, updateError.message)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 업데이트 완료: registration_campaign_id 제거됨`)
    
    console.log('\n✅ 작업 완료!')
    console.log(`   - 426307 웨비나의 등록 페이지가 제거되었습니다`)
    console.log(`   - 웨비나: /webinar/426307`)
    console.log(`   - 등록 페이지: /webinar/426307/register (더 이상 작동하지 않음)`)
    console.log(`   - 대시보드에서 확인 가능합니다`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

remove426307Registration()
