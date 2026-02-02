/**
 * 176, 177번 참가자의 이메일/전화번호로 UTM 정보 조회
 * - 신홍동 (177번, 전화: 01096345739)
 * - 김인섭 (176번, 전화: 01065148357)
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function check176177UTMByContact() {
  const admin = createAdminSupabase()
  
  console.log('🔍 176, 177번 참가자 UTM 정보 조회 (이메일/전화번호 기반)\n')
  
  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트 캠페인
  
  // 찾을 참가자 정보
  const targets = [
    { 
      name: '신홍동', 
      survey_no: 177,
      phone: '01096345739',
      phone_end: '5739',
      company: '세원테크놀로지'
    },
    { 
      name: '김인섭', 
      survey_no: 176,
      phone: '01065148357',
      phone_end: '8357',
      company: '보람시스템'
    },
  ]
  
  for (const target of targets) {
    console.log('='.repeat(80))
    console.log(`📋 ${target.name} (survey_no: ${target.survey_no})`)
    console.log('='.repeat(80))
    console.log('')
    
    // 1. 전화번호로 검색
    console.log('1️⃣ 전화번호로 검색')
    console.log('-'.repeat(80))
    
    const { data: byPhone, error: phoneError } = await admin
      .from('event_survey_entries')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('phone_norm', target.phone)
      .order('created_at', { ascending: false })
    
    if (phoneError) {
      console.error('❌ 전화번호 검색 실패:', phoneError)
    } else {
      console.log(`   검색 결과: ${byPhone?.length || 0}개`)
      
      if (byPhone && byPhone.length > 0) {
        byPhone.forEach((entry: any, index: number) => {
          console.log(`\n   항목 #${index + 1}:`)
          console.log(`      ID: ${entry.id}`)
          console.log(`      survey_no: ${entry.survey_no}`)
          console.log(`      code6: ${entry.code6}`)
          console.log(`      이름: ${entry.name}`)
          console.log(`      회사: ${entry.company || entry.registration_data?.company || 'N/A'}`)
          console.log(`      전화: ${entry.phone_norm}`)
          
          // 이메일 확인
          let email = null
          if (entry.registration_data && typeof entry.registration_data === 'object') {
            const regData = entry.registration_data as any
            email = regData.email || null
          }
          console.log(`      이메일: ${email || 'N/A'}`)
          
          console.log(`      생성일: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
          
          // UTM 정보
          const hasUTM = !!(entry.utm_source || entry.utm_medium || entry.utm_campaign)
          console.log(`\n      📊 UTM 정보:`)
          console.log(`         UTM 기록: ${hasUTM ? '✅ 있음' : '❌ 없음'}`)
          if (hasUTM) {
            console.log(`         utm_source: ${entry.utm_source || '없음'}`)
            console.log(`         utm_medium: ${entry.utm_medium || '없음'}`)
            console.log(`         utm_campaign: ${entry.utm_campaign || '없음'}`)
            console.log(`         utm_term: ${entry.utm_term || '없음'}`)
            console.log(`         utm_content: ${entry.utm_content || '없음'}`)
          }
          
          console.log(`\n      🔗 링크 정보:`)
          console.log(`         marketing_campaign_link_id: ${entry.marketing_campaign_link_id || '❌ 없음'}`)
          
          // CID 확인
          let cid = null
          if (entry.registration_data && typeof entry.registration_data === 'object') {
            const regData = entry.registration_data as any
            cid = regData.cid || regData.CID || null
          }
          console.log(`         CID: ${cid || '없음'}`)
        })
      }
    }
    
    console.log('')
    
    // 2. 이름 + 전화번호 끝자리로 검색
    console.log('2️⃣ 이름 + 전화번호 끝자리로 검색')
    console.log('-'.repeat(80))
    
    const { data: allEntries } = await admin
      .from('event_survey_entries')
      .select('*')
      .eq('campaign_id', campaignId)
      .ilike('name', `%${target.name}%`)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (allEntries && allEntries.length > 0) {
      const matched = allEntries.filter((e: any) => {
        const phone = e.phone_norm || ''
        return phone.endsWith(target.phone_end)
      })
      
      console.log(`   검색 결과: ${matched.length}개`)
      
      if (matched.length > 0) {
        matched.forEach((entry: any, index: number) => {
          console.log(`\n   항목 #${index + 1}:`)
          console.log(`      survey_no: ${entry.survey_no}`)
          console.log(`      전화: ${entry.phone_norm}`)
          
          // 이메일 확인
          let email = null
          if (entry.registration_data && typeof entry.registration_data === 'object') {
            const regData = entry.registration_data as any
            email = regData.email || null
          }
          console.log(`      이메일: ${email || 'N/A'}`)
          
          // UTM 정보
          const hasUTM = !!(entry.utm_source || entry.utm_medium || entry.utm_campaign)
          console.log(`      UTM: ${hasUTM ? '✅ 있음' : '❌ 없음'}`)
          if (hasUTM) {
            console.log(`         Source: ${entry.utm_source || '없음'}`)
            console.log(`         Medium: ${entry.utm_medium || '없음'}`)
            console.log(`         Campaign: ${entry.utm_campaign || '없음'}`)
          }
        })
      }
    }
    
    console.log('')
    
    // 3. Visit 로그 확인 (가입 시간 ±30분)
    if (byPhone && byPhone.length > 0) {
      const entry = byPhone[0]
      const entryTime = new Date(entry.created_at)
      const visitFromTime = new Date(entryTime.getTime() - 30 * 60 * 1000) // 30분 전
      const visitToTime = new Date(entryTime.getTime() + 30 * 60 * 1000) // 30분 후
      
      console.log('3️⃣ Visit 로그 확인 (가입 시간 ±30분)')
      console.log('-'.repeat(80))
      
      const { data: visits } = await admin
        .from('event_access_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('accessed_at', visitFromTime.toISOString())
        .lte('accessed_at', visitToTime.toISOString())
        .order('accessed_at', { ascending: false })
      
      console.log(`   Visit 로그: ${visits?.length || 0}개`)
      
      if (visits && visits.length > 0) {
        // UTM이 있는 Visit만 필터링
        const visitsWithUTM = visits.filter((v: any) => 
          v.utm_source || v.utm_medium || v.utm_campaign
        )
        
        console.log(`   UTM 있는 Visit: ${visitsWithUTM.length}개`)
        
        visitsWithUTM.slice(0, 5).forEach((visit: any, vIndex: number) => {
          const visitKstTime = new Date(new Date(visit.accessed_at).getTime() + 9 * 60 * 60 * 1000)
          console.log(`\n   Visit #${vIndex + 1}:`)
          console.log(`      시간 (KST): ${visitKstTime.toISOString().replace('T', ' ').substring(0, 19)}`)
          console.log(`      session_id: ${visit.session_id || '없음'}`)
          console.log(`      utm_source: ${visit.utm_source || '없음'}`)
          console.log(`      utm_medium: ${visit.utm_medium || '없음'}`)
          console.log(`      utm_campaign: ${visit.utm_campaign || '없음'}`)
          console.log(`      marketing_campaign_link_id: ${visit.marketing_campaign_link_id || '없음'}`)
        })
      }
    }
    
    console.log('')
  }
  
  console.log('='.repeat(80))
  console.log('✅ 조회 완료')
}

check176177UTMByContact()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
