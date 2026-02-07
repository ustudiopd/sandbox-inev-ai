/**
 * 웨비나 149402 오늘 1시-4시 접속자 이메일/이름/고유값 CSV 내보내기 (MCP 직접 사용)
 * 
 * 사용법: 이 스크립트는 MCP 도구를 통해 직접 실행됩니다.
 */

import * as fs from 'fs'
import * as path from 'path'

const WEBINAR_ID = '149402'
const PROJECT_ID = 'yqsayphssjznthrxpgfb'
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** UTC 시각을 KST(UTC+9)로 해석한 Date. getUTCHours() 등이 KST 값이 됨. */
function toKST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

/** KST 기준으로 오늘 날짜의 특정 시간(시, 분)을 UTC Date로 반환 */
function getKSTDate(year: number, month: number, date: number, hour: number, minute: number = 0): Date {
  // KST 시간을 UTC로 변환 (9시간 빼기)
  const kstDate = new Date(Date.UTC(year, month, date, hour, minute, 0))
  return new Date(kstDate.getTime() - KST_OFFSET_MS)
}

/** CSV 이스케이프 처리 */
function escapeCsv(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function exportAccessUsers() {
  console.log('=== 웨비나 접속자 내보내기 (MCP 사용) ===\n')
  console.log(`웨비나 ID: ${WEBINAR_ID}`)

  // 오늘 날짜 (한국 시간 기준)
  const now = new Date()
  const kstNow = toKST(now)
  const year = kstNow.getUTCFullYear()
  const month = kstNow.getUTCMonth()
  const date = kstNow.getUTCDate()

  // 오늘 1시-4시 (한국 시간) - UTC로 변환하여 저장
  const startTime = getKSTDate(year, month, date, 1, 0)
  const endTime = getKSTDate(year, month, date, 4, 0)

  console.log(`시간 범위 (KST): ${startTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} ~ ${endTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`)

  // 이 스크립트는 MCP 도구를 통해 실행되므로,
  // 실제 데이터 조회는 MCP 도구 호출로 대체됩니다.
  // 여기서는 쿼리와 실행 방법을 안내합니다.
  
  console.log('MCP를 사용하여 데이터를 조회합니다...\n')
  
  // MCP 쿼리 실행을 위한 SQL 생성
  const sqlQuery = `
WITH time_range AS (
  SELECT 
    -- 오늘 1시 (KST)를 UTC로 변환
    (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 hour') AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC' AS start_time,
    -- 오늘 4시 (KST)를 UTC로 변환  
    (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '4 hour') AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC' AS end_time
),
webinar_info AS (
  SELECT id, slug, title 
  FROM webinars 
  WHERE id::text = '${WEBINAR_ID}' OR slug = '${WEBINAR_ID}'
  LIMIT 1
),
access_sessions AS (
  SELECT DISTINCT wus.user_id
  FROM webinar_user_sessions wus
  CROSS JOIN webinar_info wi
  CROSS JOIN time_range tr
  WHERE wus.webinar_id = wi.id
    AND wus.entered_at >= tr.start_time
    AND wus.entered_at < tr.end_time
    AND wus.user_id IS NOT NULL
)
SELECT 
  p.id AS user_id,
  COALESCE(r.nickname, p.nickname, p.display_name, p.email, '익명') AS name,
  COALESCE(p.email, '') AS email
FROM access_sessions a
INNER JOIN profiles p ON p.id = a.user_id
LEFT JOIN registrations r ON r.user_id = a.user_id AND r.webinar_id = (SELECT id FROM webinar_info)
ORDER BY p.email;
  `
  
  console.log('생성된 SQL 쿼리:')
  console.log('='.repeat(80))
  console.log(sqlQuery)
  console.log('='.repeat(80))
  console.log('\n이 쿼리를 MCP execute_sql 도구로 실행하면 결과를 받을 수 있습니다.\n')
  
  // 쿼리 파일 저장
  const queryDir = path.join(process.cwd(), 'scripts', 'queries')
  if (!fs.existsSync(queryDir)) {
    fs.mkdirSync(queryDir, { recursive: true })
  }
  
  const queryFile = path.join(queryDir, `export-149402-${year}${String(month + 1).padStart(2, '0')}${String(date).padStart(2, '0')}-01-04.sql`)
  fs.writeFileSync(queryFile, sqlQuery, 'utf8')
  
  console.log(`SQL 쿼리 파일 저장됨: ${queryFile}`)
}

exportAccessUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 중 오류 발생:', error)
    process.exit(1)
  })
