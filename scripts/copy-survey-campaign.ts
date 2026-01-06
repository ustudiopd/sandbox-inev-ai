import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 설문조사 캠페인 복사 스크립트
 * 
 * 사용법:
 * npx tsx scripts/copy-survey-campaign.ts <원본_public_path> <새_제목> <새_public_path>
 * 
 * 예시:
 * npx tsx scripts/copy-survey-campaign.ts /345870 "Test 설문조사" /test-survey
 */

async function copySurveyCampaign(
  sourcePublicPath: string,
  newTitle: string,
  newPublicPath: string
) {
  const admin = createAdminSupabase()

  console.log('='.repeat(60))
  console.log('설문조사 캠페인 복사 시작')
  console.log('='.repeat(60))
  console.log(`원본 public_path: ${sourcePublicPath}`)
  console.log(`새 제목: ${newTitle}`)
  console.log(`새 public_path: ${newPublicPath}`)
  console.log('')

  // 1. 원본 캠페인 조회
  console.log('1. 원본 캠페인 조회 중...')
  const { data: sourceCampaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('*')
    .eq('public_path', sourcePublicPath)
    .single()

  if (campaignError || !sourceCampaign) {
    console.error('❌ 원본 캠페인을 찾을 수 없습니다:', campaignError)
    process.exit(1)
  }

  console.log(`✅ 원본 캠페인 찾음: ${sourceCampaign.title} (ID: ${sourceCampaign.id})`)
  console.log(`   - client_id: ${sourceCampaign.client_id}`)
  console.log(`   - agency_id: ${sourceCampaign.agency_id}`)
  console.log(`   - form_id: ${sourceCampaign.form_id || '없음'}`)
  console.log('')

  // 2. 새 public_path 중복 체크
  console.log('2. 새 public_path 중복 체크 중...')
  const { data: existingCampaign } = await admin
    .from('event_survey_campaigns')
    .select('id')
    .eq('client_id', sourceCampaign.client_id)
    .eq('public_path', newPublicPath)
    .maybeSingle()

  if (existingCampaign) {
    console.error(`❌ 이미 사용 중인 public_path입니다: ${newPublicPath}`)
    process.exit(1)
  }

  console.log(`✅ 새 public_path 사용 가능: ${newPublicPath}`)
  console.log('')

  // 3. 새 캠페인 생성
  console.log('3. 새 캠페인 생성 중...')
  const { data: newCampaign, error: createError } = await admin
    .from('event_survey_campaigns')
    .insert({
      agency_id: sourceCampaign.agency_id,
      client_id: sourceCampaign.client_id,
      title: newTitle,
      host: sourceCampaign.host,
      public_path: newPublicPath,
      status: 'draft', // 새 캠페인은 draft 상태로 시작
      type: sourceCampaign.type,
      form_id: null, // 나중에 폼 복사 후 연결
      welcome_schema: sourceCampaign.welcome_schema,
      completion_schema: sourceCampaign.completion_schema,
      display_schema: sourceCampaign.display_schema,
      next_survey_no: 1,
      created_by: sourceCampaign.created_by,
    })
    .select()
    .single()

  if (createError || !newCampaign) {
    console.error('❌ 새 캠페인 생성 실패:', createError)
    process.exit(1)
  }

  console.log(`✅ 새 캠페인 생성 완료: ${newCampaign.id}`)
  console.log('')

  // 4. 폼이 있는 경우 폼 복사
  if (sourceCampaign.form_id) {
    console.log('4. 폼 복사 중...')
    
    // 원본 폼 조회
    const { data: sourceForm, error: formError } = await admin
      .from('forms')
      .select('*')
      .eq('id', sourceCampaign.form_id)
      .single()

    if (formError || !sourceForm) {
      console.error('❌ 원본 폼을 찾을 수 없습니다:', formError)
      process.exit(1)
    }

    console.log(`✅ 원본 폼 찾음: ${sourceForm.title} (ID: ${sourceForm.id})`)

    // 새 폼 생성
    const { data: newForm, error: newFormError } = await admin
      .from('forms')
      .insert({
        agency_id: sourceForm.agency_id,
        client_id: sourceForm.client_id,
        campaign_id: newCampaign.id,
        webinar_id: null, // 설문조사 캠페인용이므로 null
        title: `${sourceForm.title} (복사본)`,
        description: sourceForm.description,
        kind: sourceForm.kind,
        status: 'draft',
        config: sourceForm.config,
        opened_at: null,
        closed_at: null,
        created_by: sourceCampaign.created_by, // 원본 캠페인의 created_by 사용
      })
      .select()
      .single()

    if (newFormError || !newForm) {
      console.error('❌ 새 폼 생성 실패:', newFormError)
      process.exit(1)
    }

    console.log(`✅ 새 폼 생성 완료: ${newForm.id}`)

    // 새 캠페인에 폼 연결
    const { error: linkError } = await admin
      .from('event_survey_campaigns')
      .update({ form_id: newForm.id })
      .eq('id', newCampaign.id)

    if (linkError) {
      console.error('❌ 캠페인에 폼 연결 실패:', linkError)
      process.exit(1)
    }

    console.log('✅ 캠페인에 폼 연결 완료')
    console.log('')

    // 5. 폼 문항 복사
    console.log('5. 폼 문항 복사 중...')
    const { data: sourceQuestions, error: questionsError } = await admin
      .from('form_questions')
      .select('*')
      .eq('form_id', sourceCampaign.form_id)
      .order('order_no', { ascending: true })

    if (questionsError) {
      console.error('❌ 원본 문항 조회 실패:', questionsError)
      process.exit(1)
    }

    if (sourceQuestions && sourceQuestions.length > 0) {
      console.log(`✅ 원본 문항 ${sourceQuestions.length}개 찾음`)

      // 문항 복사
      const questionsToInsert = sourceQuestions.map((q: any) => ({
        form_id: newForm.id,
        body: q.body || q.question_text, // body가 없으면 question_text 사용 (하위 호환)
        type: q.type || q.question_type, // type이 없으면 question_type 사용 (하위 호환)
        order_no: q.order_no,
        options: q.options,
        points: q.points || 0,
        answer_key: q.answer_key || null,
      }))

      const { data: newQuestions, error: insertQuestionsError } = await admin
        .from('form_questions')
        .insert(questionsToInsert)
        .select()

      if (insertQuestionsError) {
        console.error('❌ 문항 복사 실패:', insertQuestionsError)
        process.exit(1)
      }

      console.log(`✅ 문항 ${newQuestions?.length || 0}개 복사 완료`)
    } else {
      console.log('⚠️  복사할 문항이 없습니다.')
    }
    console.log('')
  } else {
    console.log('4. 폼이 없어서 폼 복사를 건너뜁니다.')
    console.log('')
  }

  // 6. 완료 메시지
  console.log('='.repeat(60))
  console.log('✅ 설문조사 캠페인 복사 완료!')
  console.log('='.repeat(60))
  console.log(`새 캠페인 ID: ${newCampaign.id}`)
  console.log(`새 캠페인 제목: ${newTitle}`)
  console.log(`새 public_path: ${newPublicPath}`)
  console.log(`공개 URL: https://eventflow.kr/event${newPublicPath}`)
  console.log('')
}

// 스크립트 실행
const args = process.argv.slice(2)

if (args.length < 3) {
  console.error('사용법: npx tsx scripts/copy-survey-campaign.ts <원본_public_path> <새_제목> <새_public_path>')
  console.error('예시: npx tsx scripts/copy-survey-campaign.ts /345870 "Test 설문조사" /test-survey')
  process.exit(1)
}

const [sourcePublicPath, newTitle, newPublicPath] = args

// public_path 검증
if (!sourcePublicPath.startsWith('/') || !newPublicPath.startsWith('/')) {
  console.error('❌ public_path는 /로 시작해야 합니다.')
  process.exit(1)
}

copySurveyCampaign(sourcePublicPath, newTitle, newPublicPath)
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
