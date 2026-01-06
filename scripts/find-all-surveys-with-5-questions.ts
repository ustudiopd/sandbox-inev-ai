import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 모든 클라이언트에서 5개 문항을 가진 설문조사 캠페인 찾기
 */

async function findAllSurveysWith5Questions() {
  const admin = createAdminSupabase()

  console.log('='.repeat(60))
  console.log('5개 문항을 가진 설문조사 캠페인 찾기 (전체)')
  console.log('='.repeat(60))
  console.log('')

  // 모든 캠페인 조회
  const { data: campaigns, error: campaignsError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path, form_id, client_id')
    .order('created_at', { ascending: false })
    .limit(50)

  if (campaignsError) {
    console.error('❌ 캠페인 조회 실패:', campaignsError)
    process.exit(1)
  }

  console.log(`✅ 캠페인 ${campaigns?.length || 0}개 찾음`)
  console.log('')

  let found5Questions = false

  // 각 캠페인의 문항 수 확인
  for (const campaign of campaigns || []) {
    if (!campaign.form_id) {
      continue
    }

    const { data: questions, error: questionsError } = await admin
      .from('form_questions')
      .select('id, body, order_no, type, options')
      .eq('form_id', campaign.form_id)
      .order('order_no', { ascending: true })

    if (questionsError || !questions) {
      continue
    }

    const questionCount = questions.length

    if (questionCount === 5) {
      found5Questions = true
      console.log(`⭐ ${campaign.title}`)
      console.log(`   public_path: ${campaign.public_path}`)
      console.log(`   campaign_id: ${campaign.id}`)
      console.log(`   form_id: ${campaign.form_id}`)
      console.log(`   client_id: ${campaign.client_id}`)
      console.log('   문항 목록:')
      questions.forEach((q: any, idx: number) => {
        const options = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : []
        const optionsText = Array.isArray(options) ? options.map((o: any) => o.text || o).join(', ') : ''
        console.log(`     ${idx + 1}. ${q.body || '(제목 없음)'} [${q.type}]`)
        if (optionsText) {
          console.log(`        옵션: ${optionsText}`)
        }
      })
      console.log('')
    }
  }

  if (!found5Questions) {
    console.log('⚠️  5개 문항을 가진 설문조사를 찾을 수 없습니다.')
  }
}

findAllSurveysWith5Questions()
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
