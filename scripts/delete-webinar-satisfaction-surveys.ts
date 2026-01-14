import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 웨비나 만족도 설문조사 캠페인 삭제 스크립트
 */
async function deleteWebinarSatisfactionSurveys() {
  try {
    const admin = createAdminSupabase()
    
    const publicPaths = [
      '/webinar-884372-satisfaction-2',
      '/webinar-884372-satisfaction-1',
      '/webinar-884372-satisfaction',
    ]
    
    for (const publicPath of publicPaths) {
      console.log(`\n캠페인 조회 중: ${publicPath}`)
      
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, title, form_id')
        .eq('public_path', publicPath)
        .maybeSingle()
      
      if (campaignError) {
        console.error(`❌ 캠페인 조회 실패: ${publicPath}`, campaignError.message)
        continue
      }
      
      if (!campaign) {
        console.log(`⚠️  캠페인 없음: ${publicPath}`)
        continue
      }
      
      console.log(`✅ 캠페인 찾음: ${campaign.title} (ID: ${campaign.id})`)
      
      // 폼이 연결되어 있으면 폼과 문항도 삭제
      if (campaign.form_id) {
        console.log(`   폼 삭제 중: ${campaign.form_id}`)
        
        // 문항 삭제
        const { error: questionsError } = await admin
          .from('form_questions')
          .delete()
          .eq('form_id', campaign.form_id)
        
        if (questionsError) {
          console.error(`   ⚠️  문항 삭제 실패:`, questionsError.message)
        } else {
          console.log(`   ✅ 문항 삭제 완료`)
        }
        
        // 폼 삭제
        const { error: formError } = await admin
          .from('forms')
          .delete()
          .eq('id', campaign.form_id)
        
        if (formError) {
          console.error(`   ⚠️  폼 삭제 실패:`, formError.message)
        } else {
          console.log(`   ✅ 폼 삭제 완료`)
        }
      }
      
      // 캠페인 삭제
      console.log(`   캠페인 삭제 중...`)
      const { error: deleteError } = await admin
        .from('event_survey_campaigns')
        .delete()
        .eq('id', campaign.id)
      
      if (deleteError) {
        console.error(`   ❌ 캠페인 삭제 실패:`, deleteError.message)
      } else {
        console.log(`   ✅ 캠페인 삭제 완료`)
      }
    }
    
    console.log('\n✅ 모든 설문조사 캠페인 삭제 완료!')
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

deleteWebinarSatisfactionSurveys()
