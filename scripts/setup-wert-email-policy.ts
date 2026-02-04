/**
 * WERT 클라이언트 이메일 정책 설정 스크립트
 * 
 * 사용법:
 * npx tsx scripts/setup-wert-email-policy.ts
 */

import { createAdminSupabase } from '../lib/supabase/admin'

async function setupWertEmailPolicy() {
  const admin = createAdminSupabase()

  try {
    // 워트인텔리전트 클라이언트 찾기
    console.log('🔍 워트인텔리전트 클라이언트 찾기...\n')

    const { data: wertClient, error: clientError } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .ilike('name', '%워트인텔리전트%')
      .maybeSingle()

    if (clientError) {
      console.error('❌ 클라이언트 조회 실패:', clientError.message)
      process.exit(1)
    }

    if (!wertClient) {
      console.error('❌ 워트인텔리전트 클라이언트를 찾을 수 없습니다')
      process.exit(1)
    }

    console.log(`✅ 클라이언트 찾음: ${wertClient.name}`)
    console.log(`   ID: ${wertClient.id}`)
    console.log(`   Agency ID: ${wertClient.agency_id}\n`)

    // 기존 정책 확인
    const { data: existingPolicy } = await admin
      .from('client_email_policies')
      .select('id')
      .eq('client_id', wertClient.id)
      .maybeSingle()

    if (existingPolicy) {
      console.log('⚠️  이미 정책이 존재합니다. 업데이트합니다...\n')
      
      // 업데이트
      const { error: updateError } = await admin
        .from('client_email_policies')
        .update({
          send_mode: 'platform',
          from_domain: 'eventflow.kr',
          from_localpart_default: 'notify',
          from_name_default: '모두의특강',
          reply_to_default: 'connect@wert.co.kr',
          link_base_url_default: 'https://eventflow.kr',
        })
        .eq('client_id', wertClient.id)

      if (updateError) {
        console.error('❌ 정책 업데이트 실패:', updateError.message)
        process.exit(1)
      }

      console.log('✅ 정책 업데이트 완료\n')
    } else {
      // 생성
      const { error: insertError } = await admin
        .from('client_email_policies')
        .insert({
          client_id: wertClient.id,
          send_mode: 'platform',
          from_domain: 'eventflow.kr',
          from_localpart_default: 'notify',
          from_name_default: '모두의특강',
          reply_to_default: 'connect@wert.co.kr',
          link_base_url_default: 'https://eventflow.kr',
        })

      if (insertError) {
        console.error('❌ 정책 생성 실패:', insertError.message)
        process.exit(1)
      }

      console.log('✅ 정책 생성 완료\n')
    }

    console.log('📋 설정된 정책:')
    console.log('   From Domain: eventflow.kr')
    console.log('   From Localpart: notify')
    console.log('   From Name: 모두의특강')
    console.log('   Reply-To: connect@wert.co.kr')
    console.log('   Link Base URL: https://eventflow.kr\n')

    console.log('✅ 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

setupWertEmailPolicy()
