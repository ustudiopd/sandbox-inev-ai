/**
 * 특정 5명 가입자의 Visit 및 UTM 기록 확인
 * - 신홍동 (177번)
 * - 김인섭 (176번)
 * - 신익주 (175번)
 * - 박무림 (174번)
 * - 김종수 (173번)
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkSpecific5Registrations() {
  const admin = createAdminSupabase()
  
  console.log('🔍 특정 5명 가입자의 Visit 및 UTM 기록 확인\n')
  
  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트 캠페인
  
  // 가입자 이름 목록
  const targetNames = ['신홍동', '김인섭', '신익주', '박무림', '김종수']
  
  console.log('1️⃣ 가입자 조회\n')
  
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, name, company, created_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, survey_no, code6')
    .eq('campaign_id', campaignId)
    .in('name', targetNames)
    .order('created_at', { ascending: false })
  
  if (entriesError) {
    console.error('❌ 가입자 조회 실패:', entriesError)
    return
  }
  
  console.log(`   총 ${entries?.length || 0}명의 가입자 찾음\n`)
  
  if (!entries || entries.length === 0) {
    console.log('   ⚠️  가입자가 없습니다\n')
    return
  }
  
  // 각 가입자별 상세 정보
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]
    const kstTime = new Date(new Date(entry.created_at).getTime() + 9 * 60 * 60 * 1000)
    console.log(`   가입자 #${index + 1}: ${entry.name} (${entry.code6})`)
    console.log(`      회사: ${entry.company || 'N/A'}`)
    console.log(`      가입 시간 (KST): ${kstTime.toISOString().replace('T', ' ').substring(0, 19)}`)
    console.log(`      가입 시간 (UTC): ${entry.created_at}`)
    
    // UTM 기록 확인
    const hasUTM = !!(entry.utm_source || entry.utm_medium || entry.utm_campaign)
    console.log(`      UTM 기록: ${hasUTM ? '✅ 있음' : '❌ 없음'}`)
    if (hasUTM) {
      console.log(`         UTM Source: ${entry.utm_source || '없음'}`)
      console.log(`         UTM Medium: ${entry.utm_medium || '없음'}`)
      console.log(`         UTM Campaign: ${entry.utm_campaign || '없음'}`)
      console.log(`         UTM Term: ${entry.utm_term || '없음'}`)
      console.log(`         UTM Content: ${entry.utm_content || '없음'}`)
    }
    
    console.log(`      marketing_campaign_link_id: ${entry.marketing_campaign_link_id || '❌ 없음'}`)
    
    // Visit 로그 확인 (가입 시간 ±10분 내)
    const entryTime = new Date(entry.created_at)
    const visitFromTime = new Date(entryTime.getTime() - 10 * 60 * 1000) // 10분 전
    const visitToTime = new Date(entryTime.getTime() + 10 * 60 * 1000) // 10분 후
    
    const { data: visits } = await admin
      .from('event_access_logs')
      .select('id, accessed_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, session_id')
      .eq('campaign_id', campaignId)
      .gte('accessed_at', visitFromTime.toISOString())
      .lte('accessed_at', visitToTime.toISOString())
      .order('accessed_at', { ascending: false })
    
    if (visits && visits.length > 0) {
      console.log(`      ✅ Visit 로그: ${visits.length}개 (가입 시간 ±10분 내)`)
      
      // UTM이 있는 Visit 개수
      const visitsWithUTM = visits.filter((v: any) => 
        v.utm_source || v.utm_medium || v.utm_campaign
      ).length
      const visitsWithLinkId = visits.filter((v: any) => v.marketing_campaign_link_id).length
      
      console.log(`         UTM 있는 Visit: ${visitsWithUTM}개`)
      console.log(`         marketing_campaign_link_id 있는 Visit: ${visitsWithLinkId}개`)
      
      // 가장 최근 Visit 3개만 상세 표시
      visits.slice(0, 3).forEach((visit: any, vIndex: number) => {
        const visitKstTime = new Date(new Date(visit.accessed_at).getTime() + 9 * 60 * 60 * 1000)
        const visitHasUTM = !!(visit.utm_source || visit.utm_medium || visit.utm_campaign)
        console.log(`         Visit #${vIndex + 1}: ${visitKstTime.toISOString().replace('T', ' ').substring(0, 19)}`)
        console.log(`            session_id: ${visit.session_id || '없음'}`)
        console.log(`            UTM: ${visitHasUTM ? '✅ 있음' : '❌ 없음'}`)
        if (visitHasUTM) {
          console.log(`               Source: ${visit.utm_source || '없음'}`)
          console.log(`               Medium: ${visit.utm_medium || '없음'}`)
          console.log(`               Campaign: ${visit.utm_campaign || '없음'}`)
        }
        console.log(`            marketing_campaign_link_id: ${visit.marketing_campaign_link_id || '없음'}`)
      })
    } else {
      console.log(`      ❌ Visit 로그 없음 (가입 시간 ±10분 내)`)
    }
    
    console.log()
  }
  
  // 요약 통계
  console.log('2️⃣ 요약 통계\n')
  const withUTM = entries.filter((e: any) => 
    e.utm_source || e.utm_medium || e.utm_campaign
  ).length
  const withLinkId = entries.filter((e: any) => e.marketing_campaign_link_id).length
  
  // Visit 연결 확인
  let visitMatchedCount = 0
  let visitsWithUTMCount = 0
  let visitsWithLinkIdCount = 0
  
  for (const entry of entries) {
    const entryTime = new Date(entry.created_at)
    const visitFromTime = new Date(entryTime.getTime() - 10 * 60 * 1000)
    const visitToTime = new Date(entryTime.getTime() + 10 * 60 * 1000)
    
    const { data: visits } = await admin
      .from('event_access_logs')
      .select('utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
      .eq('campaign_id', campaignId)
      .gte('accessed_at', visitFromTime.toISOString())
      .lte('accessed_at', visitToTime.toISOString())
    
    if (visits && visits.length > 0) {
      visitMatchedCount++
      const visitsWithUTM = visits.filter((v: any) => 
        v.utm_source || v.utm_medium || v.utm_campaign
      ).length
      const visitsWithLinkId = visits.filter((v: any) => v.marketing_campaign_link_id).length
      
      if (visitsWithUTM > 0) visitsWithUTMCount++
      if (visitsWithLinkId > 0) visitsWithLinkIdCount++
    }
  }
  
  console.log(`   총 가입자: ${entries.length}명`)
  console.log(`   UTM 있는 가입자: ${withUTM}명 (${(withUTM / entries.length * 100).toFixed(1)}%)`)
  console.log(`   marketing_campaign_link_id 있는 가입자: ${withLinkId}명 (${(withLinkId / entries.length * 100).toFixed(1)}%)`)
  console.log(`   Visit 연결된 가입자: ${visitMatchedCount}명 / ${entries.length}명`)
  console.log(`   Visit에 UTM 있는 가입자: ${visitsWithUTMCount}명 / ${visitMatchedCount}명`)
  console.log(`   Visit에 marketing_campaign_link_id 있는 가입자: ${visitsWithLinkIdCount}명 / ${visitMatchedCount}명\n`)
  
  // 최종 판정
  console.log('3️⃣ 최종 판정\n')
  if (withUTM === entries.length && visitMatchedCount === entries.length) {
    console.log('   ✅ 모든 가입자에게 UTM과 Visit이 기록되어 있습니다')
  } else {
    console.log('   ⚠️  일부 가입자에게 UTM 또는 Visit이 누락되었습니다')
  }
}

checkSpecific5Registrations().catch(console.error)
