/**
 * Excel 파일의 참가자 데이터가 DB에 저장되어 있는지 확인하는 스크립트
 * 
 * 사용법: npx tsx scripts/check-participants-in-db.ts <webinarIdOrSlug> <excelFilePath>
 * 예시: npx tsx scripts/check-participants-in-db.ts 884372 "118605_참가자리스트_데이터다운로드_모두의특강2026CES특집 (2).xlsx"
 */

import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarIdFromIdOrSlug } from '@/lib/utils/webinar-query'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

interface Participant {
  email: string
  name: string
  nickname?: string
}

/**
 * Excel 파일에서 참가자 데이터 추출
 */
function readParticipantsFromExcel(filePath: string): Participant[] {
  console.log(`📖 Excel 파일 읽기: ${filePath}`)
  
  const workbook = XLSX.readFile(filePath, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // JSON으로 변환
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
  
  if (data.length === 0) {
    throw new Error('Excel 파일이 비어있습니다.')
  }
  
  // 헤더 행 찾기
  let headerRowIndex = -1
  let emailColIndex = -1
  let nameColIndex = -1
  let nicknameColIndex = -1
  
  const emailPatterns = ['이메일', 'email', 'e-mail', '메일', 'mail', '이메일주소', '이메일 주소', 'e-mail주소', 'e-mail 주소']
  const namePatterns = ['이름', 'name', '성명', '닉네임', 'nickname', '참가자명', '성함', '참가자', '참석자']
  const nicknamePatterns = ['닉네임', 'nickname', '별명', '별칭']
  
  for (let rowIndex = 0; rowIndex < Math.min(10, data.length); rowIndex++) {
    const row = data[rowIndex]
    let foundEmail = false
    let foundName = false
    
    row.forEach((cell: any, colIndex: number) => {
      const cellValue = String(cell || '').toLowerCase().trim()
      
      if (!foundEmail && emailPatterns.some(pattern => cellValue.includes(pattern.toLowerCase()))) {
        emailColIndex = colIndex
        foundEmail = true
      }
      
      if (!foundName && namePatterns.some(pattern => cellValue.includes(pattern.toLowerCase()))) {
        nameColIndex = colIndex
        foundName = true
      }
      
      if (nicknameColIndex === -1 && nicknamePatterns.some(pattern => cellValue.includes(pattern.toLowerCase()))) {
        nicknameColIndex = colIndex
      }
    })
    
    if (foundEmail && foundName) {
      headerRowIndex = rowIndex
      console.log(`✓ 헤더 행 발견: 행 ${rowIndex + 1}`)
      console.log(`   - 이메일 컬럼: [${emailColIndex}] ${row[emailColIndex]}`)
      console.log(`   - 이름 컬럼: [${nameColIndex}] ${row[nameColIndex]}`)
      if (nicknameColIndex >= 0) {
        console.log(`   - 닉네임 컬럼: [${nicknameColIndex}] ${row[nicknameColIndex]}`)
      }
      console.log('')
      break
    }
  }
  
  if (headerRowIndex === -1 || emailColIndex === -1 || nameColIndex === -1) {
    throw new Error('헤더 행을 찾을 수 없습니다. 이메일과 이름 컬럼이 있는 행을 확인해주세요.')
  }
  
  // 데이터 행 파싱
  const participants: Participant[] = []
  
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    const email = String(row[emailColIndex] || '').trim()
    const name = String(row[nameColIndex] || '').trim()
    const nickname = nicknameColIndex >= 0 ? String(row[nicknameColIndex] || '').trim() : undefined
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (email && emailRegex.test(email) && name) {
      participants.push({
        email: email.toLowerCase(),
        name,
        nickname: nickname || undefined
      })
    }
  }
  
  console.log(`✅ 총 ${participants.length}명의 참가자 데이터 추출 완료\n`)
  return participants
}

/**
 * 웨비나 정보 확인
 */
async function verifyWebinar(webinarIdOrSlug: string) {
  const admin = createAdminSupabase()
  
  const actualWebinarId = await getWebinarIdFromIdOrSlug(webinarIdOrSlug)
  
  if (!actualWebinarId) {
    throw new Error(`웨비나를 찾을 수 없습니다: ${webinarIdOrSlug}`)
  }
  
  const { data: webinar, error } = await admin
    .from('webinars')
    .select('id, title, access_policy, start_time, slug')
    .eq('id', actualWebinarId)
    .single()
  
  if (error || !webinar) {
    throw new Error(`웨비나를 찾을 수 없습니다: ${webinarIdOrSlug}`)
  }
  
  console.log(`✅ 웨비나 확인 완료:`)
  console.log(`   ID: ${webinar.id}`)
  console.log(`   제목: ${webinar.title}`)
  console.log(`   정책: ${webinar.access_policy}`)
  console.log(`   시작 시간: ${webinar.start_time || '미정'}`)
  console.log(`   Slug: ${webinar.slug || '없음'}\n`)
  
  return webinar
}

