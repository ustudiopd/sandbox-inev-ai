import { createAdminSupabase } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 설문 문항 교체 스크립트
 * 사용법: npx tsx scripts/update-survey-questions.ts <public_path>
 * 예: npx tsx scripts/update-survey-questions.ts 345870
 */
async function updateSurveyQuestions(publicPath: string) {
  try {
    const admin = createAdminSupabase()
    
    // public_path 정규화: 슬래시로 시작하도록
    const normalizedPath = publicPath.startsWith('/') ? publicPath : `/${publicPath}`
    
    console.log(`캠페인 조회 중: public_path = ${normalizedPath}`)
    
    // 캠페인 조회 (슬래시 포함/미포함 모두 시도)
    let campaign = null
    let campaignError: any = null
    
    // 먼저 슬래시 포함 경로로 시도
    const { data: campaignWithSlash, error: errorWithSlash } = await admin
      .from('event_survey_campaigns')
      .select('id, title, form_id, client_id, agency_id')
      .eq('public_path', normalizedPath)
      .maybeSingle()
    
    if (campaignWithSlash) {
      campaign = campaignWithSlash
    } else {
      // 슬래시 없이도 시도
      const { data: campaignWithoutSlash, error: errorWithoutSlash } = await admin
        .from('event_survey_campaigns')
        .select('id, title, form_id, client_id, agency_id')
        .eq('public_path', publicPath)
        .maybeSingle()
      
      if (campaignWithoutSlash) {
        campaign = campaignWithoutSlash
      } else {
        campaignError = errorWithoutSlash || errorWithSlash
      }
    }
    
    if (campaignError || !campaign) {
      console.error('❌ 캠페인을 찾을 수 없습니다:', campaignError?.message)
      console.error(`시도한 경로: ${normalizedPath}, ${publicPath}`)
      process.exit(1)
    }
    
    console.log('✅ 캠페인 찾음:', {
      id: campaign.id,
      title: campaign.title,
      form_id: campaign.form_id
    })
    
    if (!campaign.form_id) {
      console.error('❌ 이 캠페인에는 폼이 연결되어 있지 않습니다.')
      process.exit(1)
    }
    
    const formId = campaign.form_id
    
    // 기존 문항 삭제
    console.log('기존 문항 삭제 중...')
    const { error: deleteError } = await admin
      .from('form_questions')
      .delete()
      .eq('form_id', formId)
    
    if (deleteError) {
      console.error('❌ 기존 문항 삭제 실패:', deleteError.message)
      process.exit(1)
    }
    
    console.log('✅ 기존 문항 삭제 완료')
    
    // 새로운 문항 생성
    const newQuestions = [
      {
        form_id: formId,
        order_no: 1,
        type: 'single',
        body: '현재 네트워크 프로젝트 계획이 있으시다면 언제입니까?',
        options: JSON.stringify([
          { id: '1', text: '1주일 이내​' },
          { id: '2', text: '1개월 이내' },
          { id: '3', text: '1개월 - 3개월' },
          { id: '4', text: '3개월 - 6개월' },
          { id: '5', text: '6개월 - 12개월' },
          { id: '6', text: '1년 이후​' },
          { id: '7', text: '계획없음' }
        ])
      },
      {
        form_id: formId,
        order_no: 2,
        type: 'multiple',
        body: '향후 네트워크 프로젝트 계획이 있으시다면, 다음 중 어떤 영역에 해당합니까?',
        options: JSON.stringify([
          { id: '1', text: '데이터 센터 (AI 데이터 센터, 데이터 센터 자동화 등)' },
          { id: '2', text: '유무선 캠퍼스 & 브랜치 네트워크' },
          { id: '3', text: '엔터프라이즈 라우팅 (SD-WAN 포함)' },
          { id: '4', text: '네트워크 보안' },
          { id: '5', text: '해당 없음' }
        ])
      },
      {
        form_id: formId,
        order_no: 3,
        type: 'single',
        body: '해당 프로젝트에 대한 예산은 이미 확보되어 있습니까?',
        options: JSON.stringify([
          { id: '1', text: '예' },
          { id: '2', text: '아니오' }
        ])
      },
      {
        form_id: formId,
        order_no: 4,
        type: 'single',
        body: '예정된 프로젝트에서 귀하의 역할은 의사결정 권한이 있는 구매 담당자(Authorized Buyer)입니까?',
        options: JSON.stringify([
          { id: '1', text: '예' },
          { id: '2', text: '아니오' }
        ])
      },
      {
        form_id: formId,
        order_no: 5,
        type: 'single',
        body: 'HPE의 네트워크 솔루션에 대해 보다 더 자세한 내용을 들어 보실 의향이 있으십니까?',
        options: JSON.stringify([
          { id: '1', text: 'HPE 네트워크 전문가의 방문 요청​' },
          { id: '2', text: 'HPE 네트워크 전문가의 온라인 미팅 요청​' },
          { id: '3', text: 'HPE 네트워크 전문가의 전화 상담 요청​' },
          { id: '4', text: '관심 없음' }
        ])
      }
    ]
    
    console.log('새로운 문항 생성 중...')
    const { data: createdQuestions, error: insertError } = await admin
      .from('form_questions')
      .insert(newQuestions)
      .select()
    
    if (insertError) {
      console.error('❌ 문항 생성 실패:', insertError.message)
      process.exit(1)
    }
    
    console.log('✅ 문항 생성 완료!')
    console.log(`총 ${createdQuestions?.length || 0}개의 문항이 생성되었습니다.`)
    
    createdQuestions?.forEach((q: any, index: number) => {
      console.log(`  ${index + 1}. ${q.body}`)
    })
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

// 명령줄 인자에서 public_path 가져오기
const publicPath = process.argv[2]

if (!publicPath) {
  console.error('사용법: npx tsx scripts/update-survey-questions.ts <public_path>')
  console.error('예: npx tsx scripts/update-survey-questions.ts 345870')
  process.exit(1)
}

updateSurveyQuestions(publicPath)
