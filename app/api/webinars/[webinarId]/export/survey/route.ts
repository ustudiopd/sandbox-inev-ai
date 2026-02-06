import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'

export const runtime = 'nodejs'

/**
 * 설문조사 CSV 다운로드 (제출한 사람만)
 * GET /api/webinars/[webinarId]/export/survey
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
    
    // 웨비나에 연결된 설문조사 폼 찾기
    // 1. forms 테이블에서 webinar_id로 조회
    const { data: forms, error: formsError } = await admin
      .from('forms')
      .select('id, kind, title')
      .eq('webinar_id', webinarId)
      .eq('kind', 'survey')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (formsError) {
      return NextResponse.json(
        { success: false, error: formsError.message },
        { status: 500 }
      )
    }
    
    if (!forms || forms.length === 0) {
      return NextResponse.json(
        { success: false, error: '이 웨비나에 연결된 설문조사가 없습니다.' },
        { status: 404 }
      )
    }
    
    const form = forms[0]
    
    // 설문 문항 조회
    const { data: questions, error: questionsError } = await admin
      .from('form_questions')
      .select('id, order_no, body, type, options')
      .eq('form_id', form.id)
      .order('order_no', { ascending: true })
    
    if (questionsError) {
      return NextResponse.json(
        { success: false, error: questionsError.message },
        { status: 500 }
      )
    }
    
    const questionsList = questions || []
    
    if (questionsList.length === 0) {
      return NextResponse.json(
        { success: false, error: '설문 문항이 없습니다.' },
        { status: 404 }
      )
    }
    
    // 설문 제출한 사람만 조회 (form_submissions)
    const { data: submissions, error: submissionsError } = await admin
      .from('form_submissions')
      .select('id, participant_id, submitted_at')
      .eq('form_id', form.id)
      .not('participant_id', 'is', null)
      .order('submitted_at', { ascending: false })
    
    if (submissionsError) {
      return NextResponse.json(
        { success: false, error: submissionsError.message },
        { status: 500 }
      )
    }
    
    const submissionsList = submissions || []
    
    if (submissionsList.length === 0) {
      return NextResponse.json(
        { success: false, error: '설문을 제출한 사람이 없습니다.' },
        { status: 404 }
      )
    }
    
    // 사용자 ID 수집
    const userIds = [...new Set(submissionsList.map((s: any) => s.participant_id).filter(Boolean))]
    
    // 프로필 정보 조회
    const profilesMap = new Map()
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, email, last_login_at')
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
    
    // 답변 조회
    const submissionIds = submissionsList.map((s: any) => s.id)
    const { data: answers, error: answersError } = await admin
      .from('form_answers')
      .select('submission_id, question_id, choice_ids, text_answer')
      .in('submission_id', submissionIds)
    
    if (answersError) {
      return NextResponse.json(
        { success: false, error: answersError.message },
        { status: 500 }
      )
    }
    
    // submission_id별 답변 그룹화
    const answersBySubmission = new Map<string, Map<string, any>>()
    submissionsList.forEach((s: any) => {
      answersBySubmission.set(s.id, new Map())
    })
    
    if (answers) {
      answers.forEach((a: any) => {
        const submissionAnswers = answersBySubmission.get(a.submission_id)
        if (submissionAnswers) {
          submissionAnswers.set(a.question_id, a)
        }
      })
    }
    
    // CSV 헤더 생성
    const baseHeaders = [
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
      '제출일시',
    ]
    
    const utmHeaders = [
      'UTM_Source',
      'UTM_Medium',
      'UTM_Campaign',
      'UTM_Term',
      'UTM_Content',
      '마케팅캠페인링크ID',
    ]
    
    // 문항별 헤더 추가
    const questionHeaders = questionsList.map((q: any) => `문항 ${q.order_no}: ${q.body}`)
    
    const headers = [...baseHeaders, ...utmHeaders, ...questionHeaders]
    
    // CSV 데이터 생성
    const csvRows = submissionsList.map((submission: any) => {
      const userId = submission.participant_id
      const profile = profilesMap.get(userId) || {}
      const email = profile.email || ''
      const emailLower = email.toLowerCase().trim()
      
      let registration = null
      let registrationEntry = null
      
      if (webinar.registration_campaign_id) {
        registrationEntry = registrationEntriesMap.get(emailLower)
      } else {
        registration = registrationsMap.get(userId)
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
      const lastLogin = profile.last_login_at || ''
      const submittedAt = submission.submitted_at || ''
      
      const utmSource = registrationEntry?.utm_source || ''
      const utmMedium = registrationEntry?.utm_medium || ''
      const utmCampaign = registrationEntry?.utm_campaign || ''
      const utmTerm = registrationEntry?.utm_term || ''
      const utmContent = registrationEntry?.utm_content || ''
      const marketingCampaignLinkId = registrationEntry?.marketing_campaign_link_id || ''
      
      // 답변 가져오기
      const submissionAnswers = answersBySubmission.get(submission.id) || new Map()
      
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
      
      // 선택형 답변 포맷팅
      const formatChoiceAnswer = (choiceIds: any, options: any): string => {
        if (!choiceIds || !Array.isArray(choiceIds) || choiceIds.length === 0) {
          return ''
        }
        
        let optionsArray: any[] = []
        if (typeof options === 'string') {
          try {
            optionsArray = JSON.parse(options)
          } catch {
            return choiceIds.join(', ')
          }
        } else if (Array.isArray(options)) {
          optionsArray = options
        } else {
          return choiceIds.join(', ')
        }
        
        const optionMap = new Map(optionsArray.map((opt: any) => [String(opt.id || opt), opt.text || opt]))
        const answerTexts = choiceIds.map((id: string) => optionMap.get(String(id)) || id)
        return answerTexts.join(', ')
      }
      
      // 기본 정보 행
      const row = [
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
        escapeCsv(formatDate(submittedAt)),
        escapeCsv(utmSource),
        escapeCsv(utmMedium),
        escapeCsv(utmCampaign),
        escapeCsv(utmTerm),
        escapeCsv(utmContent),
        escapeCsv(marketingCampaignLinkId),
      ]
      
      // 문항별 답변 추가
      questionsList.forEach((q: any) => {
        const answer = submissionAnswers.get(q.id)
        let answerText = ''
        
        if (answer) {
          if (q.type === 'text') {
            answerText = answer.text_answer || ''
          } else if (q.type === 'single' || q.type === 'multiple') {
            answerText = formatChoiceAnswer(answer.choice_ids, q.options)
          }
        }
        
        row.push(escapeCsv(answerText))
      })
      
      return row.join(',')
    })
    
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n')
    
    // 파일명 생성 (한국 시간 기준)
    const now = new Date()
    const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const dateStr = kstNow.toISOString().split('T')[0].replace(/-/g, '')
    const filename = `webinar-${webinarId}-survey-${dateStr}.csv`
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[Survey Export] 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || '설문조사 내보내기 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
