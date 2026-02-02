/**
 * Wert 웨비나(149402) slug로 찾기
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findWertWebinarBySlug() {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('Wert 웨비나(149402) 찾기')
  console.log('='.repeat(80))
  console.log('')
  
  // slug로 웨비나 찾기
  const { data: webinar } = await admin
    .from('webinars')
    .select('id, title, slug, dashboard_code, registration_campaign_id, client_id')
    .eq('slug', '149402')
    .maybeSingle()
  
  if (!webinar) {
    // dashboard_code로도 시도
    const { data: webinarByCode } = await admin
      .from('webinars')
      .select('id, title, slug, dashboard_code, registration_campaign_id, client_id')
      .eq('dashboard_code', '149402')
      .maybeSingle()
    
    if (webinarByCode) {
      console.log('dashboard_code로 찾음:')
      console.log(`  ID: ${webinarByCode.id}`)
      console.log(`  제목: ${webinarByCode.title}`)
      console.log(`  slug: ${webinarByCode.slug || '-'}`)
      console.log(`  dashboard_code: ${webinarByCode.dashboard_code || '-'}`)
      console.log(`  캠페인 ID: ${webinarByCode.registration_campaign_id || '-'}`)
      console.log(`  클라이언트 ID: ${webinarByCode.client_id}`)
      console.log('')
      
      // registrations 확인
      console.log('registrations 테이블 확인:')
      const { data: registrations } = await admin
        .from('registrations')
        .select('id, survey_no, code6, nickname, registration_data, created_at, phone_norm')
        .eq('webinar_id', webinarByCode.id)
        .order('survey_no', { ascending: true })
      
      console.log(`  총 ${registrations?.length || 0}개`)
      
      if (registrations && registrations.length > 0) {
        console.log(`  survey_no 범위: ${registrations[0].survey_no} ~ ${registrations[registrations.length - 1].survey_no}`)
        console.log('')
        console.log('샘플 (상위 20개):')
        registrations.slice(0, 20).forEach((r: any) => {
          const dateStr = new Date(r.created_at).toISOString().split('T')[0]
          const name = r.nickname || r.registration_data?.name || '-'
          const phone = r.phone_norm || r.registration_data?.phone || r.registration_data?.phoneNorm || '-'
          console.log(`    ${r.survey_no}: ${name} (${phone}) - ${dateStr}`)
        })
      }
      
      // 캠페인 ID가 있으면 event_survey_entries도 확인
      if (webinarByCode.registration_campaign_id) {
        console.log('')
        console.log('event_survey_entries 테이블 확인:')
        const { data: entries } = await admin
          .from('event_survey_entries')
          .select('id, survey_no, name, phone_norm, completed_at, registration_data')
          .eq('campaign_id', webinarByCode.registration_campaign_id)
          .order('survey_no', { ascending: true })
        
        console.log(`  총 ${entries?.length || 0}개`)
        
        if (entries && entries.length > 0) {
          console.log(`  survey_no 범위: ${entries[0].survey_no} ~ ${entries[entries.length - 1].survey_no}`)
          console.log('')
          console.log('샘플 (상위 20개):')
          entries.slice(0, 20).forEach((e: any) => {
            const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
            const name = e.name || '-'
            const phone = e.phone_norm || '-'
            const email = e.registration_data?.email || '-'
            console.log(`    ${e.survey_no}: ${name} (${phone}) ${email ? `[${email}]` : ''} - ${dateStr}`)
          })
        }
      }
    } else {
      console.log('웨비나를 찾을 수 없습니다.')
      console.log('')
      console.log('다른 방법으로 검색:')
      
      // 모든 웨비나에서 검색
      const { data: allWebinars } = await admin
        .from('webinars')
        .select('id, title, slug, dashboard_code, registration_campaign_id')
        .or('slug.ilike.%149402%,dashboard_code.ilike.%149402%,title.ilike.%wert%')
        .limit(20)
      
      if (allWebinars && allWebinars.length > 0) {
        console.log(`찾은 웨비나: ${allWebinars.length}개`)
        allWebinars.forEach(w => {
          console.log(`  ID: ${w.id}, 제목: ${w.title}, slug: ${w.slug || '-'}, 코드: ${w.dashboard_code || '-'}`)
        })
      }
    }
  } else {
    console.log('slug로 찾음:')
    console.log(`  ID: ${webinar.id}`)
    console.log(`  제목: ${webinar.title}`)
    console.log(`  slug: ${webinar.slug}`)
    console.log(`  dashboard_code: ${webinar.dashboard_code || '-'}`)
    console.log(`  캠페인 ID: ${webinar.registration_campaign_id || '-'}`)
    console.log(`  클라이언트 ID: ${webinar.client_id}`)
    console.log('')
    
    // registrations 확인
    console.log('registrations 테이블 확인:')
    const { data: registrations } = await admin
      .from('registrations')
      .select('id, survey_no, code6, nickname, registration_data, created_at, phone_norm')
      .eq('webinar_id', webinar.id)
      .order('survey_no', { ascending: true })
    
    console.log(`  총 ${registrations?.length || 0}개`)
    
    if (registrations && registrations.length > 0) {
      console.log(`  survey_no 범위: ${registrations[0].survey_no} ~ ${registrations[registrations.length - 1].survey_no}`)
      console.log('')
      console.log('샘플 (상위 20개):')
      registrations.slice(0, 20).forEach((r: any) => {
        const dateStr = new Date(r.created_at).toISOString().split('T')[0]
        const name = r.nickname || r.registration_data?.name || '-'
        const phone = r.phone_norm || r.registration_data?.phone || r.registration_data?.phoneNorm || '-'
        console.log(`    ${r.survey_no}: ${name} (${phone}) - ${dateStr}`)
      })
    }
    
    // 캠페인 ID가 있으면 event_survey_entries도 확인
    if (webinar.registration_campaign_id) {
      console.log('')
      console.log('event_survey_entries 테이블 확인:')
      const { data: entries } = await admin
        .from('event_survey_entries')
        .select('id, survey_no, name, phone_norm, completed_at, registration_data')
        .eq('campaign_id', webinar.registration_campaign_id)
        .order('survey_no', { ascending: true })
      
      console.log(`  총 ${entries?.length || 0}개`)
      
      if (entries && entries.length > 0) {
        console.log(`  survey_no 범위: ${entries[0].survey_no} ~ ${entries[entries.length - 1].survey_no}`)
        console.log('')
        console.log('샘플 (상위 20개):')
        entries.slice(0, 20).forEach((e: any) => {
          const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
          const name = e.name || '-'
          const phone = e.phone_norm || '-'
          const email = e.registration_data?.email || '-'
          console.log(`    ${e.survey_no}: ${name} (${phone}) ${email ? `[${email}]` : ''} - ${dateStr}`)
        })
      }
    }
  }
  
  console.log('')
  console.log('='.repeat(80))
}

findWertWebinarBySlug()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
