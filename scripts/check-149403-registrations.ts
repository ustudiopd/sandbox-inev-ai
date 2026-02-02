/**
 * /149403 경로 가입자 Visit 및 UTM 기록 확인
 * 11시 50분 이후 가입한 5명의 데이터 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function check149403Registrations() {
  const admin = createAdminSupabase()
  
  console.log('🔍 /149403 경로 가입자 Visit 및 UTM 기록 확인\n')
  
  // 어제(2월 2일) 한국 시간 기준 11시 50분
  // 한국 시간을 UTC로 변환: KST = UTC+9
  const targetDate = new Date('2026-02-02T11:50:00+09:00') // KST 2026-02-02 11:50
  const kst1150 = new Date(targetDate.getTime() - 9 * 60 * 60 * 1000) // UTC로 변환
  
  console.log('📅 조회 기간:')
  console.log(`   한국 시간: 2026-02-02 11:50 이후`)
  console.log(`   UTC 시간: ${kst1150.toISOString()}\n`)
  
  // 1. /149403 경로와 관련된 캠페인 찾기
  console.log('1️⃣ 캠페인 정보 확인\n')
  const { data: campaigns, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, public_path, client_id')
    .or('public_path.eq./149403,public_path.eq.149403')
  
  if (campaignError) {
    console.error('❌ 캠페인 조회 실패:', campaignError)
    return
  }
  
  if (!campaigns || campaigns.length === 0) {
    console.log('   ⚠️  /149403 경로의 캠페인을 찾을 수 없습니다')
    console.log('   워트 랜딩 페이지일 수 있습니다 (WebinarFormWertPage)\n')
    
    // 워트 캠페인 ID 확인 (이전에 본 코드에서)
    const WERT_CAMPAIGN_ID = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
    console.log(`   워트 캠페인 ID로 조회 시도: ${WERT_CAMPAIGN_ID}\n`)
    
    const { data: wertCampaign } = await admin
      .from('event_survey_campaigns')
      .select('id, public_path, client_id')
      .eq('id', WERT_CAMPAIGN_ID)
      .single()
    
    if (wertCampaign) {
      console.log('   ✅ 워트 캠페인 찾음:')
      console.log(`      ID: ${wertCampaign.id}`)
      console.log(`      경로: ${wertCampaign.public_path}\n`)
      
      await checkRegistrations(admin, wertCampaign.id, kst1150)
    } else {
      console.log('   ❌ 워트 캠페인도 찾을 수 없습니다\n')
    }
  } else {
    campaigns.forEach(campaign => {
      console.log(`   ✅ 캠페인 찾음:`)
      console.log(`      ID: ${campaign.id}`)
      console.log(`      경로: ${campaign.public_path}\n`)
    })
    
    // 첫 번째 캠페인으로 조회
    await checkRegistrations(admin, campaigns[0].id, kst1150)
  }
}

async function checkRegistrations(admin: any, campaignId: string, fromTime: Date) {
  console.log(`2️⃣ ${campaignId} 캠페인의 11시 50분 이후 가입자 확인\n`)
  
  // 가입자 조회
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, name, company, created_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('created_at', fromTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (entriesError) {
    console.error('❌ 가입자 조회 실패:', entriesError)
    return
  }
  
  console.log(`   총 ${entries?.length || 0}명의 가입자 (11시 50분 이후)\n`)
  
  if (!entries || entries.length === 0) {
    console.log('   ⚠️  가입자가 없습니다\n')
    return
  }
  
  // 각 가입자별 상세 정보
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]
    const kstTime = new Date(new Date(entry.created_at).getTime() + 9 * 60 * 60 * 1000)
    console.log(`   가입자 #${index + 1}:`)
    console.log(`      이름: ${entry.name}`)
    console.log(`      회사: ${entry.company || 'N/A'}`)
    console.log(`      가입 시간 (KST): ${kstTime.toISOString().replace('T', ' ').substring(0, 19)}`)
    console.log(`      가입 시간 (UTC): ${entry.created_at}`)
    console.log(`      UTM Source: ${entry.utm_source || '❌ 없음'}`)
    console.log(`      UTM Medium: ${entry.utm_medium || '❌ 없음'}`)
    console.log(`      UTM Campaign: ${entry.utm_campaign || '❌ 없음'}`)
    console.log(`      UTM Term: ${entry.utm_term || '❌ 없음'}`)
    console.log(`      UTM Content: ${entry.utm_content || '❌ 없음'}`)
    console.log(`      marketing_campaign_link_id: ${entry.marketing_campaign_link_id || '❌ 없음'}`)
    
    // Visit 로그 확인 (시간 기반 매칭: 가입 시간 ±5분 내 Visit 확인)
    const entryTime = new Date(entry.created_at)
    const visitFromTime = new Date(entryTime.getTime() - 5 * 60 * 1000) // 5분 전
    const visitToTime = new Date(entryTime.getTime() + 5 * 60 * 1000) // 5분 후
    
    const { data: visits } = await admin
      .from('event_access_logs')
      .select('id, accessed_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, session_id')
      .eq('campaign_id', campaignId)
      .gte('accessed_at', visitFromTime.toISOString())
      .lte('accessed_at', visitToTime.toISOString())
      .order('accessed_at', { ascending: false })
      .limit(5)
    
    if (visits && visits.length > 0) {
      console.log(`      ✅ Visit 로그: ${visits.length}개 (가입 시간 ±5분 내)`)
      visits.forEach((visit: any, vIndex: number) => {
        const visitKstTime = new Date(new Date(visit.accessed_at).getTime() + 9 * 60 * 60 * 1000)
        console.log(`         Visit #${vIndex + 1}: ${visitKstTime.toISOString().replace('T', ' ').substring(0, 19)}`)
        console.log(`            session_id: ${visit.session_id || '없음'}`)
        console.log(`            UTM Source: ${visit.utm_source || '없음'}`)
        console.log(`            UTM Medium: ${visit.utm_medium || '없음'}`)
        console.log(`            UTM Campaign: ${visit.utm_campaign || '없음'}`)
        console.log(`            marketing_campaign_link_id: ${visit.marketing_campaign_link_id || '없음'}`)
      })
    } else {
      console.log(`      ❌ Visit 로그 없음 (가입 시간 ±5분 내)`)
    }
    
    console.log()
  }
  
  // 요약 통계
  console.log('3️⃣ 요약 통계\n')
  const withUTM = entries.filter((e: any) => 
    e.utm_source || e.utm_medium || e.utm_campaign
  ).length
  const withLinkId = entries.filter((e: any) => e.marketing_campaign_link_id).length
  
  console.log(`   총 가입자: ${entries.length}명`)
  console.log(`   UTM 있는 가입자: ${withUTM}명 (${(withUTM / entries.length * 100).toFixed(1)}%)`)
  console.log(`   marketing_campaign_link_id 있는 가입자: ${withLinkId}명 (${(withLinkId / entries.length * 100).toFixed(1)}%)\n`)
  
  // Visit 연결 확인 (시간 기반)
  console.log('4️⃣ Visit 연결 확인 (시간 기반: 가입 시간 ±5분 내)\n')
  let visitMatchedCount = 0
  for (const entry of entries) {
    const entryTime = new Date(entry.created_at)
    const visitFromTime = new Date(entryTime.getTime() - 5 * 60 * 1000)
    const visitToTime = new Date(entryTime.getTime() + 5 * 60 * 1000)
    
    const { count } = await admin
      .from('event_access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .gte('accessed_at', visitFromTime.toISOString())
      .lte('accessed_at', visitToTime.toISOString())
    
    if (count && count > 0) {
      visitMatchedCount++
    }
  }
  
  console.log(`   Visit 연결된 가입자: ${visitMatchedCount}명 / ${entries.length}명 (가입 시간 ±5분 내 Visit 존재)\n`)
}

check149403Registrations().catch(console.error)
