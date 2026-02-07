/**
 * 웨비나 149402 오늘 하루 전체 접속자 기본정보 CSV 내보내기 (MCP 사용 개선 버전)
 * 
 * MCP Supabase를 사용하여 직접 SQL 쿼리 실행
 */

import * as fs from 'fs'
import * as path from 'path'

const WEBINAR_ID = '149402'
const WEBINAR_UUID = 'f257ce42-723a-4fad-a9a5-1bd8c154d7ce'
const CAMPAIGN_UUID = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
const PROJECT_ID = 'yqsayphssjznthrxpgfb'

/** CSV 이스케이프 처리 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** 날짜 포맷팅 (KST) */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dateStr
  }
}

async function exportAccessUsers() {
  console.log('=== 웨비나 접속자 내보내기 (MCP 사용 개선 버전) ===\n')
  console.log(`웨비나 ID: ${WEBINAR_ID}`)
  console.log(`프로젝트 ID: ${PROJECT_ID}\n`)

  // SQL 쿼리 생성 - 오늘 하루 전체 접속자 조회
  const sqlQuery = `
WITH today_start AS (
  SELECT (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'UTC')::timestamptz AS start_time
),
today_end AS (
  SELECT ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 day') AT TIME ZONE 'UTC')::timestamptz AS end_time
),
today_sessions AS (
  SELECT DISTINCT user_id, MIN(entered_at) as first_access
  FROM webinar_user_sessions
  CROSS JOIN today_start ts
  CROSS JOIN today_end te
  WHERE webinar_id = '${WEBINAR_UUID}'::uuid
    AND entered_at >= ts.start_time
    AND entered_at < te.end_time
    AND user_id IS NOT NULL
  GROUP BY user_id
),
user_data AS (
  SELECT 
    ts.user_id,
    p.email,
    p.display_name,
    p.nickname,
    p.last_login_at,
    ts.first_access,
    -- 등록 정보 (event_survey_entries)
    ese.registration_data->>'name' as reg_name,
    ese.registration_data->>'organization' as reg_organization,
    ese.registration_data->>'company' as reg_company,
    ese.registration_data->>'position' as reg_position,
    ese.registration_data->>'jobTitle' as reg_jobTitle,
    ese.registration_data->>'phone' as reg_phone,
    ese.registration_data->>'phone_norm' as reg_phone_norm,
    ese.survey_no,
    ese.code6,
    ese.utm_source,
    ese.utm_medium,
    ese.utm_campaign,
    ese.utm_term,
    ese.utm_content,
    ese.marketing_campaign_link_id,
    ese.completed_at as reg_completed_at,
    ese.created_at as reg_created_at
  FROM today_sessions ts
  INNER JOIN profiles p ON p.id = ts.user_id
  LEFT JOIN event_survey_entries ese ON LOWER(TRIM(COALESCE(ese.registration_data->>'email', ''))) = LOWER(TRIM(COALESCE(p.email, '')))
    AND ese.campaign_id = '${CAMPAIGN_UUID}'::uuid
)
SELECT 
  user_id,
  email,
  -- 이름 결정: 등록 이름 > 프로필 닉네임 > 프로필 display_name > 이메일
  COALESCE(
    NULLIF(reg_name, ''),
    NULLIF(nickname, ''),
    NULLIF(display_name, ''),
    email,
    '정보없음'
  ) as name,
  -- 회사명 결정: organization > company
  COALESCE(
    NULLIF(reg_organization, ''),
    NULLIF(reg_company, ''),
    ''
  ) as company,
  -- 직책 결정: position > jobTitle
  COALESCE(
    NULLIF(reg_position, ''),
    NULLIF(reg_jobTitle, ''),
    ''
  ) as position,
  -- 전화번호 결정: phone > phone_norm
  COALESCE(
    NULLIF(reg_phone, ''),
    NULLIF(reg_phone_norm, ''),
    ''
  ) as phone,
  '참가자' as role,
  COALESCE(reg_completed_at, reg_created_at, '') as registered_at,
  '등록 페이지' as registered_via,
  last_login_at,
  first_access,
  survey_no,
  code6,
  COALESCE(utm_source, '') as utm_source,
  COALESCE(utm_medium, '') as utm_medium,
  COALESCE(utm_campaign, '') as utm_campaign,
  COALESCE(utm_term, '') as utm_term,
  COALESCE(utm_content, '') as utm_content,
  COALESCE(marketing_campaign_link_id, '') as marketing_campaign_link_id
FROM user_data
ORDER BY first_access DESC;
  `

  console.log('SQL 쿼리 생성 완료\n')
  console.log('='.repeat(80))
  console.log(sqlQuery)
  console.log('='.repeat(80))
  console.log('\n이 쿼리를 MCP execute_sql 도구로 실행하세요.\n')
  console.log('또는 아래 스크립트를 사용하여 자동으로 실행할 수 있습니다:\n')

  // Node.js 실행 스크립트 생성
  const nodeScript = `
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const WEBINAR_UUID = '${WEBINAR_UUID}'
const CAMPAIGN_UUID = '${CAMPAIGN_UUID}'

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
    return \`"\${str.replace(/"/g, '""')}"\`
  }
  return str
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dateStr
  }
}

async function exportAccessUsers() {
  console.log('=== 웨비나 접속자 내보내기 ===\\n')

  const sqlQuery = \`
WITH today_start AS (
  SELECT (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'UTC')::timestamptz AS start_time
),
today_end AS (
  SELECT ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 day') AT TIME ZONE 'UTC')::timestamptz AS end_time
),
today_sessions AS (
  SELECT DISTINCT user_id, MIN(entered_at) as first_access
  FROM webinar_user_sessions
  CROSS JOIN today_start ts
  CROSS JOIN today_end te
  WHERE webinar_id = '\${WEBINAR_UUID}'::uuid
    AND entered_at >= ts.start_time
    AND entered_at < te.end_time
    AND user_id IS NOT NULL
  GROUP BY user_id
),
user_data AS (
  SELECT 
    ts.user_id,
    p.email,
    p.display_name,
    p.nickname,
    p.last_login_at,
    ts.first_access,
    ese.registration_data->>'name' as reg_name,
    ese.registration_data->>'organization' as reg_organization,
    ese.registration_data->>'company' as reg_company,
    ese.registration_data->>'position' as reg_position,
    ese.registration_data->>'jobTitle' as reg_jobTitle,
    ese.registration_data->>'phone' as reg_phone,
    ese.registration_data->>'phone_norm' as reg_phone_norm,
    ese.survey_no,
    ese.code6,
    ese.utm_source,
    ese.utm_medium,
    ese.utm_campaign,
    ese.utm_term,
    ese.utm_content,
    ese.marketing_campaign_link_id,
    ese.completed_at as reg_completed_at,
    ese.created_at as reg_created_at
  FROM today_sessions ts
  INNER JOIN profiles p ON p.id = ts.user_id
  LEFT JOIN event_survey_entries ese ON LOWER(TRIM(COALESCE(ese.registration_data->>'email', ''))) = LOWER(TRIM(COALESCE(p.email, '')))
    AND ese.campaign_id = '\${CAMPAIGN_UUID}'::uuid
)
SELECT 
  user_id,
  email,
  COALESCE(
    NULLIF(reg_name, ''),
    NULLIF(nickname, ''),
    NULLIF(display_name, ''),
    email,
    '정보없음'
  ) as name,
  COALESCE(
    NULLIF(reg_organization, ''),
    NULLIF(reg_company, ''),
    ''
  ) as company,
  COALESCE(
    NULLIF(reg_position, ''),
    NULLIF(reg_jobTitle, ''),
    ''
  ) as position,
  COALESCE(
    NULLIF(reg_phone, ''),
    NULLIF(reg_phone_norm, ''),
    ''
  ) as phone,
  '참가자' as role,
  COALESCE(reg_completed_at, reg_created_at, '') as registered_at,
  '등록 페이지' as registered_via,
  last_login_at,
  first_access,
  survey_no,
  code6,
  COALESCE(utm_source, '') as utm_source,
  COALESCE(utm_medium, '') as utm_medium,
  COALESCE(utm_campaign, '') as utm_campaign,
  COALESCE(utm_term, '') as utm_term,
  COALESCE(utm_content, '') as utm_content,
  COALESCE(marketing_campaign_link_id, '') as marketing_campaign_link_id
FROM user_data
ORDER BY first_access DESC;
  \`

  console.log('SQL 쿼리 실행 중...\\n')
  
  const { data, error } = await admin.rpc('exec_sql', { query: sqlQuery })
  
  if (error) {
    // RPC가 없으면 직접 쿼리 실행
    const { data: result, error: queryError } = await admin
      .from('webinar_user_sessions')
      .select('*')
      .limit(0) // 실제로는 SQL을 직접 실행할 수 없으므로, 다른 방법 사용
    
    console.error('SQL 실행 오류:', error || queryError)
    console.log('\\nMCP execute_sql 도구를 사용하여 직접 실행하세요.')
    return
  }

  const users = data || []
  console.log(\`조회된 사용자 수: \${users.length}명\\n\`)

  if (users.length === 0) {
    console.log('오늘 접속한 사용자가 없습니다.')
    return
  }

  // CSV 헤더 생성
  const headers = [
    '고유값',
    '이메일',
    '이름',
    '회사명',
    '직책',
    '전화번호',
    '역할',
    '등록일시',
    '등록출처',
    '마지막로그인',
    '오늘첫접속일시',
    '완료번호',
    '확인코드',
    'UTM_Source',
    'UTM_Medium',
    'UTM_Campaign',
    'UTM_Term',
    'UTM_Content',
    '마케팅캠페인링크ID',
  ]

  // CSV 데이터 생성
  const csvRows = users.map((u: any) => {
    return [
      escapeCsv(u.user_id),
      escapeCsv(u.email),
      escapeCsv(u.name),
      escapeCsv(u.company),
      escapeCsv(u.position),
      escapeCsv(u.phone),
      escapeCsv(u.role),
      escapeCsv(formatDate(u.registered_at)),
      escapeCsv(u.registered_via),
      escapeCsv(formatDate(u.last_login_at)),
      escapeCsv(formatDate(u.first_access)),
      escapeCsv(u.survey_no),
      escapeCsv(u.code6),
      escapeCsv(u.utm_source),
      escapeCsv(u.utm_medium),
      escapeCsv(u.utm_campaign),
      escapeCsv(u.utm_term),
      escapeCsv(u.utm_content),
      escapeCsv(u.marketing_campaign_link_id),
    ].join(',')
  })

  const csvHeader = headers.join(',') + '\\n'
  const csvContent = csvHeader + csvRows.join('\\n')

  // 파일 저장
  const outputDir = path.join(process.cwd(), 'exports')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = kstNow.getUTCFullYear()
  const month = kstNow.getUTCMonth()
  const date = kstNow.getUTCDate()

  const filename = \`webinar-${WEBINAR_ID}-access-\${year}\${String(month + 1).padStart(2, '0')}\${String(date).padStart(2, '0')}-all.csv\`
  const filepath = path.join(outputDir, filename)

  fs.writeFileSync(filepath, '\\uFEFF' + csvContent, 'utf8')

  console.log('=== 내보내기 완료 ===')
  console.log(\`파일 경로: \${filepath}\`)
  console.log(\`총 \${users.length}명의 사용자 정보가 저장되었습니다.\`)
}

exportAccessUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('내보내기 중 오류 발생:', error)
    process.exit(1)
  })
  `

  // 쿼리 파일 저장
  const queryDir = path.join(process.cwd(), 'scripts', 'queries')
  if (!fs.existsSync(queryDir)) {
    fs.mkdirSync(queryDir, { recursive: true })
  }

  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = kstNow.getUTCFullYear()
  const month = kstNow.getUTCMonth()
  const date = kstNow.getUTCDate()

  const queryFile = path.join(queryDir, `export-149402-${year}${String(month + 1).padStart(2, '0')}${String(date).padStart(2, '0')}-all.sql`)
  fs.writeFileSync(queryFile, sqlQuery, 'utf8')

  const scriptFile = path.join(process.cwd(), 'scripts', `export-149402-access-users-exec-mcp.ts`)
  fs.writeFileSync(scriptFile, nodeScript, 'utf8')

  console.log('SQL 쿼리 파일 저장됨:')
  console.log(`  ${queryFile}\n`)
  console.log('실행 스크립트 파일 저장됨:')
  console.log(`  ${scriptFile}\n`)
  console.log('실행 방법:')
  console.log(`  1. MCP execute_sql 도구로 쿼리 실행: ${queryFile}`)
  console.log(`  2. 또는 스크립트 실행: npx tsx ${scriptFile}`)
}

exportAccessUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 중 오류 발생:', error)
    process.exit(1)
  })
