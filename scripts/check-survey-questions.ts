import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 설문조사 문항 확인 스크립트
 */

async function checkSurveyQuestions(publicPath: string) {
  const admin = createAdminSupabase()

  console.log('='.repeat(60))
  console.log('설문조사 문항 확인')
  console.log('='.repeat(60))
  console.log(`public_path: ${publicPath}`)
  console.log('')

  // 캠페인 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, form_id')
    .eq('public_path', publicPath)
    .single()

  if (campaignError || !campaign) {
    console.error('❌ 캠페인을 찾을 수 없습니다:', campaignError)
    process.exit(1)
  }

  console.log(`✅ 캠페인 찾음: ${campaign.title} (ID: ${campaign.id})`)
  console.log(`   - form_id: ${campaign.form_id || '없음'}`)
  console.log('')

  if (!campaign.form_id) {
    console.log('⚠️  폼이 연결되어 있지 않습니다.')
    return
  }

  // 폼 문항 조회
  const { data: questions, error: questionsError } = await admin
    .from('form_questions')
    .select('*')
    .eq('form_id', campaign.form_id)
    .order('order_no', { ascending: true })

  if (questionsError) {
    console.error('❌ 문항 조회 실패:', questionsError)
    process.exit(1)
  }

  if (!questions || questions.length === 0) {
    console.log('⚠️  문항이 없습니다.')
    return
  }

  console.log(`✅ 문항 ${questions.length}개 찾음`)
  console.log('')

  questions.forEach((q: any, index: number) => {
    console.log(`문항 ${index + 1}:`)
    console.log(`  - ID: ${q.id}`)
    console.log(`  - order_no: ${q.order_no}`)
    console.log(`  - type: ${q.type}`)
    console.log(`  - body: ${q.body || '(없음)'}`)
    console.log(`  - options: ${q.options ? JSON.stringify(q.options, null, 2) : '(없음)'}`)
    console.log(`  - points: ${q.points || 0}`)
    console.log(`  - answer_key: ${q.answer_key ? JSON.stringify(q.answer_key, null, 2) : '(없음)'}`)
    console.log('')
  })
}

const args = process.argv.slice(2)

if (args.length < 1) {
  console.error('사용법: npx tsx scripts/check-survey-questions.ts <public_path>')
  console.error('예시: npx tsx scripts/check-survey-questions.ts /345870')
  process.exit(1)
}

const publicPath = args[0]

if (!publicPath.startsWith('/')) {
  console.error('❌ public_path는 /로 시작해야 합니다.')
  process.exit(1)
}

checkSurveyQuestions(publicPath)
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
