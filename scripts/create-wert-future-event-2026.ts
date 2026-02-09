import { config } from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '@/lib/supabase/admin'

async function createWertEvent() {
  console.log('🎯 워트인텔리전스 이벤트 생성 중...\n')
  
  const admin = createAdminSupabase()
  
  // 워트인텔리전스 클라이언트 ID
  const clientId = '4235a3d5-f0dc-40f2-931d-cbf946a278a4'
  
  // 이벤트 정보
  const eventData = {
    client_id: clientId,
    code: undefined, // 자동 생성
    slug: 'future-secret-2026',
    title: '미래를 선점하는 기업의 비밀',
    campaign_start_date: '2026-02-09', // 오늘
    campaign_end_date: '2026-03-13',
    event_date_type: 'single' as const,
    event_date: '2026-03-12', // 3월 12일
    event_start_date: null,
    event_end_date: null,
    module_registration: true,
    module_survey: false,
    module_webinar: false,
    module_email: false,
    module_utm: true,
    module_ondemand: false,
  }
  
  console.log('📋 이벤트 정보:')
  console.log(`   제목: ${eventData.title}`)
  console.log(`   슬러그: ${eventData.slug}`)
  console.log(`   캠페인 기간: ${eventData.campaign_start_date} ~ ${eventData.campaign_end_date}`)
  console.log(`   이벤트 날짜: ${eventData.event_date} (단일)\n`)
  
  // 코드 자동 생성
  let finalCode: string | undefined = undefined
  for (let attempt = 0; attempt < 10; attempt++) {
    finalCode = String(Math.floor(100000 + Math.random() * 900000))
    
    const { data: existing } = await admin
      .from('events')
      .select('id')
      .eq('client_id', clientId)
      .eq('code', finalCode)
      .maybeSingle()
    
    if (!existing) {
      break
    }
    
    if (attempt === 9) {
      console.error('❌ 코드 자동 생성 실패')
      process.exit(1)
    }
  }
  
  console.log(`✅ 생성된 코드: ${finalCode}\n`)
  
  // 이벤트 생성
  const { data, error } = await admin
    .from('events')
    .insert({
      ...eventData,
      code: finalCode,
    })
    .select('id, client_id, code, slug, title, campaign_start_date, campaign_end_date, event_date, created_at')
    .single()
  
  if (error) {
    console.error('❌ 이벤트 생성 실패:', error.message)
    process.exit(1)
  }
  
  console.log('✅ 이벤트 생성 완료!')
  console.log(`   ID: ${data.id}`)
  console.log(`   코드: ${data.code}`)
  console.log(`   슬러그: ${data.slug}`)
  console.log(`   제목: ${data.title}`)
  console.log(`   캠페인 기간: ${data.campaign_start_date} ~ ${data.campaign_end_date}`)
  console.log(`   이벤트 날짜: ${data.event_date}`)
  console.log(`   생성일: ${data.created_at}\n`)
  
  console.log(`🔗 이벤트 URL: /event/${data.slug}`)
}

createWertEvent().catch(console.error)
