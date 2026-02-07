/**
 * 웨비나 149402 오늘 13시-16시 접속자 기본정보 CSV 내보내기
 * 
 * 이 스크립트는 MCP SQL 쿼리 결과를 받아서 기본정보가 포함된 CSV를 생성합니다.
 */

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

const WEBINAR_ID = '149402'
const WEBINAR_UUID = 'f257ce42-723a-4fad-a9a5-1bd8c154d7ce'
const CAMPAIGN_UUID = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** UTC 시각을 KST(UTC+9)로 해석한 Date. getUTCHours() 등이 KST 값이 됨. */
function toKST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

/** KST 기준으로 오늘 날짜의 특정 시간(시, 분)을 UTC Date로 반환 */
function getKSTDate(year: number, month: number, date: number, hour: number, minute: number = 0): Date {
  const kstDate = new Date(Date.UTC(year, month, date, hour, minute, 0))
  return new Date(kstDate.getTime() - KST_OFFSET_MS)
}

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
  console.log('=== 웨비나 149402 13시-16시 접속자 기본정보 내보내기 ===\n')

  // 오늘 날짜 (한국 시간 기준)
  const now = new Date()
  const kstNow = toKST(now)
  const year = kstNow.getUTCFullYear()
  const month = kstNow.getUTCMonth()
  const date = kstNow.getUTCDate()

  // 오늘 13시-16시 (한국 시간) - UTC로 변환하여 저장
  const startTime = getKSTDate(year, month, date, 13, 0)
  const endTime = getKSTDate(year, month, date, 16, 0)

  console.log(`시간 범위 (KST): ${startTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} ~ ${endTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`)

  // 해당 시간 범위에 접속한 세션 조회
  const { data: sessions, error: sessionsError } = await admin
    .from('webinar_user_sessions')
    .select('user_id, entered_at, exited_at')
    .eq('webinar_id', WEBINAR_UUID)
    .gte('entered_at', startTime.toISOString())
    .lt('entered_at', endTime.toISOString())
    .not('user_id', 'is', null)

  if (sessionsError) {
    console.error('접속 기록 조회 실패:', sessionsError)
    return
  }

  const sessionsList = sessions || []
  console.log(`총 접속 세션 수: ${sessionsList.length}개`)

  if (sessionsList.length === 0) {
    console.log('해당 시간 범위에 접속한 사용자가 없습니다.')
    return
  }

  // 고유 user_id 추출
  const uniqueUserIds = [...new Set(sessionsList.map(s => s.user_id).filter(Boolean))]
  console.log(`고유 사용자 수: ${uniqueUserIds.length}명\n`)

  // 프로필 정보 조회 (배치로 처리)
  const profilesMap = new Map()
  if (uniqueUserIds.length > 0) {
    const BATCH_SIZE = 1000
    for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
      const batch = uniqueUserIds.slice(i, i + BATCH_SIZE)
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, email, nickname, last_seen_at')
        .in('id', batch)

      if (profiles) {
        profiles.forEach((p: any) => {
          profilesMap.set(p.id, p)
        })
      }
    }
  }

  // 등록 정보 조회 (event_survey_entries)
  const registrationEntriesMap = new Map()
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('registration_data, survey_no, code6, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, completed_at, created_at')
    .eq('campaign_id', CAMPAIGN_UUID)

  if (allEntries) {
    // 프로필 이메일을 정규화하여 Map 생성
    const normalizedProfileEmails = new Map<string, string>()
    profilesMap.forEach((profile: any, userId: string) => {
      if (profile.email) {
        const normalizedEmail = profile.email.toLowerCase().trim()
        normalizedProfileEmails.set(normalizedEmail, userId)
      }
    })

    // 엔트리 이메일과 프로필 이메일을 정확하게 매칭
    allEntries.forEach((entry: any) => {
      const entryEmail = entry.registration_data?.email
      if (entryEmail) {
        const normalizedEntryEmail = entryEmail.toLowerCase().trim()
        const userId = normalizedProfileEmails.get(normalizedEntryEmail)
        if (userId) {
          registrationEntriesMap.set(userId, entry)
        }
      }
    })
  }

  // 사용자별 첫 접속 시간 계산
  const userFirstAccessMap = new Map()
  sessionsList.forEach((session: any) => {
    const userId = session.user_id
    if (!userFirstAccessMap.has(userId) || new Date(session.entered_at) < new Date(userFirstAccessMap.get(userId))) {
      userFirstAccessMap.set(userId, session.entered_at)
    }
  })

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
  const csvRows = uniqueUserIds.map((userId) => {
    const profile = profilesMap.get(userId) || {}
    const email = profile.email || ''

    let registrationEntry = registrationEntriesMap.get(userId)

    // 매칭이 안 되면 이메일로 다시 시도
    if (!registrationEntry && email && allEntries) {
      const emailLower = email.toLowerCase().trim()
      for (const entry of allEntries) {
        const entryEmail = entry.registration_data?.email?.toLowerCase()?.trim()
        if (entryEmail === emailLower) {
          registrationEntry = entry
          registrationEntriesMap.set(userId, entry)
          break
        }
      }
    }

    const regData = registrationEntry?.registration_data || {}

    // 이름 결정: registration_data.name > profiles.nickname > profiles.display_name > email > user_id 일부
    const regName = regData?.name || ''
    const name = regName || 
                 profile.nickname || 
                 profile.display_name || 
                 email || 
                 (userId ? `사용자_${userId.substring(0, 8)}` : '정보없음')
    
    const company = regData?.organization || regData?.company || ''
    const position = regData?.position || regData?.jobTitle || ''
    const phone = regData?.phone || regData?.phone_norm || ''
    const role = '참가자'
    const registeredVia = registrationEntry ? '등록 페이지' : ''
    const registeredAt = registrationEntry?.completed_at || registrationEntry?.created_at || ''
    const surveyNo = registrationEntry?.survey_no || ''
    const code6 = registrationEntry?.code6 || ''
    const lastLogin = profile.last_seen_at || ''
    const firstAccess = userFirstAccessMap.get(userId) || ''

    const utmSource = registrationEntry?.utm_source || ''
    const utmMedium = registrationEntry?.utm_medium || ''
    const utmCampaign = registrationEntry?.utm_campaign || ''
    const utmTerm = registrationEntry?.utm_term || ''
    const utmContent = registrationEntry?.utm_content || ''
    const marketingCampaignLinkId = registrationEntry?.marketing_campaign_link_id || ''

    return [
      escapeCsv(userId),
      escapeCsv(email),
      escapeCsv(name),
      escapeCsv(company),
      escapeCsv(position),
      escapeCsv(phone),
      escapeCsv(role),
      escapeCsv(formatDate(registeredAt)),
      escapeCsv(registeredVia),
      escapeCsv(formatDate(lastLogin)),
      escapeCsv(formatDate(firstAccess)),
      escapeCsv(surveyNo),
      escapeCsv(code6),
      escapeCsv(utmSource),
      escapeCsv(utmMedium),
      escapeCsv(utmCampaign),
      escapeCsv(utmTerm),
      escapeCsv(utmContent),
      escapeCsv(marketingCampaignLinkId),
    ].join(',')
  })

  console.log(`수집된 사용자 수: ${uniqueUserIds.length}명\n`)

  // CSV 생성
  const csvHeader = headers.join(',') + '\n'
  const csvContent = csvHeader + csvRows.join('\n')

  // 파일 저장
  const outputDir = path.join(process.cwd(), 'exports')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `webinar-149402-access-${year}${String(month + 1).padStart(2, '0')}${String(date).padStart(2, '0')}-13-16.csv`
  const filepath = path.join(outputDir, filename)

  fs.writeFileSync(filepath, '\uFEFF' + csvContent, 'utf8')

  console.log('=== 내보내기 완료 ===')
  console.log(`파일 경로: ${filepath}`)
  console.log(`총 ${uniqueUserIds.length}명의 사용자 정보가 저장되었습니다.`)
}

exportAccessUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('내보내기 중 오류 발생:', error)
    process.exit(1)
  })
