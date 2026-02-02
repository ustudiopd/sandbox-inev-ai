import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function createModuRegistration() {
  const admin = createAdminSupabase()
  
  const clientId = 'a556c562-03c3-4988-8b88-ae0a96648514' // 모두의특강
  const title = '등록 페이지 테스트 - 모두의특강'
  const publicPath = '/test-registration-modu'
  const type = 'registration'
  const status = 'published'
  
  console.log('🔍 모두의특강 등록 페이지 생성...\n')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`제목: ${title}`)
  console.log(`공개 경로: ${publicPath}`)
  console.log(`타입: ${type}`)
  console.log(`상태: ${status}\n`)
  
  // 클라이언트 정보 조회
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name, agency_id')
    .eq('id', clientId)
    .single()
  
  if (clientError || !client) {
    console.error('❌ 클라이언트를 찾을 수 없습니다:', clientError)
    return
  }
  
  console.log(`✅ 클라이언트 확인: ${client.name}`)
  console.log(`   Agency ID: ${client.agency_id}\n`)
  
  // created_by를 위한 사용자 찾기 (해당 클라이언트에 속한 사용자)
  // client_members 테이블에서 사용자 찾기
  const { data: clientMembers } = await admin
    .from('client_members')
    .select('user_id')
    .eq('client_id', clientId)
    .limit(1)
  
  let createdBy: string | null = null
  if (clientMembers && clientMembers.length > 0) {
    createdBy = clientMembers[0].user_id
    console.log(`✅ 사용자 ID 확인: ${createdBy}\n`)
  } else {
    // 에이전시 멤버에서 찾기
    const { data: agencyMembers } = await admin
      .from('agency_members')
      .select('user_id')
      .eq('agency_id', client.agency_id)
      .limit(1)
    
    if (agencyMembers && agencyMembers.length > 0) {
      createdBy = agencyMembers[0].user_id
      console.log(`✅ 에이전시 멤버 사용자 ID 확인: ${createdBy}\n`)
    } else {
      console.log('⚠️ 클라이언트 또는 에이전시에 속한 사용자를 찾을 수 없습니다.')
      console.log('   created_by는 null로 설정됩니다. (DB 제약 조건에 따라 실패할 수 있습니다.)\n')
    }
  }
  
  // public_path 중복 확인
  const { data: existingCampaign } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path')
    .eq('client_id', clientId)
    .eq('public_path', publicPath)
    .maybeSingle()
  
  if (existingCampaign) {
    console.log('⚠️ 이미 같은 public_path를 가진 캠페인이 있습니다:')
    console.log(`   ID: ${existingCampaign.id}`)
    console.log(`   제목: ${existingCampaign.title}`)
    console.log(`   경로: ${existingCampaign.public_path}`)
    console.log('\n기존 캠페인을 사용하시겠습니까?')
    console.log(`\n접속 URL: http://localhost:3000/event${publicPath}`)
    return
  }
  
  // 캠페인 생성
  console.log('📝 캠페인 생성 중...')
  
  if (!createdBy) {
    console.error('❌ created_by가 필요합니다. 클라이언트에 속한 사용자가 없습니다.')
    console.log('\n해결 방법:')
    console.log('1. 웹 UI에서 등록 페이지를 생성하거나')
    console.log('2. 해당 클라이언트에 사용자를 추가하세요.')
    return
  }
  
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .insert({
      agency_id: client.agency_id,
      client_id: clientId,
      title,
      public_path: publicPath,
      status,
      type,
      form_id: null, // 등록 페이지는 폼이 없음
      welcome_schema: null,
      completion_schema: null,
      display_schema: null,
      next_survey_no: 1,
      created_by: createdBy,
    })
    .select()
    .single()
  
  if (campaignError) {
    console.error('❌ 캠페인 생성 실패:', campaignError)
    return
  }
  
  console.log('✅ 캠페인 생성 성공!\n')
  console.log('📋 생성된 캠페인 정보:')
  console.log(`   ID: ${campaign.id}`)
  console.log(`   제목: ${campaign.title}`)
  console.log(`   타입: ${campaign.type}`)
  console.log(`   상태: ${campaign.status}`)
  console.log(`   공개 경로: ${campaign.public_path}\n`)
  
  console.log('🔗 접속 URL:')
  console.log(`   로컬: http://localhost:3000/event${publicPath}`)
  console.log(`   프로덕션: https://eventflow.kr/event${publicPath}\n`)
  
  console.log('🧪 테스트 URL (UTM 포함):')
  console.log(`   http://localhost:3000/event${publicPath}?utm_source=test&utm_medium=email&utm_campaign=modu_reg_test\n`)
  
  console.log('🧪 테스트 URL (CID 포함):')
  console.log(`   http://localhost:3000/event${publicPath}?cid=KYYV8F87\n`)
  
  console.log('✅ 등록 페이지 생성 완료!')
}

createModuRegistration().catch(console.error)
