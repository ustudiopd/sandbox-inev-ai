/**
 * CSV 파일에서 등록자 데이터를 읽어 leads 테이블에 적재하는 스크립트
 * 
 * 사용법: npx tsx scripts/import-leads-with-visits-from-csv.ts <eventCode> <csvFilePath> [--execute]
 * 예시: npx tsx scripts/import-leads-with-visits-from-csv.ts 149403 exports/webinar-149403-participants-20260209-124026.csv --execute
 * 
 * --execute 플래그 없이는 실제 삽입하지 않고 미리보기만 표시
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

interface CSVRow {
  완료번호?: string
  확인코드?: string
  이름?: string
  이메일?: string
  회사명?: string
  직책?: string
  전화번호?: string
  역할?: string
  등록일시?: string
  등록출처?: string
  마지막접속?: string
  첫접속일시?: string
  접속횟수?: string
  설문제출일시?: string
  [key: string]: string | undefined // UTM 컬럼이 있을 수도 없을 수도 있음
}

/**
 * CSV 파일 파싱
 */
function parseCSV(filePath: string): CSVRow[] {
  console.log(`📖 CSV 파일 읽기: ${filePath}`)
  
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV 파일이 비어있거나 헤더만 있습니다.')
  }
  
  // 헤더 파싱
  const headers = lines[0].split(',').map(h => h.trim())
  console.log(`📋 헤더: ${headers.join(', ')}`)
  
  // 데이터 행 파싱
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    if (values.length < headers.length) continue
    
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row as CSVRow)
  }
  
  console.log(`✅ ${rows.length}개 행 파싱 완료\n`)
  return rows
}

/**
 * 날짜 문자열을 ISO 형식으로 변환
 * "2026. 01. 25. 오후 11:51:43" -> "2026-01-25T14:51:43.000Z" (UTC)
 */
function parseKoreanDateTime(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null
  
  try {
    // "2026. 01. 25. 오후 11:51:43" 형식 파싱
    const match = dateStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})/)
    if (!match) return null
    
    const [, year, month, day, ampm, hour, minute, second] = match
    let hour24 = parseInt(hour)
    
    if (ampm === '오후' && hour24 !== 12) {
      hour24 += 12
    } else if (ampm === '오전' && hour24 === 12) {
      hour24 = 0
    }
    
    // KST -> UTC 변환 (9시간 빼기)
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour24.toString().padStart(2, '0')}:${minute}:${second}`)
    date.setHours(date.getHours() - 9) // KST to UTC
    
    return date.toISOString()
  } catch (e) {
    console.warn(`날짜 파싱 실패: ${dateStr}`, e)
    return null
  }
}


/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2)
  const eventCode = args[0]
  const csvFilePath = args[1]
  const execute = args.includes('--execute')
  
  if (!eventCode || !csvFilePath) {
    console.error('사용법: npx tsx scripts/import-leads-with-visits-from-csv.ts <eventCode> <csvFilePath> [--execute]')
    process.exit(1)
  }
  
  if (!execute) {
    console.log('⚠️  --execute 플래그가 없어 미리보기 모드로 실행합니다.')
    console.log('   실제 데이터를 삽입하려면 --execute 플래그를 추가하세요.\n')
  }
  
  const supabase = createAdminSupabase()
  
  // 이벤트 조회
  console.log(`🔍 이벤트 조회: ${eventCode}`)
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, code, slug, client_id')
    .eq('code', eventCode)
    .limit(1)
    .single()
  
  if (eventError || !event) {
    console.error(`❌ 이벤트를 찾을 수 없습니다: ${eventCode}`)
    process.exit(1)
  }
  
  console.log(`✅ 이벤트 찾음: ${event.code} (${event.slug})`)
  console.log(`   ID: ${event.id}\n`)
  
  // CSV 파싱
  const csvRows = parseCSV(csvFilePath)
  
  // 통계
  let leadsCreated = 0
  let leadsUpdated = 0
  let errors: Array<{ row: number; email: string; error: string }> = []
  
  // 배치 처리 (100개씩)
  const batchSize = 100
  for (let i = 0; i < csvRows.length; i += batchSize) {
    const batch = csvRows.slice(i, i + batchSize)
    console.log(`\n📦 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(csvRows.length / batchSize)} 처리 중... (${batch.length}개 행)`)
    
    for (const row of batch) {
      const rowIndex = csvRows.indexOf(row) + 2 // CSV 행 번호 (헤더 제외, 1-based)
      
      try {
        const email = row.이메일?.trim().toLowerCase()
        if (!email) {
          errors.push({ row: rowIndex, email: '', error: '이메일이 없습니다' })
          continue
        }
        
        const name = row.이름?.trim() || null
        const userCode = row.확인코드?.trim() || null
        const registrationDate = parseKoreanDateTime(row.등록일시)
        
        // 1. Lead 생성/업데이트
        const { data: existingLead, error: findError } = await supabase
          .from('leads')
          .select('id')
          .eq('event_id', event.id)
          .eq('email', email)
          .limit(1)
          .maybeSingle()
        
        if (findError) {
          errors.push({ row: rowIndex, email, error: `Lead 조회 실패: ${findError.message}` })
          continue
        }
        
        let leadId: string
        
        if (existingLead) {
          // 기존 Lead 업데이트
          if (execute) {
            const { data: updatedLead, error: updateError } = await supabase
              .from('leads')
              .update({
                name: name || existingLead.name,
                user_code: userCode || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingLead.id)
              .select('id')
              .single()
            
            if (updateError) {
              errors.push({ row: rowIndex, email, error: `Lead 업데이트 실패: ${updateError.message}` })
              continue
            }
            
            leadId = updatedLead.id
            leadsUpdated++
          } else {
            leadId = existingLead.id
            leadsUpdated++
          }
        } else {
          // 새 Lead 생성
          if (execute) {
            const { data: newLead, error: insertError } = await supabase
              .from('leads')
              .insert({
                event_id: event.id,
                email,
                name,
                user_code: userCode,
                created_at: registrationDate || new Date().toISOString(),
              })
              .select('id')
              .single()
            
            if (insertError) {
              errors.push({ row: rowIndex, email, error: `Lead 생성 실패: ${insertError.message}` })
              continue
            }
            
            leadId = newLead.id
            leadsCreated++
          } else {
            leadId = 'preview-mode'
            leadsCreated++
          }
        }
      } catch (error: any) {
        errors.push({ row: rowIndex, email: row.이메일 || '', error: error.message || String(error) })
      }
    }
  }
  
  // 결과 출력
  console.log('\n' + '='.repeat(60))
  console.log('📊 처리 결과')
  console.log('='.repeat(60))
  console.log(`✅ Leads 생성: ${leadsCreated}개`)
  console.log(`🔄 Leads 업데이트: ${leadsUpdated}개`)
  console.log(`❌ 오류: ${errors.length}개`)
  
  if (errors.length > 0) {
    console.log('\n❌ 오류 상세:')
    errors.slice(0, 10).forEach(err => {
      console.log(`   행 ${err.row}: ${err.email} - ${err.error}`)
    })
    if (errors.length > 10) {
      console.log(`   ... 외 ${errors.length - 10}개 오류`)
    }
  }
  
  if (!execute) {
    console.log('\n⚠️  미리보기 모드였습니다. 실제 데이터를 삽입하려면 --execute 플래그를 추가하세요.')
  } else {
    console.log('\n✅ 데이터 적재 완료!')
  }
}

main().catch(console.error)
