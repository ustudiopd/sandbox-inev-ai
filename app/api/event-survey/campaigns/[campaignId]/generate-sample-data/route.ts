import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 샘플 설문 데이터 생성 API
 * POST /api/event-survey/campaigns/[campaignId]/generate-sample-data
 * body: { count: 50, clearExisting: false } (optional)
 * - count: 생성할 샘플 데이터 개수 (default: 50)
 * - clearExisting: 기존 데이터 삭제 여부 (default: false)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const { count = 50, clearExisting = false } = await req.json()
    
    const admin = createAdminSupabase()
    
    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, form_id, next_survey_no, client_id, agency_id')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    if (!campaign.form_id) {
      return NextResponse.json(
        { error: 'Form not configured for this campaign' },
        { status: 400 }
      )
    }
    
    // 폼 문항 조회
    const { data: questions, error: questionsError } = await admin
      .from('form_questions')
      .select('*')
      .eq('form_id', campaign.form_id)
      .order('order_no', { ascending: true })
    
    if (questionsError) {
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      )
    }
    
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found in the form' },
        { status: 400 }
      )
    }
    
    // 샘플 이름 목록
    const sampleNames = [
      '김철수', '이영희', '박민수', '최지영', '정대현', '강수진', '윤성호', '임동욱',
      '한소영', '조현우', '오세훈', '신미경', '배준호', '류지은', '송태영', '윤서연',
      '김도현', '이수빈', '박준혁', '최예진', '정민재', '강하늘', '윤지훈', '임서윤',
      '한동욱', '조은지', '오민석', '신혜진', '배성민', '류나연', '송건우', '윤채원',
      '김현우', '이지아', '박성준', '최유진', '정태현', '강민지', '윤준서', '임수현',
      '한지훈', '조서아', '오동현', '신예은', '배민준', '류서연', '송지우', '윤도영',
      '김서준', '이하은', '박예준', '최지우'
    ]
    
    // 샘플 회사명 목록
    const sampleCompanies = [
      '삼성전자', 'LG전자', 'SK하이닉스', '네이버', '카카오', '현대자동차', '기아',
      '롯데', '신세계', 'CJ', '한화', '두산', '포스코', 'KT', 'SK텔레콤', 'LG유플러스',
      '아모레퍼시픽', '한진', '대한항공', '아시아나항공', 'GS', 'LS', '효성', '한진중공업',
      '현대중공업', '두산중공업', '한화솔루션', 'SK이노베이션', 'LG화학', '롯데케미칼'
    ]
    
    // code6 생성 함수
    const generateCode6 = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }
    
    // 전화번호 생성 함수
    const generatePhone = (): string => {
      const prefixes = ['010', '011', '016', '017', '018', '019']
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const middle = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
      const last = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
      return `${prefix}${middle}${last}`
    }
    
    // options 파싱 헬퍼 함수
    const parseOptions = (options: any): any[] => {
      if (!options) return []
      
      // 이미 배열인 경우
      if (Array.isArray(options)) {
        return options
      }
      
      // 문자열인 경우 JSON 파싱 시도
      if (typeof options === 'string') {
        try {
          const parsed = JSON.parse(options)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
      
      return []
    }
    
    // 선택지 ID 추출 함수
    const extractOptionIds = (options: any[]): string[] => {
      if (!Array.isArray(options) || options.length === 0) return []
      
      return options.map((opt: any) => {
        // 이미 문자열인 경우
        if (typeof opt === 'string') {
          return opt
        }
        // 객체인 경우 id 필드 사용
        if (typeof opt === 'object' && opt !== null) {
          return opt.id || String(opt)
        }
        return String(opt)
      }).filter(Boolean)
    }
    
    // 랜덤 선택지 답변 생성
    const generateAnswer = (question: any) => {
      if (question.type === 'text') {
        const textAnswers = [
          '네트워크 인프라 개선이 필요합니다.',
          '보안 강화가 시급합니다.',
          '클라우드 마이그레이션을 고려 중입니다.',
          '디지털 전환을 추진하고 있습니다.',
          'IT 인프라 최적화가 목표입니다.',
          '하이브리드 클라우드 구축을 검토 중입니다.',
          '엣지 컴퓨팅 도입을 계획하고 있습니다.',
          'AI/ML 인프라 구축을 준비 중입니다.',
          '데이터센터 현대화가 필요합니다.',
          '네트워크 자동화를 추진하고 있습니다.'
        ]
        return {
          choiceIds: null,
          textAnswer: textAnswers[Math.floor(Math.random() * textAnswers.length)]
        }
      } else if (question.type === 'single' || question.type === 'multiple') {
        // options 파싱
        const parsedOptions = parseOptions(question.options)
        const optionIds = extractOptionIds(parsedOptions)
        
        if (optionIds.length === 0) {
          console.warn(`Question ${question.id} (${question.body}) has no options`)
          return { choiceIds: null, textAnswer: null }
        }
        
        if (question.type === 'single') {
          // 단일 선택: 하나만 선택
          const selected = optionIds[Math.floor(Math.random() * optionIds.length)]
          return {
            choiceIds: [selected],
            textAnswer: null
          }
        } else {
          // 다중 선택: 1-3개 선택
          const numSelections = Math.floor(Math.random() * Math.min(3, optionIds.length)) + 1
          const shuffled = [...optionIds].sort(() => Math.random() - 0.5)
          return {
            choiceIds: shuffled.slice(0, numSelections),
            textAnswer: null
          }
        }
      }
      return { choiceIds: null, textAnswer: null }
    }
    
    // 기존 데이터 삭제 함수
    const deleteExistingData = async () => {
      // 관련된 form_answers 삭제
      const { data: existingEntries } = await admin
        .from('event_survey_entries')
        .select('form_submission_id')
        .eq('campaign_id', campaignId)
        .not('form_submission_id', 'is', null)
      
      const submissionIds = existingEntries?.map(e => e.form_submission_id).filter(Boolean) || []
      
      if (submissionIds.length > 0) {
        // form_answers 삭제
        await admin
          .from('form_answers')
          .delete()
          .in('submission_id', submissionIds)
        
        // form_submissions 삭제
        await admin
          .from('form_submissions')
          .delete()
          .in('id', submissionIds)
      }
      
      // event_survey_entries 삭제
      await admin
        .from('event_survey_entries')
        .delete()
        .eq('campaign_id', campaignId)
      
      // next_survey_no 초기화
      await admin
        .from('event_survey_campaigns')
        .update({ next_survey_no: 1 })
        .eq('id', campaignId)
    }
    
    // count가 0이면 삭제만 수행
    if (count === 0) {
      await deleteExistingData()
      return NextResponse.json({
        success: true,
        message: 'All survey data has been deleted',
        deleted: true
      })
    }
    
    // 기존 데이터 삭제 (요청 시)
    if (clearExisting) {
      await deleteExistingData()
      // 삭제 후 next_survey_no를 다시 조회
      const { data: updatedCampaign } = await admin
        .from('event_survey_campaigns')
        .select('next_survey_no')
        .eq('id', campaignId)
        .single()
      
      if (updatedCampaign) {
        campaign.next_survey_no = updatedCampaign.next_survey_no || 1
      }
    }
    
    const currentSurveyNo = campaign.next_survey_no || 1
    const entries: any[] = []
    const submissions: any[] = []
    const answers: any[] = []
    const usedCodes = new Set<string>()
    
    // 50개의 샘플 데이터 생성
    for (let i = 0; i < count; i++) {
      const surveyNo = currentSurveyNo + i
      
      // 고유한 code6 생성
      let code6 = ''
      let attempts = 0
      while (attempts < 100) {
        code6 = generateCode6()
        if (!usedCodes.has(code6)) {
          usedCodes.add(code6)
          break
        }
        attempts++
      }
      
      if (attempts >= 100) {
        return NextResponse.json(
          { error: 'Failed to generate unique codes' },
          { status: 500 }
        )
      }
      
      const name = sampleNames[i % sampleNames.length]
      const phone = generatePhone()
      const phoneNorm = phone.replace(/\D/g, '')
      const company = sampleCompanies[Math.floor(Math.random() * sampleCompanies.length)]
      
      // form_submission 생성
      const submissionId = crypto.randomUUID()
      submissions.push({
        id: submissionId,
        form_id: campaign.form_id,
        participant_id: null,
        submitted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // 최근 7일 내 랜덤
      })
      
      // event_survey_entry 생성 (스캔완료, 경품 기록 없이)
      entries.push({
        campaign_id: campaignId,
        survey_no: surveyNo,
        code6: code6,
        name: name,
        company: company || null,
        phone_norm: phoneNorm,
        form_submission_id: submissionId,
        consent_data: {
          consent1: Math.random() > 0.1, // 90% 동의
          consent2: Math.random() > 0.2, // 80% 동의
          consent3: Math.random() > 0.3, // 70% 동의
          consented_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        completed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      
      // 각 문항에 대한 답변 생성
      questions.forEach((question: any) => {
        const answer = generateAnswer(question)
        answers.push({
          form_id: campaign.form_id,
          question_id: question.id,
          participant_id: null,
          submission_id: submissionId,
          choice_ids: answer.choiceIds,
          text_answer: answer.textAnswer,
          answered_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      })
    }
    
    // 배치 삽입
    const { error: submissionError } = await admin
      .from('form_submissions')
      .insert(submissions)
    
    if (submissionError) {
      console.error('form_submissions 삽입 오류:', submissionError)
      return NextResponse.json(
        { error: 'Failed to create submissions: ' + submissionError.message },
        { status: 500 }
      )
    }
    
    const { error: answerError } = await admin
      .from('form_answers')
      .insert(answers)
    
    if (answerError) {
      console.error('form_answers 삽입 오류:', answerError)
      return NextResponse.json(
        { error: 'Failed to create answers: ' + answerError.message },
        { status: 500 }
      )
    }
    
    const { error: entryError } = await admin
      .from('event_survey_entries')
      .insert(entries)
    
    if (entryError) {
      console.error('event_survey_entries 삽입 오류:', entryError)
      return NextResponse.json(
        { error: 'Failed to create entries: ' + entryError.message },
        { status: 500 }
      )
    }
    
    // next_survey_no 업데이트
    const { error: updateError } = await admin
      .from('event_survey_campaigns')
      .update({ next_survey_no: currentSurveyNo + count })
      .eq('id', campaignId)
    
    if (updateError) {
      console.error('next_survey_no 업데이트 오류:', updateError)
      // 에러가 나도 데이터는 생성되었으므로 경고만
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${count} sample entries`,
      created: {
        entries: count,
        submissions: count,
        answers: count * questions.length
      }
    })
  } catch (error: any) {
    console.error('샘플 데이터 생성 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

