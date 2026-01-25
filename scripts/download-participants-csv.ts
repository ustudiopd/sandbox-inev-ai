/**
 * 참여자 정보 및 입력폼 전체 데이터를 CSV로 다운로드하는 스크립트
 * 
 * 사용법:
 * npm run ts-node scripts/download-participants-csv.ts [campaignId 또는 dashboardCode]
 * 
 * 예시:
 * npm run ts-node scripts/download-participants-csv.ts bef33b11-fe0f-4361-a1c9-cbb966f14e12
 * npm run ts-node scripts/download-participants-csv.ts HNC4UU
 */

import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

// CSV 헤더 및 데이터 생성 함수
function createCSV(entries: any[], questions: any[] = []): string {
  // 기본 헤더
  const baseHeaders = [
    '순번',
    '확인코드',
    '이름',
    '회사명',
    '직급',
    '전화번호',
    '이메일',
    '완료일시',
    '스캔일시',
    '경품명',
  ]
  
  // 문항별 헤더 추가
  const questionHeaders = questions
    .sort((a: any, b: any) => a.order_no - b.order_no)
    .map((q: any) => `문항 ${q.order_no}: ${q.body}`)
  
  const headers = [...baseHeaders, ...questionHeaders]
  
  // CSV 데이터 행 생성
  const rows = entries.map((entry: any) => {
    // registration_data에서 이메일과 직급 추출
    const email = entry.registration_data?.email || ''
    const jobTitle = entry.registration_data?.jobTitle || ''
    
    const baseRow = [
      entry.survey_no || '',
      entry.code6 || '',
      entry.name || '',
      entry.company || '',
      jobTitle,
      entry.phone_norm || '',
      email,
      entry.completed_at ? new Date(entry.completed_at).toLocaleString('ko-KR') : '',
      entry.verified_at ? new Date(entry.verified_at).toLocaleString('ko-KR') : '',
      entry.prize_label || '',
    ]
    
    // 문항별 답변 추가
    if (entry.answers && Array.isArray(entry.answers)) {
      const answerMap = new Map(
        entry.answers.map((a: any) => [a.questionId, a.answer])
      )
      
      const answerRow = questions
        .sort((a: any, b: any) => a.order_no - b.order_no)
        .map((q: any) => answerMap.get(q.id) || '답변 없음')
      
      return [...baseRow, ...answerRow]
    }
    
    // answers가 없으면 빈 값으로 채움
    const emptyAnswers = questions.map(() => '답변 없음')
    return [...baseRow, ...emptyAnswers]
  })
  
  // CSV 내용 생성
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  // BOM 추가 (한글 깨짐 방지)
  return '\uFEFF' + csvContent
}

