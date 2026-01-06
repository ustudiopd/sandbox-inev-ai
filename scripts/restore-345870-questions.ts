import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * /345870 캠페인에 5개 문항 복구 스크립트
 */

async function restore345870Questions() {
  const admin = createAdminSupabase()
  const publicPath = '/345870'

  console.log('='.repeat(60))
  console.log('/345870 캠페인 문항 복구 시작')
  console.log('='.repeat(60))
  console.log('')

  // 1. 캠페인 조회
  console.log('1. 캠페인 조회 중...')
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('*')
    .eq('public_path', publicPath)
    .single()

  if (campaignError || !campaign) {
    console.error('❌ 캠페인을 찾을 수 없습니다:', campaignError)
    process.exit(1)
  }

  console.log(`✅ 캠페인 찾음: ${campaign.title} (ID: ${campaign.id})`)
  console.log(`   - form_id: ${campaign.form_id || '없음'}`)
  console.log('')

  // 2. 폼이 없으면 생성
  let formId = campaign.form_id

  if (!formId) {
    console.log('2. 폼이 없어서 새 폼 생성 중...')
    
    const { data: newForm, error: formError } = await admin
      .from('forms')
      .insert({
        agency_id: campaign.agency_id,
        client_id: campaign.client_id,
        campaign_id: campaign.id,
        webinar_id: null,
        title: 'HPE 부스 이벤트 설문조사',
        description: 'HPE 부스 이벤트 설문조사입니다.',
        kind: 'survey',
        status: 'draft',
        config: null,
        opened_at: null,
        closed_at: null,
        created_by: campaign.created_by,
      })
      .select()
      .single()

    if (formError || !newForm) {
      console.error('❌ 폼 생성 실패:', formError)
      process.exit(1)
    }

    formId = newForm.id
    console.log(`✅ 새 폼 생성 완료: ${formId}`)

    // 캠페인에 폼 연결
    const { error: linkError } = await admin
      .from('event_survey_campaigns')
      .update({ form_id: formId })
      .eq('id', campaign.id)

    if (linkError) {
      console.error('❌ 캠페인에 폼 연결 실패:', linkError)
      process.exit(1)
    }

    console.log('✅ 캠페인에 폼 연결 완료')
    console.log('')
  } else {
    console.log('2. 기존 폼 확인 중...')
    const { data: existingForm } = await admin
      .from('forms')
      .select('id, title')
      .eq('id', formId)
      .single()

    if (existingForm) {
      console.log(`✅ 기존 폼 확인: ${existingForm.title} (ID: ${formId})`)
    }
    console.log('')

    // 기존 문항 삭제
    console.log('3. 기존 문항 삭제 중...')
    const { error: deleteError } = await admin
      .from('form_questions')
      .delete()
      .eq('form_id', formId)

    if (deleteError) {
      console.error('❌ 기존 문항 삭제 실패:', deleteError)
      process.exit(1)
    }

    console.log('✅ 기존 문항 삭제 완료')
    console.log('')
  }

  // 3. 5개 문항 생성 (update-survey-questions.ts 참고)
  console.log('4. 5개 문항 생성 중...')
  const newQuestions = [
    {
      form_id: formId,
      order_no: 1,
      type: 'single',
      body: '현재 네트워크 프로젝트 계획이 있으시다면 언제입니까?',
      options: [
        { id: '1', text: '1주일 이내' },
        { id: '2', text: '1개월 이내' },
        { id: '3', text: '1개월 - 3개월' },
        { id: '4', text: '3개월 - 6개월' },
        { id: '5', text: '6개월 - 12개월' },
        { id: '6', text: '1년 이후' },
        { id: '7', text: '계획없음' }
      ],
    },
    {
      form_id: formId,
      order_no: 2,
      type: 'multiple',
      body: '향후 네트워크 프로젝트 계획이 있으시다면, 다음 중 어떤 영역에 해당합니까?',
      options: [
        { id: '1', text: '데이터 센터 (AI 데이터 센터, 데이터 센터 자동화 등)' },
        { id: '2', text: '유무선 캠퍼스 & 브랜치 네트워크' },
        { id: '3', text: '엔터프라이즈 라우팅 (SD-WAN 포함)' },
        { id: '4', text: '네트워크 보안' },
        { id: '5', text: '해당 없음' }
      ],
    },
    {
      form_id: formId,
      order_no: 3,
      type: 'single',
      body: '해당 프로젝트에 대한 예산은 이미 확보되어 있습니까?',
      options: [
        { id: '1', text: '예' },
        { id: '2', text: '아니오' }
      ],
    },
    {
      form_id: formId,
      order_no: 4,
      type: 'single',
      body: '예정된 프로젝트에서 귀하의 역할은 의사결정 권한이 있는 구매 담당자(Authorized Buyer)입니까?',
      options: [
        { id: '1', text: '예' },
        { id: '2', text: '아니오' }
      ],
    },
    {
      form_id: formId,
      order_no: 5,
      type: 'single',
      body: 'HPE의 네트워크 솔루션에 대해 보다 더 자세한 내용을 들어 보실 의향이 있으십니까?',
      options: [
        { id: '1', text: 'HPE 네트워크 전문가의 방문 요청' },
        { id: '2', text: 'HPE 네트워크 전문가의 온라인 미팅 요청' },
        { id: '3', text: 'HPE 네트워크 전문가의 전화 상담 요청' },
        { id: '4', text: '관심 없음' }
      ],
    }
  ]

  const { data: createdQuestions, error: insertError } = await admin
    .from('form_questions')
    .insert(newQuestions)
    .select()

  if (insertError) {
    console.error('❌ 문항 생성 실패:', insertError)
    process.exit(1)
  }

  console.log(`✅ 문항 ${createdQuestions?.length || 0}개 생성 완료!`)
  createdQuestions?.forEach((q: any, index: number) => {
    console.log(`   ${index + 1}. ${q.body}`)
  })
  console.log('')

  // 4. 완료 메시지
  console.log('='.repeat(60))
  console.log('✅ 문항 복구 완료!')
  console.log('='.repeat(60))
  console.log(`캠페인: ${campaign.title}`)
  console.log(`복구된 문항 수: ${createdQuestions?.length || 0}개`)
  console.log(`공개 URL: https://eventflow.kr/event${publicPath}`)
  console.log('')
}

restore345870Questions()
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
