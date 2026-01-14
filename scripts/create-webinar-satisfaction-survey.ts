import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 웨비나 만족도 설문조사 생성 스크립트
 * 웨비나 ID: 884372
 */
async function createWebinarSatisfactionSurvey() {
  try {
    const admin = createAdminSupabase()
    const webinarIdOrSlug = '884372'
    
    console.log(`웨비나 조회 중: ${webinarIdOrSlug}`)
    
    // 웨비나 정보 조회 (slug 또는 UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let webinar
    if (uuidRegex.test(webinarIdOrSlug)) {
      const { data, error } = await admin
        .from('webinars')
        .select('id, title, client_id, slug')
        .eq('id', webinarIdOrSlug)
        .single()
      
      if (error || !data) {
        console.error('❌ 웨비나를 찾을 수 없습니다:', error?.message || '알 수 없는 오류')
        process.exit(1)
      }
      webinar = data
    } else {
      const { data, error } = await admin
        .from('webinars')
        .select('id, title, client_id, slug')
        .eq('slug', webinarIdOrSlug)
        .single()
      
      if (error || !data) {
        console.error('❌ 웨비나를 찾을 수 없습니다:', error?.message || '알 수 없는 오류')
        process.exit(1)
      }
      webinar = data
    }
    
    console.log('✅ 웨비나 찾음:')
    console.log(`   - ID: ${webinar.id}`)
    console.log(`   - 제목: ${webinar.title}`)
    console.log(`   - Client ID: ${webinar.client_id}`)
    
    // 클라이언트 정보 조회
    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', webinar.client_id)
      .single()
    
    if (clientError || !client) {
      console.error('❌ 클라이언트를 찾을 수 없습니다:', clientError?.message)
      process.exit(1)
    }
    
    console.log(`   - 클라이언트: ${client.name}`)
    
    // 설문조사 캠페인 생성
    const campaignTitle = `${webinar.title} 만족도 설문`
    
    // 기존 캠페인 확인
    const basePublicPath = `/webinar-${webinarIdOrSlug}-satisfaction`
    let publicPath = basePublicPath
    let suffix = 1
    
    while (true) {
      const { data: existing } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('client_id', client.id)
        .eq('public_path', publicPath)
        .maybeSingle()
      
      if (!existing) {
        break
      }
      
      publicPath = `${basePublicPath}-${suffix}`
      suffix++
    }
    
    // created_by를 위한 사용자 찾기 (슈퍼 어드민 또는 클라이언트 멤버)
    let createdByUserId: string | null = null
    const { data: superAdmin } = await admin
      .from('profiles')
      .select('id')
      .eq('is_super_admin', true)
      .limit(1)
      .maybeSingle()
    
    if (superAdmin) {
      createdByUserId = superAdmin.id
    } else {
      // 클라이언트 멤버 중 하나 찾기
      const { data: clientMember } = await admin
        .from('client_members')
        .select('user_id')
        .eq('client_id', client.id)
        .limit(1)
        .maybeSingle()
      
      if (clientMember) {
        createdByUserId = clientMember.user_id
      }
    }
    
    if (!createdByUserId) {
      console.error('❌ created_by를 위한 사용자를 찾을 수 없습니다.')
      process.exit(1)
    }
    
    console.log('\n설문조사 캠페인 생성 중...')
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .insert({
        agency_id: client.agency_id,
        client_id: client.id,
        title: campaignTitle,
        public_path: publicPath,
        status: 'published',
        type: 'survey',
        next_survey_no: 1,
        created_by: createdByUserId,
      })
      .select()
      .single()
    
    if (campaignError) {
      console.error('❌ 캠페인 생성 실패:', campaignError.message)
      process.exit(1)
    }
    
    console.log('✅ 캠페인 생성 완료:', campaign.id)
    
    // 폼 생성
    console.log('\n폼 생성 중...')
    const { data: form, error: formError } = await admin
      .from('forms')
      .insert({
        agency_id: client.agency_id,
        client_id: client.id,
        campaign_id: campaign.id,
        title: campaignTitle,
        kind: 'survey',
        created_by: createdByUserId,
        config: {
          basicFields: {
            name: { required: false },
            phone: { required: false },
            email: { required: false },
            company: { required: false },
          },
        },
      })
      .select()
      .single()
    
    if (formError) {
      console.error('❌ 폼 생성 실패:', formError.message)
      process.exit(1)
    }
    
    console.log('✅ 폼 생성 완료:', form.id)
    
    // 캠페인에 폼 연결
    await admin
      .from('event_survey_campaigns')
      .update({ form_id: form.id })
      .eq('id', campaign.id)
    
    // 문항 1: 전반 만족도
    console.log('\n문항 1 추가 중: 전반 만족도...')
    const question1: any = {
      form_id: form.id,
      order_no: 1,
      type: 'single',
      body: '오늘 모두의특강 콘텐츠는 전반적으로 만족스러웠나요?',
      options: JSON.stringify([
        { id: '1', text: '매우 불만족' },
        { id: '2', text: '불만족' },
        { id: '3', text: '보통' },
        { id: '4', text: '만족' },
        { id: '5', text: '매우 만족' },
      ]),
      analysis_role_override: 'other',
    }
    
    const { data: q1, error: q1Error } = await admin
      .from('form_questions')
      .insert(question1)
      .select()
      .single()
    
    if (q1Error) {
      console.error('❌ 문항 1 생성 실패:', q1Error.message)
      process.exit(1)
    }
    console.log('✅ 문항 1 생성 완료')
    
    // 문항 2: 개선 포인트
    console.log('\n문항 2 추가 중: 개선 포인트...')
    const question2: any = {
      form_id: form.id,
      order_no: 2,
      type: 'single',
      body: '다음 특강에서 가장 개선되면 좋을 점 1가지만 고른다면?',
      options: JSON.stringify([
        { id: '1', text: '콘텐츠 난이도/깊이(너무 어렵거나/얕음)' },
        { id: '2', text: '진행 속도(빠름/느림)' },
        { id: '3', text: '실무 사례/데모(더 필요함)' },
        { id: '4', text: 'Q&A 시간/질문 반영(더 필요함)' },
        { id: '5', text: '자료(슬라이드/요약) 구성·공유' },
        { id: '6', text: '음향/영상/스트리밍 품질' },
        { id: '7', text: '크게 아쉬운 점 없음' },
      ]),
      analysis_role_override: 'other',
    }
    
    const { data: q2, error: q2Error } = await admin
      .from('form_questions')
      .insert(question2)
      .select()
      .single()
    
    if (q2Error) {
      console.error('❌ 문항 2 생성 실패:', q2Error.message)
      process.exit(1)
    }
    console.log('✅ 문항 2 생성 완료')
    
    // 문항 3: 다음에 다루고 싶은 주제
    console.log('\n문항 3 추가 중: 다음에 다루고 싶은 주제...')
    const question3: any = {
      form_id: form.id,
      order_no: 3,
      type: 'single',
      body: '다음 모두의특강에서 가장 다뤄줬으면 하는 주제는 무엇인가요?',
      options: JSON.stringify([
        { id: '1', text: 'AI 실무 활용(업무 자동화/에이전트/프롬프트)' },
        { id: '2', text: '최신 테크 트렌드 요약(CES/빅테크 발표 핵심)' },
        { id: '3', text: '도구/모델 비교(예: ChatGPT·Gemini·Claude 등)' },
        { id: '4', text: '조직 도입/운영(교육, 업무 적용, 변화관리)' },
        { id: '5', text: '보안/정책/컴플라이언스(사내 적용 이슈)' },
        { id: '6', text: '개발자 관점(코딩, RAG, LLMOps)' },
        { id: '7', text: '기타/잘 모르겠음' },
      ]),
      analysis_role_override: 'project_type',
    }
    
    const { data: q3, error: q3Error } = await admin
      .from('form_questions')
      .insert(question3)
      .select()
      .single()
    
    if (q3Error) {
      console.error('❌ 문항 3 생성 실패:', q3Error.message)
      process.exit(1)
    }
    console.log('✅ 문항 3 생성 완료')
    
    console.log('\n✅ 설문조사 생성 완료!')
    console.log(`\n📋 캠페인 정보:`)
    console.log(`   - 제목: ${campaignTitle}`)
    console.log(`   - Public Path: ${publicPath}`)
    console.log(`   - 공개 URL: https://eventflow.kr/event${publicPath}`)
    console.log(`   - 캠페인 ID: ${campaign.id}`)
    console.log(`   - 폼 ID: ${form.id}`)
    console.log(`\n📝 문항:`)
    console.log(`   1. 전반 만족도 (5점 척도)`)
    console.log(`   2. 개선 포인트 (7개 선택지)`)
    console.log(`   3. 다음 주제 (7개 선택지)`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

createWebinarSatisfactionSurvey()
