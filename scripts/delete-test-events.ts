/**
 * 테스트 이벤트 삭제 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/delete-test-events.ts
 * 
 * 삭제할 이벤트:
 * - 코드: 149403
 * - 코드: 149402
 * - 코드: W2 (slug: wert-e2)
 * - 코드: W1 (slug: wert-e1)
 * - 코드: 999888 (slug: dod-test-event)
 */

import { createClient } from '@supabase/supabase-js'
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

const testEventCodes = ['149403', '149402', 'W2', 'W1', '999888']
const testEventSlugs = ['149403', '149402', 'wert-e2', 'wert-e1', 'dod-test-event']

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    console.log('🔍 테스트 이벤트 조회 중...\n')

    // 워트인텔리전트 클라이언트 찾기
    const { data: wertClients, error: clientError } = await admin
      .from('clients')
      .select('id, name')
      .or('name.ilike.%워트%,name.ilike.%Wert%,name.ilike.%wert%')
      .limit(10)

    if (clientError) {
      throw new Error(`클라이언트 조회 실패: ${clientError.message}`)
    }

    if (!wertClients || wertClients.length === 0) {
      throw new Error('워트인텔리전트 클라이언트를 찾을 수 없습니다.')
    }

    const wertClient = wertClients.find(c => c.name.includes('워트') || c.name.includes('Wert')) || wertClients[0]
    console.log(`✅ 클라이언트 찾음: ${wertClient.name} (ID: ${wertClient.id})\n`)

    // 테스트 이벤트 조회
    const { data: events, error: eventsError } = await admin
      .from('events')
      .select('id, code, slug, client_id')
      .eq('client_id', wertClient.id)
      .in('code', testEventCodes)

    if (eventsError) {
      throw new Error(`이벤트 조회 실패: ${eventsError.message}`)
    }

    if (!events || events.length === 0) {
      console.log('⚠️  삭제할 테스트 이벤트를 찾을 수 없습니다.')
      process.exit(0)
    }

    console.log(`📋 찾은 테스트 이벤트 (${events.length}개):`)
    events.forEach(event => {
      console.log(`   - 코드: ${event.code}, 슬러그: ${event.slug}, ID: ${event.id}`)
    })
    console.log()

    // 각 이벤트 삭제 (on delete cascade로 관련 데이터 자동 삭제)
    for (const event of events) {
      console.log(`🗑️  이벤트 삭제 중: ${event.code} (${event.slug})...`)
      
      const { error: deleteError } = await admin
        .from('events')
        .delete()
        .eq('id', event.id)

      if (deleteError) {
        console.error(`   ❌ 삭제 실패: ${deleteError.message}`)
      } else {
        console.log(`   ✅ 삭제 완료: ${event.code}`)
      }
    }

    console.log('\n✅ 모든 테스트 이벤트 삭제 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
})()
