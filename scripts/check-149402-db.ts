import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function check149402DB() {
  const admin = createAdminSupabase()
  
  console.log('=== 149402 웨비나 DB 확인 ===\n')
  
  // 1. 웨비나 정보 조회
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, title, registration_campaign_id')
    .eq('slug', '149402')
    .single()
  
  if (webinarError || !webinar) {
    console.error('❌ 웨비나 조회 실패:', webinarError)
    return
  }
  
  console.log('1. 웨비나 정보:')
  console.log(`   ID: ${webinar.id}`)
  console.log(`   Slug: ${webinar.slug}`)
  console.log(`   Title: ${webinar.title}`)
  console.log(`   registration_campaign_id: ${webinar.registration_campaign_id || '없음'}`)
  console.log()
  
  // 2. registrations 테이블 확인
  console.log('2. registrations 테이블 (웨비나 직접 등록):')
  const { data: registrations, error: regError } = await admin
    .from('registrations')
    .select(`
      user_id, 
      nickname, 
      role, 
      registered_via, 
      created_at,
      profiles:user_id (
        id,
        email,
        display_name
      )
    `)
    .eq('webinar_id', webinar.id)
    .order('created_at', { ascending: false })
  
  if (regError) {
    console.error('   ❌ 조회 실패:', regError.message)
  } else {
    console.log(`   총 ${registrations?.length || 0}건`)
    if (registrations && registrations.length > 0) {
      registrations.forEach((reg: any, index: number) => {
        const profile = Array.isArray(reg.profiles) ? reg.profiles[0] : reg.profiles
        const name = reg.nickname || profile?.display_name || profile?.email || '이름 없음'
        const email = profile?.email || '이메일 없음'
        console.log(`   ${index + 1}. ${name} (${email})`)
        console.log(`      - user_id: ${reg.user_id || 'null'}`)
        console.log(`      - nickname: ${reg.nickname || 'null'}`)
        console.log(`      - registered_via: ${reg.registered_via}`)
        console.log(`      - created_at: ${reg.created_at}`)
        if (profile) {
          console.log(`      - profile: ${JSON.stringify(profile)}`)
        }
      })
    } else {
      console.log('   데이터 없음')
    }
  }
  console.log()
  
  // 3. event_survey_entries 확인 (149403 캠페인)
  if (webinar.registration_campaign_id) {
    console.log('3. event_survey_entries 테이블 (등록 캠페인):')
    const { data: campaign } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path')
      .eq('id', webinar.registration_campaign_id)
      .single()
    
    if (campaign) {
      console.log(`   캠페인: ${campaign.title} (${campaign.public_path})`)
      
      const { data: entries, error: entriesError } = await admin
        .from('event_survey_entries')
        .select('id, name, registration_data, completed_at, created_at')
        .eq('campaign_id', webinar.registration_campaign_id)
        .order('completed_at', { ascending: false })
      
      if (entriesError) {
        console.error('   ❌ 조회 실패:', entriesError.message)
      } else {
        console.log(`   총 ${entries?.length || 0}건`)
        if (entries && entries.length > 0) {
          entries.forEach((entry: any, index: number) => {
            const email = entry.registration_data?.email || '이메일 없음'
            console.log(`   ${index + 1}. ${entry.name} (${email}) - ${entry.completed_at || entry.created_at}`)
          })
        } else {
          console.log('   데이터 없음')
        }
      }
    }
  } else {
    console.log('3. event_survey_entries: registration_campaign_id가 없어서 확인 불가')
  }
  console.log()
  
  // 4. 요약
  console.log('=== 요약 ===')
  console.log(`registrations 테이블: ${registrations?.length || 0}건`)
  if (webinar.registration_campaign_id) {
    const { data: entries } = await admin
      .from('event_survey_entries')
      .select('id')
      .eq('campaign_id', webinar.registration_campaign_id)
    console.log(`event_survey_entries 테이블: ${entries?.length || 0}건`)
  }
  console.log()
  console.log('현재 API 로직:')
  if (webinar.registration_campaign_id) {
    console.log('✅ registration_campaign_id가 있으므로 event_survey_entries만 사용')
  } else {
    console.log('⚠️ registration_campaign_id가 없으므로 registrations 테이블 사용')
  }
}

check149402DB().catch(console.error)
