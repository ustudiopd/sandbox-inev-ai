/**
 * 워트인텔리전트 이벤트 캠페인 찾기 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 여러 형식으로 검색
    const searchPaths = ['149403', '/149403', '149403/', '/149403/']
    
    console.log('🔍 이벤트 캠페인 검색 중...\n')
    
    for (const searchPath of searchPaths) {
      const { data: campaigns } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, client_id, agency_id, type, status')
        .or(`public_path.eq.${searchPath},public_path.eq.${searchPath.replace(/^\//, '')},public_path.eq.${searchPath.replace(/\/$/, '')}`)
        .limit(10)
      
      if (campaigns && campaigns.length > 0) {
        console.log(`✅ 검색 경로 "${searchPath}"에서 ${campaigns.length}개 발견:`)
        campaigns.forEach(c => {
          console.log(`   - ID: ${c.id}`)
          console.log(`     제목: ${c.title}`)
          console.log(`     Public Path: ${c.public_path}`)
          console.log(`     클라이언트 ID: ${c.client_id}`)
          console.log(`     에이전시 ID: ${c.agency_id}`)
          console.log(`     타입: ${c.type}`)
          console.log(`     상태: ${c.status}`)
          console.log('')
        })
      }
    }
    
    // "Wert" 또는 "워트"가 포함된 모든 캠페인 검색
    console.log('\n🔍 "Wert" 또는 "워트"가 포함된 모든 캠페인 검색...\n')
    const { data: wertCampaigns } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id, agency_id, type, status')
      .or('title.ilike.%Wert%,title.ilike.%워트%,title.ilike.%wert%')
      .limit(20)
    
    if (wertCampaigns && wertCampaigns.length > 0) {
      console.log(`✅ ${wertCampaigns.length}개 발견:`)
      wertCampaigns.forEach(c => {
        console.log(`   - ID: ${c.id}`)
        console.log(`     제목: ${c.title}`)
        console.log(`     Public Path: ${c.public_path}`)
        console.log(`     클라이언트 ID: ${c.client_id}`)
        console.log(`     에이전시 ID: ${c.agency_id}`)
        console.log(`     타입: ${c.type}`)
        console.log(`     상태: ${c.status}`)
        console.log('')
      })
    } else {
      console.log('⚠️  "Wert" 관련 캠페인을 찾을 수 없습니다.')
    }
    
    // 최근 생성된 캠페인 10개 확인
    console.log('\n🔍 최근 생성된 캠페인 10개 확인...\n')
    const { data: recentCampaigns } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id, agency_id, type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentCampaigns && recentCampaigns.length > 0) {
      console.log(`✅ 최근 캠페인 ${recentCampaigns.length}개:`)
      recentCampaigns.forEach(c => {
        console.log(`   - ID: ${c.id}`)
        console.log(`     제목: ${c.title}`)
        console.log(`     Public Path: ${c.public_path}`)
        console.log(`     클라이언트 ID: ${c.client_id}`)
        console.log(`     에이전시 ID: ${c.agency_id}`)
        console.log(`     타입: ${c.type}`)
        console.log(`     상태: ${c.status}`)
        console.log(`     생성일: ${c.created_at}`)
        console.log('')
      })
    }
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