/**
 * DB에서 등록된 이메일 목록 조회
 */
async function getRegisteredEmails(webinarId: string): Promise<Set<string>> {
  const admin = createAdminSupabase()
  
  const { data: emails, error } = await admin
    .from('webinar_allowed_emails')
    .select('email')
    .eq('webinar_id', webinarId)
  
  if (error) {
    throw new Error(`DB 조회 실패: ${error.message}`)
  }
  
  return new Set(emails?.map(e => e.email.toLowerCase()) || [])
}

/**
 * 메인 실행 함수
 */
async function main() {
  const webinarIdOrSlug = process.argv[2]
  const excelFilePath = process.argv[3]
  
  if (!webinarIdOrSlug) {
    console.error('❌ 사용법: npx tsx scripts/check-participants-in-db.ts <webinarIdOrSlug> <excelFilePath>')
    console.error('예시: npx tsx scripts/check-participants-in-db.ts 884372 "118605_참가자리스트_데이터다운로드_모두의특강2026CES특집 (2).xlsx"')
    process.exit(1)
  }
  
  if (!excelFilePath) {
    console.error('❌ Excel 파일 경로를 입력해주세요.')
    process.exit(1)
  }
  
  // 환경 변수 확인
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗')
    console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
    process.exit(1)
  }
  
  try {
    // 1. Excel 파일 읽기
    const fullPath = join(process.cwd(), excelFilePath)
    const participants = readParticipantsFromExcel(fullPath)
    
    if (participants.length === 0) {
      console.error('❌ Excel 파일에 참가자 데이터가 없습니다.')
      process.exit(1)
    }
    
    // 2. 웨비나 확인
    const webinar = await verifyWebinar(webinarIdOrSlug)
    
    // 3. DB에서 등록된 이메일 목록 조회
    console.log('🔍 DB에서 등록된 이메일 목록 조회 중...\n')
    const registeredEmails = await getRegisteredEmails(webinar.id)
    console.log(`✅ DB에 등록된 이메일 수: ${registeredEmails.size}개\n`)
    
    // 4. 비교 분석
    console.log('='.repeat(60))
    console.log('📊 저장 상태 확인 결과')
    console.log('='.repeat(60))
    
    const excelEmails = new Set(participants.map(p => p.email.toLowerCase()))
    const registeredSet = registeredEmails
    const notRegistered: Participant[] = []
    const registered: Participant[] = []
    const extraInDb: string[] = []
    
    // Excel에 있지만 DB에 없는 이메일
    participants.forEach(p => {
      if (registeredSet.has(p.email.toLowerCase())) {
        registered.push(p)
      } else {
        notRegistered.push(p)
      }
    })
    
    // DB에 있지만 Excel에 없는 이메일
    registeredEmails.forEach(email => {
      if (!excelEmails.has(email)) {
        extraInDb.push(email)
      }
    })
    
    console.log(`\n📋 Excel 파일 참가자 수: ${participants.length}명`)
    console.log(`💾 DB에 등록된 이메일 수: ${registeredEmails.size}개`)
    console.log(`\n✅ DB에 저장됨: ${registered.length}명`)
    console.log(`❌ DB에 저장 안됨: ${notRegistered.length}명`)
    console.log(`➕ DB에만 있음 (Excel에 없음): ${extraInDb.length}개`)
    
    if (notRegistered.length > 0) {
      console.log(`\n❌ DB에 저장되지 않은 참가자 목록:`)
      notRegistered.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name} (${p.email})`)
      })
    }
    
    if (extraInDb.length > 0) {
      console.log(`\n➕ DB에만 있는 이메일 목록 (처음 20개):`)
      extraInDb.slice(0, 20).forEach((email, idx) => {
        console.log(`   ${idx + 1}. ${email}`)
      })
      if (extraInDb.length > 20) {
        console.log(`   ... 외 ${extraInDb.length - 20}개 더 있음`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    
    if (notRegistered.length === 0 && participants.length === registeredEmails.size) {
      console.log('✅ 모든 참가자가 DB에 정상적으로 저장되어 있습니다!')
    } else {
      console.log('⚠️  일부 참가자가 DB에 저장되지 않았습니다.')
    }
    console.log('='.repeat(60))
    
  } catch (error: any) {
    console.error('\n❌ 오류 발생:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main().catch(console.error)
