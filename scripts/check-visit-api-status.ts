/**
 * Visit API 동작 상태 확인 스크립트
 * 
 * 확인 사항:
 * 1. Visit API가 실제로 호출되고 있는지
 * 2. Visit API가 성공하는지
 * 3. event_access_logs 테이블에 데이터가 저장되는지
 * 4. 최근 등록과 Visit의 연결 상태
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkVisitAPIStatus() {
  const admin = createAdminSupabase()
  
  console.log('🔍 Visit API 동작 상태 확인 시작...\n')
  
  // 1. 최근 등록 데이터 확인
  console.log('1️⃣ 최근 등록 데이터 확인 (오늘)')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data: recentEntries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError)
    return
  }
  
  console.log(`   - 오늘 등록 수: ${recentEntries?.length || 0}개`)
  if (recentEntries && recentEntries.length > 0) {
    console.log(`   - 최근 등록 시간: ${recentEntries[0]?.created_at}`)
  }
  console.log()
  
  // 2. 최근 Visit 로그 확인
  console.log('2️⃣ 최근 Visit 로그 확인 (오늘)')
  const { data: recentVisits, error: visitsError } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at')
    .gte('accessed_at', today.toISOString())
    .order('accessed_at', { ascending: false })
    .limit(20)
  
  if (visitsError) {
    console.error('❌ Visit 로그 조회 실패:', visitsError)
    return
  }
  
  console.log(`   - 오늘 Visit 수: ${recentVisits?.length || 0}개`)
  if (recentVisits && recentVisits.length > 0) {
    console.log(`   - 최근 Visit 시간: ${recentVisits[0]?.accessed_at}`)
    console.log(`   - campaign_id 있는 Visit: ${recentVisits.filter(v => v.campaign_id).length}개`)
    console.log(`   - webinar_id 있는 Visit: ${recentVisits.filter(v => v.webinar_id).length}개`)
  }
  console.log()
  
  // 3. 등록과 Visit 연결 확인 (시간 기반)
  console.log('3️⃣ 등록과 Visit 연결 확인 (오늘, 시간 기반)')
  if (recentEntries && recentEntries.length > 0 && recentVisits && recentVisits.length > 0) {
    const visitsWithSession = recentVisits.filter(v => v.session_id)
    
    console.log(`   - Visit 로그 수: ${recentVisits.length}개`)
    console.log(`   - session_id 있는 Visit: ${visitsWithSession.length}개`)
    
    // 시간 기반 매칭 (등록 시간 ±5분 내 Visit 확인)
    let matchedCount = 0
    recentEntries.forEach(entry => {
      const entryTime = new Date(entry.created_at).getTime()
      const matchedVisit = recentVisits.find(v => {
        const visitTime = new Date(v.accessed_at).getTime()
        const diff = Math.abs(entryTime - visitTime)
        return diff <= 5 * 60 * 1000 // 5분 이내
      })
      if (matchedVisit) matchedCount++
    })
    
    console.log(`   - 시간 기반 매칭 (등록 ±5분 내 Visit): ${matchedCount}개`)
    
    if (matchedCount === 0 && recentEntries.length > 0) {
      console.log('   ⚠️ 경고: 등록은 있지만 Visit가 매칭되지 않음')
    }
  } else {
    console.log('   - 비교할 데이터가 부족함')
  }
  console.log()
  
  // 4. 캠페인별 Visit 통계
  console.log('4️⃣ 캠페인별 Visit 통계 (오늘)')
  if (recentVisits && recentVisits.length > 0) {
    const campaignVisitMap = new Map<string, number>()
    recentVisits.forEach(v => {
      const key = v.campaign_id || v.webinar_id || 'unknown'
      campaignVisitMap.set(key, (campaignVisitMap.get(key) || 0) + 1)
    })
    
    console.log('   캠페인/웨비나별 Visit 수:')
    Array.from(campaignVisitMap.entries()).forEach(([id, count]) => {
      console.log(`   - ${id}: ${count}개`)
    })
  } else {
    console.log('   - Visit 데이터 없음')
  }
  console.log()
  
  // 5. 최근 등록의 campaign_id 확인
  console.log('5️⃣ 최근 등록의 campaign_id 확인')
  if (recentEntries && recentEntries.length > 0) {
    const campaignMap = new Map<string, number>()
    recentEntries.forEach(e => {
      const key = e.campaign_id || 'unknown'
      campaignMap.set(key, (campaignMap.get(key) || 0) + 1)
    })
    
    console.log('   캠페인별 등록 수:')
    Array.from(campaignMap.entries()).forEach(([id, count]) => {
      console.log(`   - ${id}: ${count}개`)
    })
  }
  console.log()
  
  // 6. 종합 판정
  console.log('📊 종합 판정')
  const hasEntries = (recentEntries?.length || 0) > 0
  const hasVisits = (recentVisits?.length || 0) > 0
  
  if (!hasEntries) {
    console.log('   ⚠️ 오늘 등록 데이터가 없음 (정상)')
  } else if (!hasVisits) {
    console.log('   🔴 문제: 등록은 있지만 Visit 로그가 없음')
    console.log('   가능한 원인:')
    console.log('   1. Visit API가 호출되지 않음 (클라이언트 코드 문제)')
    console.log('   2. Visit API가 호출되지만 실패함 (서버 로그 확인 필요)')
    console.log('   3. Visit API가 호출되고 성공하지만 DB 저장 실패')
  } else {
    const visitRate = ((recentVisits?.length || 0) / (recentEntries?.length || 1)) * 100
    console.log(`   ✅ Visit 추적률: ${visitRate.toFixed(1)}%`)
    
    if (visitRate < 50) {
      console.log('   ⚠️ 경고: Visit 추적률이 낮음 (50% 미만)')
    }
  }
  
  console.log('\n✅ 확인 완료')
}

checkVisitAPIStatus().catch(console.error)