async function downloadParticipantsData(campaignIdOrCode?: string) {
  console.log('='.repeat(60))
  console.log('참여자 정보 및 입력폼 데이터 다운로드')
  console.log('='.repeat(60))
  
  const admin = createAdminSupabase()
  
  // campaignId 또는 dashboardCode로 캠페인 찾기
  let campaignId: string | null = null
  let campaignTitle: string = ''
  
  if (!campaignIdOrCode) {
    // 기본값 사용
    campaignIdOrCode = 'bef33b11-fe0f-4361-a1c9-cbb966f14e12'
  }
  
  console.log(`조회 대상: ${campaignIdOrCode}`)
  console.log('')
  
  try {
    // 1. 캠페인 조회 (campaignId 또는 dashboard_code로)
    console.log('1. 캠페인 정보 조회 중...')
    
    let campaign: any = null
    
    // UUID 형식인지 확인 (campaignId)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignIdOrCode)
    
    if (isUUID) {
      // campaignId로 조회
      const { data, error } = await admin
        .from('event_survey_campaigns')
        .select('id, title, form_id, dashboard_code')
        .eq('id', campaignIdOrCode)
        .single()
      
      if (error) {
        throw new Error(`캠페인 조회 실패: ${error.message}`)
      }
      
      campaign = data
    } else {
      // dashboard_code로 조회
      const { data, error } = await admin
        .from('event_survey_campaigns')
        .select('id, title, form_id, dashboard_code')
        .eq('dashboard_code', campaignIdOrCode.toUpperCase())
        .single()
      
      if (error) {
        throw new Error(`캠페인 조회 실패 (dashboard_code: ${campaignIdOrCode}): ${error.message}`)
      }
      
      campaign = data
    }
    
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다.')
    }
    
    campaignId = campaign.id
    campaignTitle = campaign.title || '알 수 없음'
    
    console.log(`   ✅ 캠페인 찾음: ${campaignTitle}`)
    console.log(`   - ID: ${campaignId}`)
    console.log(`   - Form ID: ${campaign.form_id || '(없음)'}`)
    console.log(`   - Dashboard Code: ${campaign.dashboard_code || '(없음)'}`)
    console.log('')
    
    // 2. 참여자 목록 조회 (registration_data 포함)
    console.log('2. 참여자 목록 조회 중...')
    const { data: entries, error: entriesError } = await admin
      .from('event_survey_entries')
      .select('*, registration_data')
      .eq('campaign_id', campaignId)
      .order('completed_at', { ascending: false })
    
    if (entriesError) {
      throw new Error(`참여자 목록 조회 실패: ${entriesError.message}`)
    }
    
    console.log(`   ✅ 참여자 ${entries?.length || 0}명 조회 완료`)
    console.log('')
    
    if (!entries || entries.length === 0) {
      console.log('⚠️  다운로드할 데이터가 없습니다.')
      return
    }
    
    // 3. 폼 문항 조회
    let questions: any[] = []
    if (campaign.form_id) {
      console.log('3. 입력폼 문항 정보 조회 중...')
      const { data: questionsData, error: questionsError } = await admin
        .from('form_questions')
        .select('*')
        .eq('form_id', campaign.form_id)
        .order('order_no', { ascending: true })
      
      if (questionsError) {
        console.warn(`   ⚠️  문항 조회 실패: ${questionsError.message}`)
      } else {
        questions = questionsData || []
        console.log(`   ✅ 문항 ${questions.length}개 조회 완료`)
        console.log('')
      }
    } else {
      console.log('3. 입력폼 문항 정보 없음 (form_id가 없습니다)')
      console.log('')
    }
    
    // 4. 답변 정보 조회 및 매핑
    let entriesWithAnswers: any[] = []
    
    if (questions.length > 0) {
      console.log('4. 답변 정보 조회 및 매핑 중...')
      
      // 모든 submission_id 수집
      const submissionIds = entries
        .map((e: any) => e.form_submission_id)
        .filter(Boolean)
      
      // 모든 답변 한 번에 조회
      let allAnswers: any[] = []
      if (submissionIds.length > 0) {
        const { data: answersData, error: answersError } = await admin
          .from('form_answers')
          .select('*')
          .in('submission_id', submissionIds)
        
        if (answersError) {
          console.warn(`   ⚠️  답변 조회 실패: ${answersError.message}`)
        } else {
          allAnswers = answersData || []
        }
      }
      
      // submission_id별로 답변 그룹화
      const answersBySubmission = new Map<string, any[]>()
      allAnswers.forEach((answer: any) => {
        if (!answersBySubmission.has(answer.submission_id)) {
          answersBySubmission.set(answer.submission_id, [])
        }
        answersBySubmission.get(answer.submission_id)!.push(answer)
      })
      
      // 각 참여자의 설문 답변 매핑
      entriesWithAnswers = entries.map((entry: any) => {
        if (!entry.form_submission_id || questions.length === 0) {
          return { ...entry, answers: [] }
        }
        
        const answers = answersBySubmission.get(entry.form_submission_id) || []
        if (answers.length === 0) {
          return { ...entry, answers: [] }
        }
        
        // 문항별 답변 매핑
        const answersMap = new Map(answers.map((a: any) => [a.question_id, a]))
        
        const detailedAnswers = questions.map((q: any) => {
          const answer = answersMap.get(q.id)
          const parsedOptions = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : []
          
          let displayAnswer = '답변 없음'
          if (answer) {
            if (q.type === 'text') {
              displayAnswer = answer.text_answer || '답변 없음'
            } else if (q.type === 'single' || q.type === 'multiple') {
              if (answer.choice_ids && Array.isArray(answer.choice_ids) && answer.choice_ids.length > 0) {
                displayAnswer = answer.choice_ids.map((choiceId: string) => {
                  const option = parsedOptions.find((opt: any) => (opt.id || opt) === choiceId)
                  return option ? (option.text || option) : choiceId
                }).join(', ')
              }
            }
          }
          
          return {
            questionId: q.id,
            questionBody: q.body,
            questionType: q.type,
            orderNo: q.order_no,
            answer: displayAnswer,
          }
        })
        
        return {
          ...entry,
          answers: detailedAnswers,
        }
      })
      
      console.log(`   ✅ 답변 매핑 완료 (${allAnswers.length}개 답변)`)
      console.log('')
    } else {
      entriesWithAnswers = entries.map((entry: any) => ({ ...entry, answers: [] }))
    }
    
    // 5. CSV 생성
    console.log('5. CSV 파일 생성 중...')
    const csvContent = createCSV(entriesWithAnswers, questions)
    
    // 파일 저장
    const timestamp = new Date().toISOString().split('T')[0]
    const safeTitle = campaignTitle.replace(/[^\w\s-]/g, '').substring(0, 30)
    const filename = `참여자정보_${safeTitle}_${timestamp}.csv`
    const filepath = path.join(process.cwd(), filename)
    
    fs.writeFileSync(filepath, csvContent, 'utf-8')
    
    console.log('')
    console.log('✅ CSV 파일 생성 완료!')
    console.log(`   파일명: ${filename}`)
    console.log(`   경로: ${filepath}`)
    console.log(`   참여자 수: ${entries.length}명`)
    console.log(`   문항 수: ${questions.length}개`)
    
  } catch (error: any) {
    console.error('')
    console.error('❌ 오류 발생:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  const campaignIdOrCode = process.argv[2]
  
  downloadParticipantsData(campaignIdOrCode)
    .then(() => {
      console.log('')
      console.log('작업 완료!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('예상치 못한 오류:', error)
      process.exit(1)
    })
}

export { downloadParticipantsData }
