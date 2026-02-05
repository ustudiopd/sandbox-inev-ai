import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * HPE 클라이언트의 모든 이벤트 목록 조회
 */
async function listHPEEvents() {
  const admin = createAdminSupabase()

  console.log('='.repeat(60))
  console.log('HPE 클라이언트 이벤트 목록 조회')
  console.log('='.repeat(60))
  console.log('')

  // HPE 클라이언트 ID
  const hpeClientId = 'b621c16a-ec75-4256-a65d-b722a13d865c'

  // 클라이언트 정보 조회
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name')
    .eq('id', hpeClientId)
    .single()

  if (clientError || !client) {
    console.error('❌ 클라이언트를 찾을 수 없습니다:', clientError)
    process.exit(1)
  }

  console.log(`✅ 클라이언트: ${client.name} (${client.id})\n`)

  // 웨비나 목록 조회
  const { data: webinars, error: webinarsError } = await admin
    .from('webinars')
    .select('id, title, slug, type, created_at')
    .eq('client_id', hpeClientId)
    .order('created_at', { ascending: false })

  if (webinarsError) {
    console.error('❌ 웨비나 조회 실패:', webinarsError)
  } else {
    console.log(`📺 웨비나: ${webinars?.length || 0}개`)
    if (webinars && webinars.length > 0) {
      webinars.forEach((w: any, idx: number) => {
        const type = w.type || 'live'
        const date = new Date(w.created_at).toLocaleDateString('ko-KR')
        console.log(`  ${idx + 1}. [${type}] ${w.title || '(제목 없음)'}`)
        console.log(`     Slug: ${w.slug || '(없음)'} | 생성일: ${date}`)
      })
    }
    console.log('')
  }

  // 설문조사/등록 캠페인 목록 조회
  const { data: campaigns, error: campaignsError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path, type, status, created_at')
    .eq('client_id', hpeClientId)
    .order('created_at', { ascending: false })

  if (campaignsError) {
    console.error('❌ 캠페인 조회 실패:', campaignsError)
  } else {
    console.log(`📋 설문조사/등록 캠페인: ${campaigns?.length || 0}개`)
    if (campaigns && campaigns.length > 0) {
      campaigns.forEach((c: any, idx: number) => {
        const type = c.type || 'survey'
        const status = c.status || 'draft'
        const date = new Date(c.created_at).toLocaleDateString('ko-KR')
        console.log(`  ${idx + 1}. [${type}] ${c.title || '(제목 없음)'}`)
        console.log(`     경로: ${c.public_path || '(없음)'} | 상태: ${status} | 생성일: ${date}`)
      })
    }
    console.log('')
  }

  // 전체 통계
  const totalEvents = (webinars?.length || 0) + (campaigns?.length || 0)
  console.log(`📊 총 이벤트 수: ${totalEvents}개`)
  console.log(`   - 웨비나: ${webinars?.length || 0}개`)
  console.log(`   - 캠페인: ${campaigns?.length || 0}개`)
}

listHPEEvents()
  .then(() => {
    console.log('\n스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
