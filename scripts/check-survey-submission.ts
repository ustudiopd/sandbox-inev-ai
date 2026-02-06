/**
 * 설문 제출 기록 확인 스크립트
 * jubileo@naver.com의 설문 제출 기록 확인
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

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

const WEBINAR_SLUG = '149400'
const USER_EMAIL = 'jubileo@naver.com'

async function checkSurveySubmission() {
  console.log('=== 설문 제출 기록 확인 ===\n')
  console.log(`웨비나: ${WEBINAR_SLUG}`)
  console.log(`사용자 이메일: ${USER_EMAIL}\n`)

  // 웨비나 ID 조회
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, title')
    .eq('slug', WEBINAR_SLUG)
    .single()

  if (webinarError || !webinar) {
    console.error('웨비나를 찾을 수 없습니다:', webinarError)
    return
  }

  console.log(`웨비나 정보: ${webinar.title} (${webinar.id})\n`)

  // 사용자 프로필 조회
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', USER_EMAIL)
    .single()

  if (profileError || !profile) {
    console.error('사용자를 찾을 수 없습니다:', profileError)
    return
  }

  console.log(`사용자 정보:`)
  console.log(`  이름: ${profile.display_name || 'N/A'}`)
  console.log(`  이메일: ${profile.email}`)
  console.log(`  사용자 ID: ${profile.id}\n`)

  // 웨비나의 모든 폼 조회
  const { data: forms, error: formsError } = await admin
    .from('forms')
    .select('id, title, kind, status')
    .eq('webinar_id', webinar.id)
    .order('created_at', { ascending: false })

  if (formsError) {
    console.error('폼 조회 실패:', formsError)
    return
  }

  const formsList = forms || []
  console.log(`=== 웨비나 폼 목록: ${formsList.length}개 ===\n`)

  if (formsList.length === 0) {
    console.log('이 웨비나에는 폼이 없습니다.')
    return
  }

  // 각 폼별로 제출 기록 확인
  for (const form of formsList) {
    console.log(`\n[${form.title}] (${form.kind}, ${form.status})`)
    console.log(`  폼 ID: ${form.id}`)

    // 제출 기록 조회
    const { data: submissions, error: subError } = await admin
      .from('form_submissions')
      .select(`
        id,
        submitted_at,
        form_revision
      `)
      .eq('form_id', form.id)
      .eq('participant_id', profile.id)
      .order('submitted_at', { ascending: false })

    if (subError) {
      console.error(`  제출 기록 조회 실패:`, subError)
      continue
    }

    const submissionsList = submissions || []
    console.log(`  제출 횟수: ${submissionsList.length}회`)

    if (submissionsList.length > 0) {
      for (const sub of submissionsList) {
        const index = submissionsList.indexOf(sub) + 1
        console.log(`  [${index}] 제출 ID: ${sub.id}`)
        console.log(`      제출 시간: ${new Date(sub.submitted_at).toLocaleString('ko-KR')}`)
        if (sub.form_revision) {
          console.log(`      폼 버전: ${sub.form_revision}`)
        }

        // 답안 조회 (동기적으로 처리)
        const { data: answers, error: answersError } = await admin
          .from('form_answers')
          .select(`
            id,
            question_id,
            choice_ids,
            text_answer,
            answered_at
          `)
          .eq('submission_id', sub.id)
          .order('answered_at', { ascending: true })

        if (answersError) {
          console.log(`      답안 조회 오류: ${answersError.message}`)
        } else if (answers && answers.length > 0) {
          console.log(`      답안 개수: ${answers.length}개`)
          
          // 질문 정보도 함께 조회
          const questionIds = answers.map((a: any) => a.question_id)
          const { data: questions } = await admin
            .from('form_questions')
            .select('id, order_no, body, type')
            .in('id', questionIds)
          
          const questionsMap = new Map()
          if (questions) {
            questions.forEach((q: any) => {
              questionsMap.set(q.id, q)
            })
          }

          answers.forEach((ans: any, ansIndex: number) => {
            const question = questionsMap.get(ans.question_id)
            const qNum = question ? `Q${question.order_no}` : `질문 ${ansIndex + 1}`
            const qText = question ? question.body.substring(0, 30) + (question.body.length > 30 ? '...' : '') : '알 수 없음'
            
            console.log(`        [${ansIndex + 1}] ${qNum}: ${qText}`)
            if (ans.choice_ids && Array.isArray(ans.choice_ids) && ans.choice_ids.length > 0) {
              console.log(`            선택 답안: ${JSON.stringify(ans.choice_ids)}`)
            }
            if (ans.text_answer) {
              const textPreview = ans.text_answer.substring(0, 100)
              console.log(`            텍스트 답안: ${textPreview}${ans.text_answer.length > 100 ? '...' : ''}`)
            }
          })
        } else {
          console.log(`      답안: 없음`)
        }
      }
    } else {
      console.log(`  제출 기록 없음`)
    }
  }

  console.log('\n=== 조회 완료 ===')
}

checkSurveySubmission()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('조회 중 오류 발생:', error)
    process.exit(1)
  })
