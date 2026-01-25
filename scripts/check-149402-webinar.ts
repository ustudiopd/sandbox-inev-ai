import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function check149402Webinar() {
  const admin = createAdminSupabase()
  
  const { data: webinar, error } = await admin
    .from('webinars')
    .select('id, slug, title, registration_campaign_id')
    .eq('slug', '149402')
    .single()
  
  if (error) {
    console.error('오류:', error)
    return
  }
  
  console.log('149402 웨비나 정보:')
  console.log(JSON.stringify(webinar, null, 2))
  
  if (webinar?.registration_campaign_id) {
    const { data: campaign } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path')
      .eq('id', webinar.registration_campaign_id)
      .single()
    
    console.log('\n연동된 등록 캠페인:')
    console.log(JSON.stringify(campaign, null, 2))
    
    const { data: entries } = await admin
      .from('event_survey_entries')
      .select('id, name, registration_data')
      .eq('campaign_id', webinar.registration_campaign_id)
    
    console.log(`\n등록 캠페인 참여자 수: ${entries?.length || 0}`)
    entries?.forEach((entry: any) => {
      console.log(`- ${entry.name} (${entry.registration_data?.email})`)
    })
  } else {
    console.log('\n⚠️ registration_campaign_id가 설정되지 않았습니다!')
  }
}

check149402Webinar()
