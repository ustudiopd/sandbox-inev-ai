import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function create149402Survey() {
  const admin = createAdminSupabase()

  // 149400 웨비나의 설문 조회
  const { data: sourceWebinar } = await admin
    .from('webinars')
    .select('id')
    .eq('slug', '149400')
    .single()

  if (!sourceWebinar) {
    console.error('❌ 149400 웨비나를 찾을 수 없습니다')
    process.exit(1)
  }

  // 149400 웨비나의 설문 조회
  const { data: sourceForm } = await admin
    .from('forms')
    .select('*')
    .eq('webinar_id', sourceWebinar.id)
    .eq('kind', 'survey')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sourceForm) {
    console.error('❌ 149400 웨비나에 설문을 찾을 수 없습니다')
    process.exit(1)
  }

  console.log('✅ 원본 설문 찾음:', sourceForm.id, sourceForm.title)

  // 149400 웨비나의 설문 문항 조회
  const { data: sourceQuestions } = await admin
    .from('form_questions')
    .select('*')
    .eq('form_id', sourceForm.id)
    .order('order_no', { ascending: true })

  if (!sourceQuestions || sourceQuestions.length === 0) {
    console.error('❌ 설문 문항을 찾을 수 없습니다')
    process.exit(1)
  }

  console.log('✅ 원본 문항 찾음:', sourceQuestions.length, '개')

  // 149402 웨비나 ID 조회
  const { data: targetWebinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, title, client_id, agency_id')
    .eq('slug', '149402')
    .single()

  if (webinarError || !targetWebinar) {
    console.error('❌ 149402 웨비나를 찾을 수 없습니다:', webinarError)
    process.exit(1)
  }

  console.log('✅ 대상 웨비나 찾음:', targetWebinar.id, targetWebinar.title)

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

  // 설문 생성 (원본과 동일한 정보로)
  const { data: form, error: formError } = await admin
    .from('forms')
    .insert({
      webinar_id: targetWebinar.id,
      agency_id: targetWebinar.agency_id,
      client_id: targetWebinar.client_id,
      title: sourceForm.title,
      description: sourceForm.description,
      kind: sourceForm.kind,
      status: sourceForm.status,
      created_by: adminUser.id,
    })
    .select()
    .single()

  if (formError) {
    console.error('❌ 설문 생성 실패:', formError.message)
    process.exit(1)
  }

  console.log('✅ 설문 생성 완료:', form.id)

  // 문항 생성 (원본과 동일하게)
  const questions = sourceQuestions.map((q) => ({
    form_id: form.id,
    order_no: q.order_no,
    type: q.type,
    body: q.body,
    options: q.options,
    points: q.points || 0,
    answer_key: q.answer_key,
  }))

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
  console.log(`웨비나 ID: ${targetWebinar.id}`)
  console.log(`설문 ID: ${form.id}`)
  console.log(`문항 수: ${createdQuestions.length}개`)
}

create149402Survey()
  .then(() => {
    console.log('\n완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
