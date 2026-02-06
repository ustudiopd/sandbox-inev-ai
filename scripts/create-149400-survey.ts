import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function create149400Survey() {
  const admin = createAdminSupabase()

  // 웨비나 ID 조회 (slug로)
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, title, client_id, agency_id')
    .eq('slug', '149400')
    .single()

  if (webinarError || !webinar) {
    console.error('❌ 웨비나를 찾을 수 없습니다:', webinarError)
    process.exit(1)
  }

  console.log('✅ 웨비나 찾음:', webinar.id, webinar.title)

  // 시스템 사용자 또는 첫 번째 관리자 사용자 찾기
  const { data: adminUser } = await admin
    .from('profiles')
    .select('id')
    .eq('is_super_admin', true)
    .limit(1)
    .single()

  if (!adminUser) {
    console.error('❌ 관리자 사용자를 찾을 수 없습니다.')
    process.exit(1)
  }

  console.log('✅ 생성자 사용자:', adminUser.id)

  // 설문 생성
  const { data: form, error: formError } = await admin
    .from('forms')
    .insert({
      webinar_id: webinar.id,
      agency_id: webinar.agency_id,
      client_id: webinar.client_id,
      title: '설문조사',
      kind: 'survey',
      status: 'draft',
      created_by: adminUser.id,
    })
    .select()
    .single()

  if (formError) {
    console.error('❌ 설문 생성 실패:', formError.message)
    process.exit(1)
  }

  console.log('✅ 설문 생성 완료:', form.id)

  // 문항 생성
  const questions = [
    {
      form_id: form.id,
      order_no: 1,
      type: 'single',
      body: 'Q1. 현재 본인의 업무에 AI를 사용한 경험이 있으신가요?',
      options: JSON.stringify([
        { id: '1', text: '1년 이상 지속적으로 사용 중' },
        { id: '2', text: '6개월 이상 ~ 1년 미만' },
        { id: '3', text: '6개월 미만' },
        { id: '4', text: '사용해본 적 없음' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 2,
      type: 'multiple',
      body: 'Q2. 업무에 활용해본 AI 도구는 무엇인가요? (복수 선택 가능)',
      options: JSON.stringify([
        { id: '1', text: 'ChatGPT' },
        { id: '2', text: 'Gemini' },
        { id: '3', text: 'Claude' },
        { id: '4', text: 'DeepSeek' },
        { id: '5', text: '사내 자체 AI 시스템' },
        { id: '6', text: '기타 (직접 입력하게 해주세요)' },
        { id: '7', text: '사용해본 적 없음' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 3,
      type: 'text',
      body: 'Q3. AI를 업무에 활용하면서 가장 도움이 되었던 점이나 아쉬웠던 점은 무엇인가요? (서술형)',
      options: null,
    },
    {
      form_id: form.id,
      order_no: 4,
      type: 'multiple',
      body: 'Q4. AI 특허리서치를 도입한다면 가장 기대하는 변화는 무엇인가요? (복수 선택)',
      options: JSON.stringify([
        { id: '1', text: '특허·기술 리서치 속도와 효율 향상(선행특허 조사, 유사특허 분석, 반복 업무 단축)' },
        { id: '2', text: 'R&D 및 기술 의사결정의 정확도 향상(데이터 기반 판단, 초기 특허 리스크 검토)' },
        { id: '3', text: '조직 간 협업 개선(인력 효율화, R&D 및 IP 부서 간 효율화 등)' },
        { id: '4', text: 'IP 전략 수립 및 포트폴리오 관리 고도화 (포트폴리오 전략, 경쟁사·시장 대응 전략)' },
        { id: '5', text: '최신 기술 트렌드 및 글로벌 특허 정보 파악 (기술 트렌드 분석, 해외 특허 정보 접근)' },
        { id: '6', text: '아직 구체적인 활용 모습은 잘 모르겠다' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 5,
      type: 'single',
      body: 'Q5. AI 특허리서치 도입 시 가장 큰 장벽은 무엇이라고 생각하시나요?',
      options: JSON.stringify([
        { id: '1', text: '도입 비용' },
        { id: '2', text: '우리 조직에 맞는 활용 방법 부재' },
        { id: '3', text: '내부 설득의 어려움' },
        { id: '4', text: '기존 업무 프로세스와 충돌' },
        { id: '5', text: 'AI 결과에 대한 신뢰 문제' },
        { id: '6', text: '보안 이슈' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 6,
      type: 'single',
      body: 'Q6. 이번 웨비나가 키워트 인사이트 활용 이해에 도움이 되었나요?',
      options: JSON.stringify([
        { id: '1', text: '매우 도움이 되었다' },
        { id: '2', text: '어느 정도 도움이 되었다' },
        { id: '3', text: '보통이다' },
        { id: '4', text: '크게 도움이 되지 않았다' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 7,
      type: 'text',
      body: 'Q7. 웨비나에서 어떤 점이 가장 도움이 되었거나 아쉬웠나요? (서술형)',
      options: null,
    },
    {
      form_id: form.id,
      order_no: 8,
      type: 'single',
      body: 'Q8. 귀사는 AI 특허리서치 \'키워트 인사이트\' 도입을 고려하고 계신가요?',
      options: JSON.stringify([
        { id: '1', text: '예, 적극적으로 고려 중이다' },
        { id: '2', text: '정보를 더 검토해보고 싶다' },
        { id: '3', text: '아직 계획은 없다' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 9,
      type: 'single',
      body: 'Q9. 키워트 인사이트 도입을 위해 활용 가능한 예산이 있으신가요?',
      options: JSON.stringify([
        { id: '1', text: '1천만원 이하' },
        { id: '2', text: '1천만원 이상 3천만원 미만' },
        { id: '3', text: '3천만원 이상 5천만원 미만' },
        { id: '4', text: '5천만원 이상 1억원 미만' },
        { id: '5', text: '1억원 이상' },
        { id: '6', text: '아직 미정' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 10,
      type: 'single',
      body: 'Q10. 도입을 검토한다면, 예상 시점은 언제인가요?',
      options: JSON.stringify([
        { id: '1', text: '1~3개월 이내' },
        { id: '2', text: '3~6개월 이내' },
        { id: '3', text: '6개월 이후' },
        { id: '4', text: '아직 미정' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 11,
      type: 'single',
      body: 'Q11. 도입 시 귀하의 역할은 무엇인가요?',
      options: JSON.stringify([
        { id: '1', text: '최종 의사결정권자' },
        { id: '2', text: '공동 의사결정권자' },
        { id: '3', text: '실무 책임자 (도입 검토/리드 역할)' },
        { id: '4', text: '실무 사용자' },
        { id: '5', text: '기타' },
      ]),
    },
    {
      form_id: form.id,
      order_no: 12,
      type: 'single',
      body: 'Q12. 키워트 인사이트 상담을 받아보고 싶으신가요?\n[상담 신청 시 특별한 견적 혜택을 제공드립니다. ]',
      options: JSON.stringify([
        { id: '1', text: '네' },
        { id: '2', text: '아니오' },
      ]),
    },
  ]

  const { data: createdQuestions, error: questionsError } = await admin
    .from('form_questions')
    .insert(questions)
    .select()

  if (questionsError) {
    console.error('❌ 문항 생성 실패:', questionsError.message)
    // 폼 삭제 (롤백)
    await admin.from('forms').delete().eq('id', form.id)
    process.exit(1)
  }

  console.log('✅ 문항 생성 완료:', createdQuestions.length, '개')
  console.log('\n✅ 설문 생성 완료!')
  console.log(`웨비나 ID: ${webinar.id}`)
  console.log(`설문 ID: ${form.id}`)
  console.log(`문항 수: ${createdQuestions.length}개`)
}

create149400Survey()
  .then(() => {
    console.log('\n완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
