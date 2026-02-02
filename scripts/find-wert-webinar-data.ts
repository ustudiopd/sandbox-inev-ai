/**
 * Wert 웨비나(149402)와 연결된 데이터 찾기
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findWertWebinarData() {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('Wert 웨비나(149402) 데이터 찾기')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 웨비나 ID 찾기
  console.log('1. 웨비나 ID 찾기')
  console.log('-'.repeat(80))
  
  // 경로나 코드로 웨비나 찾기
  const { data: webinars } = await admin
    .from('webinars')
    .select('id, title, registration_campaign_id, dashboard_code, slug')
    .or('dashboard_code.eq.149402,slug.eq.149402,id.eq.149402')
    .limit(10)
  
  if (!webinars || webinars.length === 0) {
    // 다른 방법으로 찾기
    const { data: allWebinars } = await admin
      .from('webinars')
      .select('id, title, registration_campaign_id, dashboard_code, slug')
      .ilike('title', '%wert%')
      .limit(10)
    
    console.log('경로로 찾기 실패, 제목으로 검색:')
    allWebinars?.forEach(w => {
      console.log(`  ID: ${w.id}, 제목: ${w.title}, 코드: ${w.dashboard_code || '-'}, 슬러그: ${w.slug || '-'}`)
    })
    
    if (allWebinars && allWebinars.length > 0) {
      const wertWebinar = allWebinars[0]
      console.log('')
      console.log(`선택된 웨비나: ${wertWebinar.title}`)
      console.log(`웨비나 ID: ${wertWebinar.id}`)
      console.log(`캠페인 ID: ${wertWebinar.registration_campaign_id || '-'}`)
      
      // 이 웨비나의 registrations 확인
      console.log('')
      console.log('2. registrations 테이블 확인')
      console.log('-'.repeat(80))
      
      const { data: registrations } = await admin
        .from('registrations')
        .select('id, survey_no, code6, nickname, registration_data, created_at, phone_norm')
        .eq('webinar_id', wertWebinar.id)
        .order('survey_no', { ascending: true })
      
      console.log(`registrations 데이터: ${registrations?.length || 0}개`)
      
      if (registrations && registrations.length > 0) {
        console.log(`survey_no 범위: ${registrations[0].survey_no} ~ ${registrations[registrations.length - 1].survey_no}`)
        console.log('')
        console.log('샘플 (상위 10개):')
        registrations.slice(0, 10).forEach((r: any) => {
          const dateStr = new Date(r.created_at).toISOString().split('T')[0]
          console.log(`  survey_no: ${r.survey_no}, name: ${r.nickname || r.registration_data?.name || '-'}, phone: ${r.phone_norm || r.registration_data?.phone || '-'}, date: ${dateStr}`)
        })
      }
      
      // 캠페인 ID가 있으면 event_survey_entries도 확인
      if (wertWebinar.registration_campaign_id) {
        console.log('')
        console.log('3. event_survey_entries 테이블 확인')
        console.log('-'.repeat(80))
        
        const { data: entries } = await admin
          .from('event_survey_entries')
          .select('id, survey_no, name, phone_norm, completed_at, registration_data')
          .eq('campaign_id', wertWebinar.registration_campaign_id)
          .order('survey_no', { ascending: true })
        
        console.log(`event_survey_entries 데이터: ${entries?.length || 0}개`)
        
        if (entries && entries.length > 0) {
          console.log(`survey_no 범위: ${entries[0].survey_no} ~ ${entries[entries.length - 1].survey_no}`)
          console.log('')
          console.log('샘플 (상위 10개):')
          entries.slice(0, 10).forEach((e: any) => {
            const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
            console.log(`  survey_no: ${e.survey_no}, name: ${e.name || '-'}, phone: ${e.phone_norm || '-'}, date: ${dateStr}`)
          })
        }
      }
    }
  } else {
    webinars.forEach(w => {
      console.log(`  ID: ${w.id}, 제목: ${w.title}, 코드: ${w.dashboard_code || '-'}`)
    })
  }
  
  console.log('')
  console.log('='.repeat(80))
}

findWertWebinarData()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
