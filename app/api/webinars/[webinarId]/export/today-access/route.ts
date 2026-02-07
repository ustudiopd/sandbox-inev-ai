import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'

export const runtime = 'nodejs'

/**
 * 오늘 접속자 CSV 다운로드
 * GET /api/webinars/[webinarId]/export/today-access
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    
    // 권한 확인
    const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
    if (!hasPermission || !webinar) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 오늘 날짜 계산 (한국 시간 기준) - 올바른 방법
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000
    
    /** UTC 시각을 KST(UTC+9)로 해석한 Date. getUTCHours() 등이 KST 값이 됨. */
    const toKST = (utcDate: Date): Date => {
      return new Date(utcDate.getTime() + KST_OFFSET_MS)
    }
    
    /** KST 기준으로 오늘 날짜의 특정 시간(시, 분)을 UTC Date로 반환 */
    const getKSTDate = (year: number, month: number, date: number, hour: number, minute: number = 0): Date => {
      // KST 시간을 UTC로 변환 (9시간 빼기)
      const kstDate = new Date(Date.UTC(year, month, date, hour, minute, 0))
      return new Date(kstDate.getTime() - KST_OFFSET_MS)
    }
    
    const now = new Date()
    const kstNow = toKST(now)
    const year = kstNow.getUTCFullYear()
    const month = kstNow.getUTCMonth()
    const date = kstNow.getUTCDate()
    
    // 오늘 00:00:00 ~ 23:59:59 (KST)를 UTC로 변환
    const todayStartUTC = getKSTDate(year, month, date, 0, 0)
    // 23:59:59는 다음날 00:00:00 전까지로 처리
    const todayEndUTC = getKSTDate(year, month, date + 1, 0, 0)
    
    // 실제 웨비나 UUID 사용 (slug가 아닌)
    const actualWebinarId = webinar.id
    
    // 오늘 접속한 세션 조회 (KST 기준으로 오늘 00:00 ~ 23:59:59)
    const { data: sessions, error: sessionsError } = await admin
      .from('webinar_user_sessions')
      .select('user_id, entered_at, exited_at')
      .eq('webinar_id', actualWebinarId)
      .gte('entered_at', todayStartUTC.toISOString())
      .lt('entered_at', getKSTDate(year, month, date + 1, 0, 0).toISOString()) // 다음날 00:00 전까지
      .not('user_id', 'is', null)
      .order('entered_at', { ascending: false })
    
    if (sessionsError) {
      return NextResponse.json(
        { success: false, error: sessionsError.message },
        { status: 500 }
      )
    }
    
    const sessionsList = sessions || []
    
    if (sessionsList.length === 0) {
      return NextResponse.json(
        { success: false, error: '오늘 접속한 사용자가 없습니다.' },
        { status: 404 }
      )
    }
    
    // 고유 user_id 추출
    const uniqueUserIds = [...new Set(sessionsList.map((s: any) => s.user_id).filter(Boolean))]
    
    // 프로필 정보 조회 (배치로 처리하여 모든 사용자 정보 가져오기)
    const profilesMap = new Map()
    if (uniqueUserIds.length > 0) {
      // 배치 크기로 나누어 조회 (Supabase IN 쿼리 제한 고려)
      const BATCH_SIZE = 1000
      for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
        const batch = uniqueUserIds.slice(i, i + BATCH_SIZE)
        const { data: profiles, error: profilesError } = await admin
          .from('profiles')
          .select('id, display_name, email, nickname, last_seen_at')
          .in('id', batch)
        
        if (profilesError) {
          console.error('[Today Access Export] 프로필 조회 오류:', profilesError)
        }
        
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap.set(p.id, p)
          })
        }
      }
      
      console.log(`[Today Access Export] 프로필 조회 완료: ${profilesMap.size}명 / ${uniqueUserIds.length}명`)
    }
    
    // 등록 정보 조회 (registration_campaign_id가 있으면 event_survey_entries, 없으면 registrations)
    const registrationsMap = new Map()
    const registrationEntriesMap = new Map()
    
    if (webinar.registration_campaign_id) {
      // event_survey_entries에서 모든 entries를 가져온 후 이메일로 매칭 (설문조사 export와 동일한 방식)
      const { data: allEntries } = await admin
        .from('event_survey_entries')
        .select('registration_data, survey_no, code6, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, completed_at, created_at')
        .eq('campaign_id', webinar.registration_campaign_id)
      
      if (allEntries) {
        allEntries.forEach((entry: any) => {
          const entryEmail = entry.registration_data?.email
          if (entryEmail) {
            const normalizedEmail = entryEmail.toLowerCase().trim()
            registrationEntriesMap.set(normalizedEmail, entry)
          }
        })
      }
      
      const emails = Array.from(profilesMap.values())
        .map((p: any) => p.email)
        .filter(Boolean)
      
      console.log(`[Today Access Export] 등록 정보 매칭 완료: ${registrationEntriesMap.size}개 entries / ${emails.length}개 이메일`)
    } else {
      // registrations 테이블 조회 (배치로 처리)
      const BATCH_SIZE = 1000
      for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
        const batch = uniqueUserIds.slice(i, i + BATCH_SIZE)
        const { data: registrations } = await admin
          .from('registrations')
          .select('user_id, nickname, role, registered_via, created_at, registration_data, survey_no, code6')
          .eq('webinar_id', actualWebinarId)
          .in('user_id', batch)
        
        if (registrations) {
          registrations.forEach((r: any) => {
            registrationsMap.set(r.user_id, r)
          })
        }
      }
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
      '완료번호',
      '확인코드',
      '이름',
      '이메일',
      '회사명',
      '직책',
      '전화번호',
      '역할',
      '등록일시',
      '등록출처',
      '마지막로그인',
      '오늘첫접속일시',
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
      const emailLower = email.toLowerCase().trim()
      
      let registration = null
      let registrationEntry = null
      
      if (webinar.registration_campaign_id) {
        // 이메일로 매칭 (설문/QnA와 동일한 방식)
        registrationEntry = registrationEntriesMap.get(emailLower)
      } else {
        registration = registrationsMap.get(userId)
      }
      
      const regData = registration?.registration_data || registrationEntry?.registration_data || {}
      
      // 이름 결정: registrations.nickname > registration_data.name > profiles.display_name > email (설문/QnA와 동일)
      const name = registration?.nickname || regData?.name || profile.display_name || email || '익명'
      const company = regData?.company || regData?.organization || ''
      const position = regData?.position || regData?.jobTitle || ''
      const phone = regData?.phone || regData?.phone_norm || ''
      const role = registration?.role || '참가자'
      const registeredVia = registration?.registered_via || (registrationEntry ? '등록 페이지' : '')
      const registeredAt = registration?.created_at || registrationEntry?.completed_at || registrationEntry?.created_at || ''
      const surveyNo = registration?.survey_no || registrationEntry?.survey_no || ''
      const code6 = registration?.code6 || registrationEntry?.code6 || ''
      const lastLogin = profile.last_seen_at || ''
      const firstAccess = userFirstAccessMap.get(userId) || ''
      
      const utmSource = registrationEntry?.utm_source || ''
      const utmMedium = registrationEntry?.utm_medium || ''
      const utmCampaign = registrationEntry?.utm_campaign || ''
      const utmTerm = registrationEntry?.utm_term || ''
      const utmContent = registrationEntry?.utm_content || ''
      const marketingCampaignLinkId = registrationEntry?.marketing_campaign_link_id || ''
      
      // CSV 이스케이프 처리
      const escapeCsv = (value: any): string => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }
      
      // 날짜 포맷팅 (KST)
      const formatDate = (dateStr: string | null): string => {
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
      
      return [
        escapeCsv(surveyNo),
        escapeCsv(code6),
        escapeCsv(name),
        escapeCsv(email),
        escapeCsv(company),
        escapeCsv(position),
        escapeCsv(phone),
        escapeCsv(role),
        escapeCsv(formatDate(registeredAt)),
        escapeCsv(registeredVia),
        escapeCsv(formatDate(lastLogin)),
        escapeCsv(formatDate(firstAccess)),
        escapeCsv(utmSource),
        escapeCsv(utmMedium),
        escapeCsv(utmCampaign),
        escapeCsv(utmTerm),
        escapeCsv(utmContent),
        escapeCsv(marketingCampaignLinkId),
      ].join(',')
    })
    
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n')
    
    // 통계 로그
    const statsInfo = {
      totalUsers: uniqueUserIds.length,
      profilesFound: profilesMap.size,
      registrationsFound: registrationsMap.size,
      entriesFound: registrationEntriesMap.size,
      hasRegistrationCampaign: !!webinar.registration_campaign_id,
    }
    console.log('[Today Access Export] CSV 생성 완료:', statsInfo)
    
    // 파일명 생성 (한국 시간 기준)
    const dateStr = `${year}${String(month + 1).padStart(2, '0')}${String(date).padStart(2, '0')}`
    const filename = `webinar-${actualWebinarId}-today-access-${dateStr}.csv`
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[Today Access Export] 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || '오늘 접속자 내보내기 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
