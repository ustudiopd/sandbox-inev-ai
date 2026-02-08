/**
 * 클라이언트 이메일 정책 설정 스크립트
 * 
 * 사용법:
 * npx tsx scripts/setup-client-email-policy.ts <client-id>
 * 
 * 예시:
 * npx tsx scripts/setup-client-email-policy.ts 55317496-d3d6-4e65-81d3-405892de78ab
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '../lib/supabase/admin'

async function setupClientEmailPolicy(clientId: string) {
  const admin = createAdminSupabase()

  try {
    // 클라이언트 정보 조회
    console.log(`🔍 클라이언트 조회 중... (ID: ${clientId})\n`)

    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError) {
      console.error('❌ 클라이언트 조회 실패:', clientError.message)
      process.exit(1)
    }

    if (!client) {
      console.error(`❌ 클라이언트를 찾을 수 없습니다 (ID: ${clientId})`)
      process.exit(1)
    }

    console.log(`✅ 클라이언트 찾음: ${client.name}`)
    console.log(`   ID: ${client.id}`)
    console.log(`   Agency ID: ${client.agency_id}\n`)

    // 기존 정책 확인
    const { data: existingPolicy } = await admin
      .from('client_email_policies')
      .select('id')
      .eq('client_id', client.id)
      .maybeSingle()

    // 기본값 설정 (클라이언트 이름 사용)
    const fromName = client.name || 'Inev.ai'
    const fromDomain = 'eventflow.kr'
    const fromLocalpart = 'notify'
    const replyTo = 'connect@wert.co.kr'
    const linkBaseUrl = 'https://eventflow.kr'

    if (existingPolicy) {
      console.log('⚠️  이미 정책이 존재합니다. 업데이트합니다...\n')
      
      // 업데이트
      const { error: updateError } = await admin
        .from('client_email_policies')
        .update({
          send_mode: 'platform',
          from_domain: fromDomain,
          from_localpart_default: fromLocalpart,
          from_name_default: fromName,
          reply_to_default: replyTo,
          link_base_url_default: linkBaseUrl,
        })
        .eq('client_id', client.id)

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
          client_id: client.id,
          send_mode: 'platform',
          from_domain: fromDomain,
          from_localpart_default: fromLocalpart,
          from_name_default: fromName,
          reply_to_default: replyTo,
          link_base_url_default: linkBaseUrl,
        })

      if (insertError) {
        console.error('❌ 정책 생성 실패:', insertError.message)
        process.exit(1)
      }

      console.log('✅ 정책 생성 완료\n')
    }

    console.log('📋 설정된 정책:')
    console.log(`   From Domain: ${fromDomain}`)
    console.log(`   From Localpart: ${fromLocalpart}`)
    console.log(`   From Name: ${fromName}`)
    console.log(`   Reply-To: ${replyTo}`)
    console.log(`   Link Base URL: ${linkBaseUrl}\n`)

    console.log('✅ 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

// 명령줄 인자 확인
const clientId = process.argv[2]

if (!clientId) {
  console.error('❌ 사용법: npx tsx scripts/setup-client-email-policy.ts <client-id>')
  console.error('예시: npx tsx scripts/setup-client-email-policy.ts 55317496-d3d6-4e65-81d3-405892de78ab')
  process.exit(1)
}

setupClientEmailPolicy(clientId)
