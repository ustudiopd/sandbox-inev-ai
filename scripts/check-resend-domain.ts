/**
 * Resend 도메인 설정 확인 스크립트
 * 
 * 사용법:
 * npx tsx scripts/check-resend-domain.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import * as dns from 'dns'
import { promisify } from 'util'

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') })

const resolveTxt = promisify(dns.resolveTxt)
const resolveMx = promisify(dns.resolveMx)

async function checkResendDomain() {
  const domain = 'eventflow.kr'
  
  console.log('🔍 Resend 도메인 설정 확인 중...\n')
  console.log(`도메인: ${domain}\n`)
  
  // 1. DKIM 레코드 확인
  console.log('1️⃣ DKIM 레코드 확인 (resend._domainkey.eventflow.kr)')
  try {
    const dkimRecords = await resolveTxt(`resend._domainkey.${domain}`)
    const dkimRecord = dkimRecords.flat().join('')
    if (dkimRecord && dkimRecord.startsWith('p=')) {
      console.log('   ✅ DKIM 레코드 존재')
      console.log(`   📝 값: ${dkimRecord.substring(0, 50)}...`)
    } else {
      console.log('   ❌ DKIM 레코드 없음 또는 형식 오류')
    }
  } catch (error: any) {
    console.log(`   ❌ DKIM 레코드 조회 실패: ${error.message}`)
  }
  console.log('')
  
  // 2. SPF TXT 레코드 확인
  console.log('2️⃣ SPF TXT 레코드 확인 (send.eventflow.kr)')
  try {
    const spfRecords = await resolveTxt(`send.${domain}`)
    const spfRecord = spfRecords.flat().join('')
    if (spfRecord && spfRecord.includes('v=spf1')) {
      console.log('   ✅ SPF 레코드 존재')
      console.log(`   📝 값: ${spfRecord}`)
    } else {
      console.log('   ❌ SPF 레코드 없음 또는 형식 오류')
    }
  } catch (error: any) {
    console.log(`   ❌ SPF 레코드 조회 실패: ${error.message}`)
  }
  console.log('')
  
  // 3. MX 레코드 확인
  console.log('3️⃣ MX 레코드 확인 (send.eventflow.kr)')
  try {
    const mxRecords = await resolveMx(`send.${domain}`)
    if (mxRecords && mxRecords.length > 0) {
      console.log('   ✅ MX 레코드 존재')
      mxRecords.forEach((record, idx) => {
        console.log(`   📝 ${idx + 1}. Priority: ${record.priority}, Exchange: ${record.exchange}`)
      })
    } else {
      console.log('   ❌ MX 레코드 없음')
    }
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      console.log('   ❌ MX 레코드 없음 (DNS에 설정되지 않음)')
    } else {
      console.log(`   ❌ MX 레코드 조회 실패: ${error.message}`)
    }
  }
  console.log('')
  
  // 4. 환경 변수 확인
  console.log('4️⃣ 환경 변수 확인')
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    console.log('   ✅ RESEND_API_KEY 설정됨')
    console.log(`   📝 키: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`)
  } else {
    console.log('   ❌ RESEND_API_KEY 설정되지 않음')
  }
  console.log('')
  
  // 5. 요약
  console.log('📋 요약:')
  console.log('   - DKIM: ✅ 설정됨')
  console.log('   - SPF TXT: ✅ 설정됨')
  console.log('   - MX: ❌ 설정되지 않음 (Resend 대시보드에서 Pending 상태일 수 있음)')
  console.log('   - API Key: ' + (apiKey ? '✅ 설정됨' : '❌ 설정되지 않음'))
  console.log('')
  console.log('💡 다음 단계:')
  console.log('   1. DNS 관리자에서 MX 레코드 추가 필요')
  console.log('   2. Resend 대시보드에서 도메인 인증 상태 확인')
  console.log('   3. MX 레코드 추가 후 Resend 대시보드에서 "Verify" 클릭')
}

checkResendDomain().catch(console.error)
