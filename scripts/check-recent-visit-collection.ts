/**
 * 최근 Visit 수집 상태 확인 스크립트
 * 
 * 확인 사항:
 * 1. 최근 1시간/30분/10분 내 Visit 수집 현황
 * 2. 시간대별 Visit 수집 추이
 * 3. 마지막 Visit 수집 시간
 * 4. 실시간 수집 활성도 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkRecentVisitCollection() {
  const admin = createAdminSupabase()
  
  console.log('🔍 최근 Visit 수집 상태 확인 시작...\n')
  
  const now = new Date()
  
  // 1. 최근 10분 내 Visit
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
  const { data: visits10min, error: error10min } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at')
    .gte('accessed_at', tenMinutesAgo.toISOString())
    .order('accessed_at', { ascending: false })
  
  // 2. 최근 30분 내 Visit
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
  const { data: visits30min, error: error30min } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at')
    .gte('accessed_at', thirtyMinutesAgo.toISOString())
    .order('accessed_at', { ascending: false })
  
  // 3. 최근 1시간 내 Visit
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const { data: visits1hour, error: error1hour } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at')
    .gte('accessed_at', oneHourAgo.toISOString())
    .order('accessed_at', { ascending: false })
  
  // 4. 최근 24시간 내 Visit
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const { data: visits24hour, error: error24hour } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at')
    .gte('accessed_at', twentyFourHoursAgo.toISOString())
    .order('accessed_at', { ascending: false })
  
  // 5. 가장 최근 Visit
  const { data: latestVisit, error: latestError } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at')
    .order('accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  console.log('📊 시간대별 Visit 수집 현황\n')
  
  if (error10min || error30min || error1hour || error24hour || latestError) {
    console.error('❌ 데이터 조회 실패:', error10min || error30min || error1hour || error24hour || latestError)
    return
  }
  
  console.log(`   최근 10분: ${visits10min?.length || 0}개`)
  console.log(`   최근 30분: ${visits30min?.length || 0}개`)
  console.log(`   최근 1시간: ${visits1hour?.length || 0}개`)
  console.log(`   최근 24시간: ${visits24hour?.length || 0}개`)
  console.log()
  
  // 가장 최근 Visit 정보
  if (latestVisit) {
    const latestTime = new Date(latestVisit.accessed_at)
    const diffMinutes = Math.floor((now.getTime() - latestTime.getTime()) / (60 * 1000))
    const diffSeconds = Math.floor((now.getTime() - latestTime.getTime()) / 1000)
    
    // 한국 시간(KST = UTC+9) 변환
    const kstLatestTime = new Date(latestTime.getTime() + 9 * 60 * 60 * 1000)
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    
    console.log('🕐 가장 최근 Visit 정보')
    console.log(`   ID: ${latestVisit.id}`)
    console.log(`   campaign_id: ${latestVisit.campaign_id || 'null'}`)
    console.log(`   webinar_id: ${latestVisit.webinar_id || 'null'}`)
    console.log(`   session_id: ${latestVisit.session_id}`)
    console.log(`   accessed_at (UTC): ${latestVisit.accessed_at}`)
    console.log(`   accessed_at (KST): ${kstLatestTime.toISOString().replace('T', ' ').substring(0, 19)}`)
    console.log(`   현재 시각 (UTC): ${now.toISOString()}`)
    console.log(`   현재 시각 (KST): ${kstNow.toISOString().replace('T', ' ').substring(0, 19)}`)
    console.log(`   경과 시간: ${diffMinutes}분 ${diffSeconds % 60}초 전`)
    console.log()
    
    if (diffMinutes < 10) {
      console.log('   ✅ 최근 10분 내 수집됨 (활발한 수집 중)')
    } else if (diffMinutes < 30) {
      console.log('   ⚠️  최근 30분 내 수집됨 (보통)')
    } else if (diffMinutes < 60) {
      console.log('   ⚠️  최근 1시간 내 수집됨 (활동 저조)')
    } else {
      console.log('   🔴 1시간 이상 수집 없음 (비활성 상태)')
    }
  } else {
    console.log('   🔴 Visit 데이터가 없습니다')
  }
  console.log()
  
  // 시간대별 분포 (최근 1시간)
  if (visits1hour && visits1hour.length > 0) {
    console.log('📈 최근 1시간 내 시간대별 분포 (10분 단위, KST)\n')
    
    const timeSlots: Record<string, number> = {}
    visits1hour.forEach(visit => {
      const visitTime = new Date(visit.accessed_at)
      // 한국 시간(KST = UTC+9) 변환
      const kstTime = new Date(visitTime.getTime() + 9 * 60 * 60 * 1000)
      const kstMinutes = kstTime.getUTCMinutes()
      const kstHours = kstTime.getUTCHours()
      const slot = `${Math.floor(kstMinutes / 10) * 10}분`
      const key = `${kstHours}시 ${slot}`
      timeSlots[key] = (timeSlots[key] || 0) + 1
    })
    
    Object.entries(timeSlots)
      .sort((a, b) => {
        // 시간순 정렬
        const [hourA, minA] = a[0].split('시 ').map(s => parseInt(s))
        const [hourB, minB] = b[0].split('시 ').map(s => parseInt(s))
        if (hourA !== hourB) return hourB - hourA
        return minB - minA
      })
      .forEach(([time, count]) => {
        console.log(`   ${time}: ${count}개`)
      })
    console.log()
  }
  
  // 실시간 수집 활성도 판정
  console.log('📊 실시간 수집 활성도 판정\n')
  
  const recent10minCount = visits10min?.length || 0
  const recent30minCount = visits30min?.length || 0
  const recent1hourCount = visits1hour?.length || 0
  
  if (recent10minCount > 0) {
    console.log('   ✅ 최근 10분 내 수집됨 - 실시간 수집 활성')
  } else if (recent30minCount > 0) {
    console.log('   ⚠️  최근 30분 내 수집됨 - 보통 수집')
  } else if (recent1hourCount > 0) {
    console.log('   ⚠️  최근 1시간 내 수집됨 - 활동 저조')
  } else {
    console.log('   🔴 최근 1시간 내 수집 없음 - 비활성 상태')
    console.log('   가능한 원인:')
    console.log('   1. 현재 트래픽이 없음')
    console.log('   2. Visit API 호출이 안 됨')
    console.log('   3. Visit API 호출은 되지만 DB 저장 실패')
  }
  
  console.log('\n✅ 확인 완료')
}

checkRecentVisitCollection().catch(console.error)
