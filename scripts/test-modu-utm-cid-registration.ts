/**
 * 모두의특강 UTM/CID 테스트 스크립트
 * 
 * 1. 테스트 링크 생성
 * 2. 등록 후 DB에서 UTM/CID 저장 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const CAMPAIGN_ID = 'd220d5dc-1f01-4b1b-9c33-e1badd793e98' // 모두의특강 테스트 등록 페이지
const BASE_URL = 'https://eventflow.kr'

async function testModuUTMCID() {
  const admin = createAdminSupabase()
  
  console.log('🧪 모두의특강 UTM/CID 테스트\n')
  console.log('=' .repeat(60))
  
  // 1. 테스트 링크 생성
  console.log('\n📋 테스트 링크 생성\n')
  
  const utmParams = {
    utm_source: 'test_email',
    utm_medium: 'email',
    utm_campaign: 'modu_utm_test_2026',
    utm_term: 'test_term',
    utm_content: 'test_content',
  }
  
  const cid = 'TESTCID123'
  
  const queryParams = new URLSearchParams({
    ...utmParams,
    cid,
  }).toString()
  
  const testUrl = `${BASE_URL}/event/test-registration-modu/register?${queryParams}`
  
  console.log('✅ UTM + CID 포함 테스트 링크:')
  console.log(`   ${testUrl}\n`)
  
  console.log('📝 포함된 파라미터:')
  console.log(`   - utm_source: ${utmParams.utm_source}`)
  console.log(`   - utm_medium: ${utmParams.utm_medium}`)
  console.log(`   - utm_campaign: ${utmParams.utm_campaign}`)
  console.log(`   - utm_term: ${utmParams.utm_term}`)
  console.log(`   - utm_content: ${utmParams.utm_content}`)
  console.log(`   - cid: ${cid}\n`)
  
  // 2. 최근 등록 데이터 확인
  console.log('=' .repeat(60))
  console.log('\n🔍 최근 등록 데이터 확인 (UTM/CID 저장 상태)\n')
  
  const { data: recentEntries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select(`
      id,
      campaign_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      marketing_campaign_link_id,
      registration_data,
      created_at
    `)
    .eq('campaign_id', CAMPAIGN_ID)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError)
    return
  }
  
  if (!recentEntries || recentEntries.length === 0) {
    console.log('⚠️  등록 데이터가 없습니다.')
    console.log('   위 링크로 접속하여 등록을 진행해주세요.\n')
    return
  }
  
  console.log(`✅ 최근 등록 ${recentEntries.length}건 발견\n`)
  
  recentEntries.forEach((entry, index) => {
    console.log(`📌 등록 #${index + 1}`)
    console.log(`   ID: ${entry.id}`)
    console.log(`   생성일: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
    console.log(`   UTM Source: ${entry.utm_source || '❌ 없음'}`)
    console.log(`   UTM Medium: ${entry.utm_medium || '❌ 없음'}`)
    console.log(`   UTM Campaign: ${entry.utm_campaign || '❌ 없음'}`)
    console.log(`   UTM Term: ${entry.utm_term || '❌ 없음'}`)
    console.log(`   UTM Content: ${entry.utm_content || '❌ 없음'}`)
    
    // CID는 registration_data에서 확인
    let cidValue = null
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      cidValue = regData.cid || regData.CID || null
    }
    console.log(`   CID: ${cidValue || '❌ 없음'}`)
    
    console.log(`   Marketing Link ID: ${entry.marketing_campaign_link_id || '❌ 없음'}`)
    console.log('')
  })
  
  // 3. UTM 저장률 통계
  console.log('=' .repeat(60))
  console.log('\n📊 UTM 저장률 통계\n')
  
  const totalCount = recentEntries.length
  const utmSourceCount = recentEntries.filter(e => e.utm_source).length
  const utmMediumCount = recentEntries.filter(e => e.utm_medium).length
  const utmCampaignCount = recentEntries.filter(e => e.utm_campaign).length
  const cidCount = recentEntries.filter(e => {
    if (e.registration_data && typeof e.registration_data === 'object') {
      const regData = e.registration_data as any
      return !!(regData.cid || regData.CID)
    }
    return false
  }).length
  
  console.log(`   전체 등록: ${totalCount}건`)
  console.log(`   UTM Source 저장: ${utmSourceCount}건 (${((utmSourceCount / totalCount) * 100).toFixed(1)}%)`)
  console.log(`   UTM Medium 저장: ${utmMediumCount}건 (${((utmMediumCount / totalCount) * 100).toFixed(1)}%)`)
  console.log(`   UTM Campaign 저장: ${utmCampaignCount}건 (${((utmCampaignCount / totalCount) * 100).toFixed(1)}%)`)
  console.log(`   CID 저장: ${cidCount}건 (${((cidCount / totalCount) * 100).toFixed(1)}%)\n`)
  
  // 4. 테스트 결과 요약
  console.log('=' .repeat(60))
  console.log('\n✅ 테스트 결과 요약\n')
  
  if (utmSourceCount > 0 && utmMediumCount > 0) {
    console.log('✅ UTM 시스템 정상 동작 중')
  } else {
    console.log('⚠️  UTM 저장이 확인되지 않았습니다.')
    console.log('   위 테스트 링크로 등록을 진행해주세요.\n')
  }
  
  if (cidCount > 0) {
    console.log('✅ CID 저장 정상 동작 중')
  } else {
    console.log('⚠️  CID 저장이 확인되지 않았습니다.')
    console.log('   위 테스트 링크(cid=TESTCID123 포함)로 등록을 진행해주세요.\n')
  }
  
  console.log('\n📝 다음 단계:')
  console.log(`   1. 위 테스트 링크로 접속: ${testUrl}`)
  console.log('   2. 등록 폼 작성 및 제출')
  console.log('   3. 이 스크립트를 다시 실행하여 저장 확인\n')
}

testModuUTMCID().catch(console.error)
