/**
 * /149403 캠페인과 /149404 웨비나 삭제 스크립트
 * 사용법: npx tsx scripts/delete-149403-149404.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function delete149403And149404() {
  try {
    const admin = createAdminSupabase()
    
    // 1. /149403 캠페인 삭제
    console.log('\n🔍 /149403 캠페인 조회 중...')
    
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, form_id, client_id')
      .eq('public_path', '/149403')
      .maybeSingle()
    
    if (campaignError) {
      console.error(`❌ 캠페인 조회 실패:`, campaignError.message)
    } else if (!campaign) {
      console.log(`⚠️  /149403 캠페인을 찾을 수 없습니다`)
    } else {
      console.log(`✅ 캠페인 찾음: ${campaign.title} (ID: ${campaign.id})`)
      
      // 관련 entries 삭제
      console.log(`   관련 등록 정보 삭제 중...`)
      const { error: entriesError } = await admin
        .from('event_survey_entries')
        .delete()
        .eq('campaign_id', campaign.id)
      
      if (entriesError) {
        console.error(`   ⚠️  등록 정보 삭제 실패:`, entriesError.message)
      } else {
        console.log(`   ✅ 등록 정보 삭제 완료`)
      }
      
      // form_id가 있으면 처리
      if (campaign.form_id) {
        console.log(`   연결된 폼 처리 중: ${campaign.form_id}`)
        
        // form 정보 조회
        const { data: form } = await admin
          .from('forms')
          .select('id, webinar_id')
          .eq('id', campaign.form_id)
          .maybeSingle()
        
        if (form) {
          // webinar_id가 없으면 form도 삭제
          if (!form.webinar_id) {
            console.log(`   🗑️  form 삭제 중...`)
            const { error: deleteFormError } = await admin
              .from('forms')
              .delete()
              .eq('id', campaign.form_id)
            
            if (deleteFormError) {
              console.error(`   ❌ form 삭제 실패:`, deleteFormError.message)
            } else {
              console.log(`   ✅ form 삭제 완료`)
            }
          } else {
            // webinar_id가 있으면 campaign_id만 null로 설정
            console.log(`   🔧 form의 campaign_id를 null로 설정 중...`)
            const { error: updateFormError } = await admin
              .from('forms')
              .update({ campaign_id: null })
              .eq('id', campaign.form_id)
            
            if (updateFormError) {
              console.error(`   ❌ form 업데이트 실패:`, updateFormError.message)
            } else {
              console.log(`   ✅ form 업데이트 완료`)
            }
          }
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
    
    // 2. /149404 웨비나 삭제
    console.log('\n🔍 /149404 웨비나 조회 중...')
    
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, slug, client_id')
      .eq('slug', '149404')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
    } else if (!webinar) {
      console.log(`⚠️  /149404 웨비나를 찾을 수 없습니다`)
    } else {
      console.log(`✅ 웨비나 찾음: ${webinar.title} (ID: ${webinar.id}, Slug: ${webinar.slug})`)
      
      // 관련 데이터 삭제 (cascade로 자동 삭제될 수도 있지만 명시적으로 삭제)
      console.log(`   관련 데이터 삭제 중...`)
      
      // webinar_allowed_emails 삭제
      const { error: emailsError } = await admin
        .from('webinar_allowed_emails')
        .delete()
        .eq('webinar_id', webinar.id)
      
      if (emailsError) {
        console.error(`   ⚠️  허용 이메일 삭제 실패:`, emailsError.message)
      } else {
        console.log(`   ✅ 허용 이메일 삭제 완료`)
      }
      
      // webinar_participants 삭제
      const { error: participantsError } = await admin
        .from('webinar_participants')
        .delete()
        .eq('webinar_id', webinar.id)
      
      if (participantsError) {
        console.error(`   ⚠️  참여자 삭제 실패:`, participantsError.message)
      } else {
        console.log(`   ✅ 참여자 삭제 완료`)
      }
      
      // forms의 webinar_id를 null로 설정 (또는 삭제)
      const { data: forms } = await admin
        .from('forms')
        .select('id, campaign_id')
        .eq('webinar_id', webinar.id)
      
      if (forms && forms.length > 0) {
        console.log(`   연결된 폼 ${forms.length}개 처리 중...`)
        for (const form of forms) {
          // campaign_id가 없으면 폼 삭제, 있으면 webinar_id만 null로 설정
          if (!form.campaign_id) {
            const { error: deleteFormError } = await admin
              .from('forms')
              .delete()
              .eq('id', form.id)
            
            if (deleteFormError) {
              console.error(`   ⚠️  폼 ${form.id} 삭제 실패:`, deleteFormError.message)
            } else {
              console.log(`   ✅ 폼 ${form.id} 삭제 완료`)
            }
          } else {
            const { error: updateFormError } = await admin
              .from('forms')
              .update({ webinar_id: null })
              .eq('id', form.id)
            
            if (updateFormError) {
              console.error(`   ⚠️  폼 ${form.id} 업데이트 실패:`, updateFormError.message)
            } else {
              console.log(`   ✅ 폼 ${form.id} 업데이트 완료`)
            }
          }
        }
      }
      
      // 웨비나 삭제
      console.log(`   웨비나 삭제 중...`)
      const { error: deleteWebinarError } = await admin
        .from('webinars')
        .delete()
        .eq('id', webinar.id)
      
      if (deleteWebinarError) {
        console.error(`   ❌ 웨비나 삭제 실패:`, deleteWebinarError.message)
      } else {
        console.log(`   ✅ 웨비나 삭제 완료`)
      }
    }
    
    console.log('\n✅ 삭제 작업 완료!')
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

delete149403And149404()
