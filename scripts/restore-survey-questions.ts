import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 설문조사 문항 복구 스크립트
 * 
 * 사용법:
 * npx tsx scripts/restore-survey-questions.ts <public_path> <참조_public_path>
 * 
 * 예시:
 * npx tsx scripts/restore-survey-questions.ts /345870 /test-survey-copy
 */

async function restoreSurveyQuestions(
  targetPublicPath: string,
  referencePublicPath: string
) {
  const admin = createAdminSupabase()

  console.log('='.repeat(60))
  console.log('설문조사 문항 복구 시작')
  console.log('='.repeat(60))
  console.log(`대상 public_path: ${targetPublicPath}`)
  console.log(`참조 public_path: ${referencePublicPath}`)
  console.log('')

  // 1. 대상 캠페인 조회
  console.log('1. 대상 캠페인 조회 중...')
  const { data: targetCampaign, error: targetError } = await admin
    .from('event_survey_campaigns')
    .select('*')
    .eq('public_path', targetPublicPath)
    .single()

  if (targetError || !targetCampaign) {
    console.error('❌ 대상 캠페인을 찾을 수 없습니다:', targetError)
    process.exit(1)
  }

  console.log(`✅ 대상 캠페인 찾음: ${targetCampaign.title} (ID: ${targetCampaign.id})`)
  console.log(`   - form_id: ${targetCampaign.form_id || '없음'}`)
  console.log('')

  if (!targetCampaign.form_id) {
    console.error('❌ 대상 캠페인에 폼이 연결되어 있지 않습니다.')
    process.exit(1)
  }

  // 2. 참조 캠페인 조회
  console.log('2. 참조 캠페인 조회 중...')
  const { data: referenceCampaign, error: referenceError } = await admin
    .from('event_survey_campaigns')
    .select('*')
    .eq('public_path', referencePublicPath)
    .single()

  if (referenceError || !referenceCampaign) {
    console.error('❌ 참조 캠페인을 찾을 수 없습니다:', referenceError)
    process.exit(1)
  }

  console.log(`✅ 참조 캠페인 찾음: ${referenceCampaign.title} (ID: ${referenceCampaign.id})`)
  console.log(`   - form_id: ${referenceCampaign.form_id || '없음'}`)
  console.log('')

  if (!referenceCampaign.form_id) {
    console.error('❌ 참조 캠페인에 폼이 연결되어 있지 않습니다.')
    process.exit(1)
  }

  // 3. 참조 캠페인의 문항 조회
  console.log('3. 참조 캠페인의 문항 조회 중...')
  const { data: referenceQuestions, error: refQuestionsError } = await admin
    .from('form_questions')
    .select('*')
    .eq('form_id', referenceCampaign.form_id)
    .order('order_no', { ascending: true })

  if (refQuestionsError) {
    console.error('❌ 참조 문항 조회 실패:', refQuestionsError)
    process.exit(1)
  }

  if (!referenceQuestions || referenceQuestions.length === 0) {
    console.error('❌ 참조 캠페인에 문항이 없습니다.')
    process.exit(1)
  }

  console.log(`✅ 참조 문항 ${referenceQuestions.length}개 찾음`)
  referenceQuestions.forEach((q: any, idx: number) => {
    console.log(`   ${idx + 1}. ${q.body || q.question_text} (order_no: ${q.order_no})`)
  })
  console.log('')

  // 4. 대상 캠페인의 현재 문항 확인
  console.log('4. 대상 캠페인의 현재 문항 확인 중...')
  const { data: currentQuestions, error: currentError } = await admin
    .from('form_questions')
    .select('*')
    .eq('form_id', targetCampaign.form_id)
    .order('order_no', { ascending: true })

  if (currentError) {
    console.error('❌ 현재 문항 조회 실패:', currentError)
    process.exit(1)
  }

  console.log(`현재 문항 ${currentQuestions?.length || 0}개`)
  if (currentQuestions && currentQuestions.length > 0) {
    currentQuestions.forEach((q: any, idx: number) => {
      console.log(`   ${idx + 1}. ${q.body || q.question_text} (order_no: ${q.order_no})`)
    })
  }
  console.log('')

  // 5. 기존 문항 삭제
  console.log('5. 기존 문항 삭제 중...')
  const { error: deleteError } = await admin
    .from('form_questions')
    .delete()
    .eq('form_id', targetCampaign.form_id)

  if (deleteError) {
    console.error('❌ 기존 문항 삭제 실패:', deleteError)
    process.exit(1)
  }

  console.log(`✅ 기존 문항 ${currentQuestions?.length || 0}개 삭제 완료`)
  console.log('')

  // 6. 참조 문항 복사
  console.log('6. 참조 문항 복사 중...')
  const questionsToInsert = referenceQuestions.map((q: any) => ({
    form_id: targetCampaign.form_id,
    body: q.body || q.question_text,
    type: q.type || q.question_type,
    order_no: q.order_no,
    options: q.options,
    points: q.points || 0,
    answer_key: q.answer_key || null,
    analysis_role_override: q.analysis_role_override || null,
  }))

  const { data: newQuestions, error: insertError } = await admin
    .from('form_questions')
    .insert(questionsToInsert)
    .select()

  if (insertError) {
    console.error('❌ 문항 복사 실패:', insertError)
    process.exit(1)
  }

  console.log(`✅ 문항 ${newQuestions?.length || 0}개 복사 완료`)
  newQuestions?.forEach((q: any, idx: number) => {
    console.log(`   ${idx + 1}. ${q.body || q.question_text} (order_no: ${q.order_no})`)
  })
  console.log('')

  // 7. 완료 메시지
  console.log('='.repeat(60))
  console.log('✅ 설문조사 문항 복구 완료!')
  console.log('='.repeat(60))
  console.log(`대상 캠페인: ${targetCampaign.title}`)
  console.log(`복구된 문항 수: ${newQuestions?.length || 0}개`)
  console.log(`공개 URL: https://eventflow.kr/event${targetPublicPath}`)
  console.log('')
}

// 스크립트 실행
const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('사용법: npx tsx scripts/restore-survey-questions.ts <대상_public_path> <참조_public_path>')
  console.error('예시: npx tsx scripts/restore-survey-questions.ts /345870 /test-survey-copy')
  process.exit(1)
}

const [targetPublicPath, referencePublicPath] = args

// public_path 검증
if (!targetPublicPath.startsWith('/') || !referencePublicPath.startsWith('/')) {
  console.error('❌ public_path는 /로 시작해야 합니다.')
  process.exit(1)
}

restoreSurveyQuestions(targetPublicPath, referencePublicPath)
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
