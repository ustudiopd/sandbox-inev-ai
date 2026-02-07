/**
 * 웨비나 149402 오늘 1시-4시 접속자 이메일/이름/고유값 CSV 내보내기 (MCP 사용)
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

  // MCP를 통해 웨비나 정보 확인
  const webinarQuery = `
    SELECT id, slug, title 
    FROM webinars 
    WHERE id::text = '${WEBINAR_ID}' OR slug = '${WEBINAR_ID}' 
    LIMIT 1;
  `
  
  console.log('웨비나 정보 조회 중...')
  const webinarResult = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN || ''}`
    },
    body: JSON.stringify({ query: webinarQuery })
  }).catch(() => null)

  // MCP 도구를 직접 사용할 수 없으므로, 스크립트를 실행하는 방식으로 변경
  // 대신 SQL 쿼리를 생성하여 사용자가 직접 실행할 수 있도록 하거나,
  // 환경 변수에서 Supabase 클라이언트를 사용하는 방식으로 변경
  
  console.log('\n⚠️  MCP를 통한 직접 실행은 제한이 있습니다.')
  console.log('대신 SQL 쿼리를 생성하여 제공하겠습니다.\n')
  
  // SQL 쿼리 생성
  const sqlQuery = `
-- 웨비나 149402 오늘 1시-4시 접속자 조회 및 CSV 생성용 쿼리
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
  SELECT DISTINCT ON (wus.user_id)
    wus.user_id,
    MIN(wus.entered_at) AS first_entered_at
  FROM webinar_user_sessions wus
  CROSS JOIN webinar_info wi
  CROSS JOIN time_range tr
  WHERE wus.webinar_id = wi.id
    AND wus.entered_at >= tr.start_time
    AND wus.entered_at < tr.end_time
    AND wus.user_id IS NOT NULL
  GROUP BY wus.user_id
)
SELECT 
  p.id AS 고유값,
  COALESCE(r.nickname, p.nickname, p.display_name, p.email, '익명') AS 이름,
  COALESCE(p.email, '') AS 이메일
FROM access_sessions a
INNER JOIN profiles p ON p.id = a.user_id
LEFT JOIN registrations r ON r.user_id = a.user_id AND r.webinar_id = (SELECT id FROM webinar_info)
ORDER BY p.email;
  `

  // 쿼리를 파일로 저장
  const queryDir = path.join(process.cwd(), 'scripts', 'queries')
  if (!fs.existsSync(queryDir)) {
    fs.mkdirSync(queryDir, { recursive: true })
  }
  
  const queryFile = path.join(queryDir, `export-149402-${year}${String(month + 1).padStart(2, '0')}${String(date).padStart(2, '0')}-01-04.sql`)
  fs.writeFileSync(queryFile, sqlQuery, 'utf8')
  
  console.log('SQL 쿼리가 생성되었습니다:')
  console.log(`파일 경로: ${queryFile}\n`)
  
  console.log('이 쿼리를 Supabase MCP 또는 SQL 에디터에서 실행하세요.')
  console.log('결과를 CSV로 내보내려면 다음 스크립트를 사용하세요:\n')
  
  // Node.js 스크립트 생성 (Supabase 클라이언트 사용)
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

const WEBINAR_ID = '${WEBINAR_ID}'
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function toKST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

function getKSTDate(year: number, month: number, date: number, hour: number, minute: number = 0): Date {
  const kstDate = new Date(Date.UTC(year, month, date, hour, minute, 0))
  return new Date(kstDate.getTime() - KST_OFFSET_MS)
}

async function exportAccessUsers() {
  console.log('=== 웨비나 접속자 내보내기 ===\\n')
  console.log(\`웨비나 ID: \${WEBINAR_ID}\`)

  const now = new Date()
  const kstNow = toKST(now)
  const year = kstNow.getUTCFullYear()
  const month = kstNow.getUTCMonth()
  const date = kstNow.getUTCDate()

  const startTime = getKSTDate(year, month, date, 1, 0)
  const endTime = getKSTDate(year, month, date, 4, 0)

  console.log(\`시간 범위 (KST): \${startTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} ~ \${endTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\\n\`)

  // 웨비나 정보 확인
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, title')
    .or(\`id.eq.\${WEBINAR_ID},slug.eq.\${WEBINAR_ID}\`)
    .single()

  if (webinarError || !webinar) {
    console.error('웨비나를 찾을 수 없습니다:', webinarError)
    return
  }

  console.log(\`웨비나: \${webinar.title} (\${webinar.slug})\\n\`)

  // 해당 시간 범위에 접속한 세션 조회
  const { data: sessions, error: sessionsError } = await admin
    .from('webinar_user_sessions')
    .select('user_id, entered_at, exited_at')
    .eq('webinar_id', webinar.id)
    .gte('entered_at', startTime.toISOString())
    .lt('entered_at', endTime.toISOString())
    .not('user_id', 'is', null)

  if (sessionsError) {
    console.error('접속 기록 조회 실패:', sessionsError)
    return
  }

  const sessionsList = sessions || []
  console.log(\`총 접속 세션 수: \${sessionsList.length}개\`)

  if (sessionsList.length === 0) {
    console.log('해당 시간 범위에 접속한 사용자가 없습니다.')
    return
  }

  // 고유 user_id 추출
  const uniqueUserIds = [...new Set(sessionsList.map(s => s.user_id).filter(Boolean))]
  console.log(\`고유 사용자 수: \${uniqueUserIds.length}명\\n\`)

  if (uniqueUserIds.length === 0) {
    console.log('접속한 사용자가 없습니다.')
    return
  }

  // 프로필 정보 조회
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, email, display_name, nickname')
    .in('id', uniqueUserIds)

  if (profilesError) {
    console.error('프로필 조회 실패:', profilesError)
    return
  }

  // 웨비나 등록 정보 조회
  const { data: registrations, error: registrationsError } = await admin
    .from('registrations')
    .select('user_id, nickname')
    .eq('webinar_id', webinar.id)
    .in('user_id', uniqueUserIds)

  if (registrationsError) {
    console.error('등록 정보 조회 실패:', registrationsError)
    return
  }

  // 프로필과 등록 정보를 Map으로 변환
  const profilesMap = new Map(
    (profiles || []).map((p: any) => [p.id, p])
  )
  const registrationsMap = new Map(
    (registrations || []).map((r: any) => [r.user_id, r])
  )

  // 사용자 정보 수집
  const users: Array<{ 고유값: string; email: string; name: string }> = []

  uniqueUserIds.forEach((userId) => {
    const profile = profilesMap.get(userId)
    const registration = registrationsMap.get(userId)

    if (!profile) {
      return
    }

    // 이름 결정: registrations.nickname > profiles.nickname > display_name > email
    let name = '익명'
    if (registration?.nickname) {
      name = registration.nickname
    } else if (profile.nickname) {
      name = profile.nickname
    } else if (profile.display_name) {
      name = profile.display_name
    } else if (profile.email) {
      name = profile.email
    }

    const email = profile.email || ''

    users.push({ 고유값: userId, email, name })
  })

  console.log(\`수집된 사용자 수: \${users.length}명\\n\`)

  // CSV 생성
  const csvHeader = '고유값,이메일,이름\\n'
  const csvRows = users.map(u => {
    const escapeCsv = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
        return \`"\${str.replace(/"/g, '""')}"\`
      }
      return str
    }
    return \`\${escapeCsv(u.고유값)},\${escapeCsv(u.email)},\${escapeCsv(u.name)}\`
  }).join('\\n')

  const csvContent = csvHeader + csvRows

  // 파일 저장
  const outputDir = path.join(process.cwd(), 'exports')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = \`webinar-\${WEBINAR_ID}-access-\${year}\${String(month + 1).padStart(2, '0')}\${String(date).padStart(2, '0')}-01-04.csv\`
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
  
  const scriptFile = path.join(process.cwd(), 'scripts', `export-149402-access-users-exec.ts`)
  fs.writeFileSync(scriptFile, nodeScript, 'utf8')
  
  console.log('실행 스크립트가 생성되었습니다:')
  console.log(`파일 경로: ${scriptFile}`)
  console.log('\n실행 방법:')
  console.log(`  npx tsx ${scriptFile}`)
}

exportAccessUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 생성 중 오류 발생:', error)
    process.exit(1)
  })
