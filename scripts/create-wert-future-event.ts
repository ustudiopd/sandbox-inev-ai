/**
 * 워트인텔리전스 이벤트 생성 스크립트
 * 
 * 이벤트 정보:
 * - 제목: 워트인텔리전스 이벤트
 * - 부제목: 미래를 선점하는 기업의 비밀
 * - 모듈: 웨비나 활성화
 * 
 * 사용법:
 *   npx tsx scripts/create-wert-future-event.ts
 */

import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createAdminSupabase()

  try {
    // 1) 워트인텔리전스 클라이언트 찾기
    console.log('🔍 워트인텔리전스 클라이언트 찾기...\n')

    const { data: wertClients, error: clientError } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .or('name.ilike.%워트%,name.ilike.%Wert%,name.ilike.%wert%')
      .limit(10)

    if (clientError) {
      throw new Error(`클라이언트 조회 실패: ${clientError.message}`)
    }

    if (!wertClients || wertClients.length === 0) {
      throw new Error('워트인텔리전스 클라이언트를 찾을 수 없습니다.')
    }

    const wertClient = wertClients.find(c => c.name.includes('워트') || c.name.includes('Wert')) || wertClients[0]
    console.log(`✅ 클라이언트 찾음: ${wertClient.name}`)
    console.log(`   ID: ${wertClient.id}`)
    console.log(`   Agency ID: ${wertClient.agency_id}\n`)

    // 2) 기존 이벤트 코드 확인 (중복 방지)
    const { data: existingEvents } = await admin
      .from('events')
      .select('code')
      .eq('client_id', wertClient.id)
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('📋 기존 이벤트 코드:')
    if (existingEvents && existingEvents.length > 0) {
      existingEvents.forEach(e => console.log(`   - ${e.code}`))
    } else {
      console.log('   없음')
    }
    console.log()

    // 3) 새 이벤트 코드 생성 (날짜 기반: YYMMDD 형식)
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const baseCode = `${year}${month}${day}`

    // 중복 체크 및 코드 생성
    let eventCode = baseCode
    let codeSuffix = 1
    while (existingEvents?.some(e => e.code === eventCode)) {
      eventCode = `${baseCode}${codeSuffix.toString().padStart(2, '0')}`
      codeSuffix++
    }

    // 슬러그 생성 (URL 친화적)
    const eventSlug = 'wert-future-secret'

    // 4) 이벤트 생성
    console.log('📝 이벤트 생성 정보:')
    console.log(`   코드: ${eventCode}`)
    console.log(`   슬러그: ${eventSlug}`)
    console.log(`   모듈 - 등록: true`)
    console.log(`   모듈 - 웨비나: true`)
    console.log()

    const { data: newEvent, error: eventError } = await admin
      .from('events')
      .insert({
        client_id: wertClient.id,
        code: eventCode,
        slug: eventSlug,
        module_registration: true,
        module_survey: false,
        module_webinar: true,
        module_email: false,
        module_utm: false,
        module_ondemand: false,
      })
      .select('id, client_id, code, slug, module_registration, module_webinar, created_at')
      .single()

    if (eventError) {
      throw new Error(`이벤트 생성 실패: ${eventError.message}`)
    }

    console.log('✅ 이벤트 생성 완료!')
    console.log(`   ID: ${newEvent.id}`)
    console.log(`   코드: ${newEvent.code}`)
    console.log(`   슬러그: ${newEvent.slug}`)
    console.log(`   생성일: ${new Date(newEvent.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`)
    console.log()
    console.log('📌 접근 URL:')
    console.log(`   메인 페이지: /event/${newEvent.slug}`)
    console.log(`   등록 페이지: /event/${newEvent.slug}/register`)
    console.log(`   웨비나 페이지: /event/${newEvent.slug}/webinar`)

  } catch (error) {
    console.error('\n❌ 오류 발생:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
})()
