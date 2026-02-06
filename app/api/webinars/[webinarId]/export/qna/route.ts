import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'

export const runtime = 'nodejs'

/**
 * QnA CSV 다운로드
 * GET /api/webinars/[webinarId]/export/qna
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
    
    // 모든 질문 조회
    const { data: questions, error: questionsError } = await admin
      .from('questions')
      .select(`
        id,
        user_id,
        content,
        status,
        created_at,
        answered_by,
        answered_at,
        answer
      `)
      .eq('webinar_id', webinarId)
      .neq('status', 'hidden')
      .order('created_at', { ascending: false })
    
    if (questionsError) {
      return NextResponse.json(
        { success: false, error: questionsError.message },
        { status: 500 }
      )
    }
    
    const questionsList = questions || []
    
    if (questionsList.length === 0) {
      return NextResponse.json(
        { success: false, error: '다운로드할 QnA 데이터가 없습니다.' },
        { status: 404 }
      )
    }
    
    // 사용자 ID 수집
    const userIds = [...new Set(questionsList.map((q: any) => q.user_id).filter(Boolean))]
    
    // 프로필 정보 조회
    const profilesMap = new Map()
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)
      
      if (profiles) {
        profiles.forEach((p: any) => {
          profilesMap.set(p.id, p)
        })
      }
    }
    
    // 등록 정보 조회 (registration_campaign_id가 있으면 event_survey_entries, 없으면 registrations)
    const registrationsMap = new Map()
    const registrationEntriesMap = new Map()
    
    if (webinar.registration_campaign_id) {
      // event_survey_entries에서 이메일로 매칭
      const emails = Array.from(profilesMap.values())
        .map((p: any) => p.email)
        .filter(Boolean)
      
      if (emails.length > 0) {
        const { data: entries } = await admin
          .from('event_survey_entries')
          .select('registration_data, survey_no, code6, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, completed_at, created_at')
          .eq('campaign_id', webinar.registration_campaign_id)
          .in('registration_data->>email', emails.map(e => e.toLowerCase()))
        
        if (entries) {
          entries.forEach((entry: any) => {
            const email = entry.registration_data?.email?.toLowerCase()?.trim()
            if (email) {
              registrationEntriesMap.set(email, entry)
            }
          })
        }
      }
    } else {
      // registrations 테이블 조회
      const { data: registrations } = await admin
        .from('registrations')
        .select('user_id, nickname, role, registered_via, created_at, registration_data, survey_no, code6')
        .eq('webinar_id', webinarId)
        .in('user_id', userIds)
      
      if (registrations) {
        registrations.forEach((r: any) => {
          registrationsMap.set(r.user_id, r)
        })
      }
    }
    
    // 마지막 로그인 정보 조회 (profiles의 last_login_at 또는 auth.users의 last_sign_in_at)
    const lastLoginMap = new Map()
    if (userIds.length > 0) {
      // profiles에서 last_login_at 조회
      const { data: profilesWithLogin } = await admin
        .from('profiles')
        .select('id, last_login_at')
        .in('id', userIds)
      
      if (profilesWithLogin) {
        profilesWithLogin.forEach((p: any) => {
          if (p.last_login_at) {
            lastLoginMap.set(p.id, p.last_login_at)
          }
        })
      }
    }
    
    // CSV 헤더 생성
    const headers = [
      '질문ID',
      '질문일시',
      '질문자이름',
      '질문자이메일',
      '질문내용',
      '답변여부',
      '답변일시',
      '답변내용',
      '상태',
      '완료번호',
      '확인코드',
      '회사명',
      '직책',
      '전화번호',
      '역할',
      '등록일시',
      '등록출처',
      '마지막로그인',
      'UTM_Source',
      'UTM_Medium',
      'UTM_Campaign',
      'UTM_Term',
      'UTM_Content',
      '마케팅캠페인링크ID',
    ]
    
    // CSV 데이터 생성
    const csvRows = questionsList.map((q: any) => {
      const profile = profilesMap.get(q.user_id) || {}
      const email = profile.email || ''
      const emailLower = email.toLowerCase().trim()
      
      let registration = null
      let registrationEntry = null
      
      if (webinar.registration_campaign_id) {
        registrationEntry = registrationEntriesMap.get(emailLower)
      } else {
        registration = registrationsMap.get(q.user_id)
      }
      
      const regData = registration?.registration_data || registrationEntry?.registration_data || {}
      const name = registration?.nickname || regData?.name || profile.display_name || email || '익명'
      const company = regData?.company || regData?.organization || ''
      const position = regData?.position || regData?.jobTitle || ''
      const phone = regData?.phone || regData?.phone_norm || ''
      const role = registration?.role || '참가자'
      const registeredVia = registration?.registered_via || registrationEntry ? '등록 페이지' : ''
      const registeredAt = registration?.created_at || registrationEntry?.completed_at || registrationEntry?.created_at || ''
      const surveyNo = registration?.survey_no || registrationEntry?.survey_no || ''
      const code6 = registration?.code6 || registrationEntry?.code6 || ''
      const lastLogin = lastLoginMap.get(q.user_id) || ''
      
      const utmSource = registrationEntry?.utm_source || ''
      const utmMedium = registrationEntry?.utm_medium || ''
      const utmCampaign = registrationEntry?.utm_campaign || ''
      const utmTerm = registrationEntry?.utm_term || ''
      const utmContent = registrationEntry?.utm_content || ''
      const marketingCampaignLinkId = registrationEntry?.marketing_campaign_link_id || ''
      
      const answered = q.status === 'answered' ? '답변완료' : '미답변'
      const answerDate = q.answered_at || ''
      const answerContent = q.answer || ''
      const status = q.status === 'answered' ? '답변완료' : q.status === 'pinned' ? '고정' : q.status === 'published' ? '공개' : '대기'
      
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
        escapeCsv(q.id),
        escapeCsv(formatDate(q.created_at)),
        escapeCsv(name),
        escapeCsv(email),
        escapeCsv(q.content),
        escapeCsv(answered),
        escapeCsv(formatDate(answerDate)),
        escapeCsv(answerContent),
        escapeCsv(status),
        escapeCsv(surveyNo),
        escapeCsv(code6),
        escapeCsv(company),
        escapeCsv(position),
        escapeCsv(phone),
        escapeCsv(role),
        escapeCsv(formatDate(registeredAt)),
        escapeCsv(registeredVia),
        escapeCsv(formatDate(lastLogin)),
        escapeCsv(utmSource),
        escapeCsv(utmMedium),
        escapeCsv(utmCampaign),
        escapeCsv(utmTerm),
        escapeCsv(utmContent),
        escapeCsv(marketingCampaignLinkId),
      ].join(',')
    })
    
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n')
    
    // 파일명 생성 (한국 시간 기준)
    const now = new Date()
    const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const dateStr = kstNow.toISOString().split('T')[0].replace(/-/g, '')
    const filename = `webinar-${webinarId}-qna-${dateStr}.csv`
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[QnA Export] 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'QnA 내보내기 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
