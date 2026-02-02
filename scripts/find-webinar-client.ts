import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findWebinarClient() {
  try {
    const admin = createAdminSupabase()
    
    const { data: webinars, error } = await admin
      .from('webinars')
      .select('id, registration_campaign_id, title, client_id')
      .ilike('title', '%AI 특허리서치%')
      .limit(1)
    
    if (error) {
      console.error('에러 발생:', error)
      return
    }
    
    if (webinars && webinars.length > 0) {
      const w = webinars[0]
      console.log('Client ID:', w.client_id)
      console.log('Webinar ID:', w.id)
      console.log('Campaign ID:', w.registration_campaign_id)
    } else {
      console.log('웨비나를 찾을 수 없습니다.')
    }
  } catch (error) {
    console.error('예외 발생:', error)
  }
}

findWebinarClient()
  .then(() => {
    // 모든 비동기 작업이 완료되도록 짧은 지연 후 종료
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('예외 발생:', error)
    setTimeout(() => process.exit(1), 100)
  })
