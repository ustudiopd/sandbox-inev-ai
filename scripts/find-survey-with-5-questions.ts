import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 5개 문항을 가진 설문조사 캠페인 찾기
 */

async function findSurveyWith5Questions() {
  const admin = createAdminSupabase()

  console.log('='.repeat(60))
  console.log('5개 문항을 가진 설문조사 캠페인 찾기')
  console.log('='.repeat(60))
  console.log('')

  // HPE 클라이언트 ID
  const hpeClientId = 'b621c16a-ec75-4256-a65d-b722a13d865c'

  // HPE 클라이언트의 모든 캠페인 조회
  const { data: campaigns, error: campaignsError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path, form_id')
    .eq('client_id', hpeClientId)
    .order('created_at', { ascending: false })

  if (campaignsError) {
    console.error('❌ 캠페인 조회 실패:', campaignsError)
    process.exit(1)
  }

  console.log(`✅ HPE 클라이언트의 캠페인 ${campaigns?.length || 0}개 찾음`)
  console.log('')

  // 각 캠페인의 문항 수 확인
  for (const campaign of campaigns || []) {
    if (!campaign.form_id) {
      console.log(`📋 ${campaign.title} (${campaign.public_path}) - 폼 없음`)
      continue
    }

    const { data: questions, error: questionsError } = await admin
      .from('form_questions')
      .select('id, body, order_no')
      .eq('form_id', campaign.form_id)
      .order('order_no', { ascending: true })

    if (questionsError) {
      console.log(`📋 ${campaign.title} (${campaign.public_path}) - 문항 조회 실패`)
      continue
    }

    const questionCount = questions?.length || 0
    const marker = questionCount === 5 ? '⭐' : '  '
    console.log(`${marker} ${campaign.title} (${campaign.public_path}) - 문항 ${questionCount}개`)

    if (questionCount === 5) {
      console.log('   문항 목록:')
      questions?.forEach((q: any, idx: number) => {
        console.log(`     ${idx + 1}. ${q.body || '(제목 없음)'}`)
      })
      console.log('')
    }
  }
}

findSurveyWith5Questions()
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
