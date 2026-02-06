import * as dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 웨비나 149402의 설문조사 수집 현황 확인
 */
async function checkSurvey149402() {
  const admin = createAdminSupabase()
  const webinarIdOrSlug = '149402'

  console.log('='.repeat(80))
  console.log(`웨비나 ${webinarIdOrSlug} 설문조사 수집 현황 확인`)
  console.log('='.repeat(80))
  console.log('')

  // 1. 웨비나 정보 조회 (slug 또는 ID로)
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, title, slug, registration_campaign_id')
    .or(`id.eq.${webinarIdOrSlug},slug.eq.${webinarIdOrSlug}`)
    .maybeSingle()

  if (webinarError || !webinar) {
    console.error('웨비나를 찾을 수 없습니다:', webinarError)
    return
  }

  console.log(`웨비나 ID: ${webinar.id}`)
  console.log(`웨비나 제목: ${webinar.title}`)
  console.log(`등록 캠페인 ID: ${webinar.registration_campaign_id || '없음'}`)
  console.log('')

  // 2. 설문조사 캠페인 기반 통계 (event_survey_entries)
  if (webinar.registration_campaign_id) {
    console.log('--- 설문조사 캠페인 기반 통계 (event_survey_entries) ---')
    
    const { data: campaign } = await admin
      .from('event_survey_campaigns')
      .select('id, title, status, form_id')
      .eq('id', webinar.registration_campaign_id)
      .maybeSingle()

    if (campaign) {
      console.log(`캠페인 제목: ${campaign.title}`)
      console.log(`캠페인 상태: ${campaign.status}`)
      console.log(`폼 ID: ${campaign.form_id || '없음'}`)
      console.log('')

      // 완료 수
      const { count: completedCount } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)

      // 검증 완료 수
      const { count: verifiedCount } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .not('verified_at', 'is', null)

      // 경품 기록 수
      const { count: prizeRecordedCount } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .not('prize_recorded_at', 'is', null)

      // 폼 제출이 있는 항목 수
      const { count: withSubmissionCount } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .not('form_submission_id', 'is', null)

      console.log(`✅ 총 완료 수: ${completedCount || 0}건`)
      console.log(`✅ 검증 완료 수: ${verifiedCount || 0}건`)
      console.log(`✅ 경품 기록 수: ${prizeRecordedCount || 0}건`)
      console.log(`✅ 폼 제출 완료 수: ${withSubmissionCount || 0}건`)
      console.log('')
    } else {
      console.log('캠페인을 찾을 수 없습니다.')
      console.log('')
    }
  }

  // 3. 웨비나 폼 기반 통계 (forms 테이블)
  console.log('--- 웨비나 폼 기반 통계 (forms 테이블) ---')
  
  const { data: forms } = await admin
    .from('forms')
    .select('id, title, kind, status')
    .eq('webinar_id', webinar.id)

  if (!forms || forms.length === 0) {
    console.log('이 웨비나에는 폼이 없습니다.')
    console.log('')
  } else {
    console.log(`총 폼 수: ${forms.length}개`)
    console.log('')

    const surveyForms = forms.filter(f => f.kind === 'survey')
    const quizForms = forms.filter(f => f.kind === 'quiz')

    console.log(`📝 설문조사 폼: ${surveyForms.length}개`)
    console.log(`🎯 퀴즈 폼: ${quizForms.length}개`)
    console.log('')

    // 설문조사 제출 통계
    if (surveyForms.length > 0) {
      console.log('--- 설문조사 제출 통계 ---')
      
      const surveyFormIds = surveyForms.map(f => f.id)
      
      const { data: surveySubmissions } = await admin
        .from('form_submissions')
        .select('id, participant_id, submitted_at')
        .in('form_id', surveyFormIds)

      const totalSubmissions = surveySubmissions?.length || 0
      const uniqueRespondents = new Set(surveySubmissions?.map(s => s.participant_id)).size

      console.log(`✅ 총 제출 수: ${totalSubmissions}건`)
      console.log(`✅ 고유 응답자 수: ${uniqueRespondents}명`)

      // 폼별 상세 통계
      for (const form of surveyForms) {
        const formSubmissions = surveySubmissions?.filter(s => 
          surveyFormIds.includes(form.id)
        ) || []
        
        const { data: formSubmissionsForThisForm } = await admin
          .from('form_submissions')
          .select('id, participant_id, submitted_at')
          .eq('form_id', form.id)

        console.log(`  - [${form.title}] (${form.status}): ${formSubmissionsForThisForm?.length || 0}건`)
      }
      console.log('')
    }

    // 퀴즈 시도 통계
    if (quizForms.length > 0) {
      console.log('--- 퀴즈 시도 통계 ---')
      
      const quizFormIds = quizForms.map(f => f.id)
      
      const { data: quizAttempts } = await admin
        .from('quiz_attempts')
        .select('id, participant_id, total_score, submitted_at')
        .in('form_id', quizFormIds)

      const totalAttempts = quizAttempts?.length || 0
      const uniqueParticipants = new Set(quizAttempts?.map(a => a.participant_id)).size

      console.log(`✅ 총 시도 수: ${totalAttempts}건`)
      console.log(`✅ 고유 참여자 수: ${uniqueParticipants}명`)

      if (quizAttempts && quizAttempts.length > 0) {
        const scores = quizAttempts.map(a => a.total_score)
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
        const maxScore = Math.max(...scores)
        const minScore = Math.min(...scores)

        console.log(`✅ 평균 점수: ${avgScore.toFixed(2)}점`)
        console.log(`✅ 최고 점수: ${maxScore}점`)
        console.log(`✅ 최저 점수: ${minScore}점`)
      }

      // 폼별 상세 통계
      for (const form of quizForms) {
        const { data: formAttempts } = await admin
          .from('quiz_attempts')
          .select('id, participant_id, total_score')
          .eq('form_id', form.id)

        console.log(`  - [${form.title}] (${form.status}): ${formAttempts?.length || 0}건`)
      }
      console.log('')
    }
  }

  // 4. 등록자 수 (비교용)
  console.log('--- 등록자 수 (비교용) ---')
  
  const { count: registrantCount } = await admin
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('webinar_id', webinar.id)

  console.log(`총 등록자 수: ${registrantCount || 0}명`)
  console.log('')

  console.log('='.repeat(80))
}

// 실행
checkSurvey149402()
  .then(() => {
    console.log('조회 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류 발생:', error)
    process.exit(1)
  })
