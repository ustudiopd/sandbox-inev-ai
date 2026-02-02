/**
 * 전체 데이터에서 176, 177 찾기
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function searchAllFor176177(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('전체 데이터에서 176, 177 찾기')
  console.log('='.repeat(80))
  console.log('')
  
  // 찾을 데이터
  const targets = [
    { name: '신홍동', phone_end: '5739', company: '세원테크놀로지' },
    { name: '김인섭', phone_end: '8357', company: '보람시스템' },
  ]
  
  // 전체 데이터 조회
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('completed_at', { ascending: false })
    .limit(500)
  
  console.log(`전체 데이터: ${allEntries?.length || 0}개 (최근 500개 확인)`)
  console.log('')
  
  // 각 타겟에 대해 검색
  for (const target of targets) {
    console.log(`검색: ${target.name} (전화번호 끝자리: ${target.phone_end}, 회사: ${target.company})`)
    console.log('-'.repeat(80))
    
    // 이름으로 검색
    const byName = allEntries?.filter((e: any) => 
      e.name && e.name.includes(target.name)
    ) || []
    
    // 전화번호 끝자리로 검색
    const byPhone = allEntries?.filter((e: any) => {
      const phone = e.phone_norm || ''
      return phone.endsWith(target.phone_end)
    }) || []
    
    // 회사명으로 검색
    const byCompany = allEntries?.filter((e: any) => {
      const company = e.company || e.registration_data?.company || ''
      return company.includes(target.company)
    }) || []
    
    console.log(`  이름 매칭: ${byName.length}개`)
    if (byName.length > 0) {
      byName.forEach((e: any) => {
        const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
        console.log(`    survey_no: ${e.survey_no}, 이름: ${e.name}, 전화: ${e.phone_norm}, 회사: ${e.company || e.registration_data?.company || '-'}, 날짜: ${dateStr}`)
      })
    }
    
    console.log(`  전화번호 매칭: ${byPhone.length}개`)
    if (byPhone.length > 0) {
      byPhone.forEach((e: any) => {
        const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
        console.log(`    survey_no: ${e.survey_no}, 이름: ${e.name}, 전화: ${e.phone_norm}, 회사: ${e.company || e.registration_data?.company || '-'}, 날짜: ${dateStr}`)
      })
    }
    
    console.log(`  회사명 매칭: ${byCompany.length}개`)
    if (byCompany.length > 0) {
      byCompany.forEach((e: any) => {
        const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
        console.log(`    survey_no: ${e.survey_no}, 이름: ${e.name}, 전화: ${e.phone_norm}, 회사: ${e.company || e.registration_data?.company || '-'}, 날짜: ${dateStr}`)
      })
    }
    
    // 매칭된 항목 찾기
    const matched = allEntries?.find((e: any) => {
      const nameMatch = e.name && e.name.includes(target.name)
      const phoneMatch = (e.phone_norm || '').endsWith(target.phone_end)
      const companyMatch = (e.company || e.registration_data?.company || '').includes(target.company)
      
      return (nameMatch && phoneMatch) || (nameMatch && companyMatch) || (phoneMatch && companyMatch)
    })
    
    if (matched) {
      console.log('')
      console.log(`  ✅ 매칭됨!`)
      console.log(`    survey_no: ${matched.survey_no}`)
      console.log(`    이름: ${matched.name}`)
      console.log(`    전화번호: ${matched.phone_norm}`)
      console.log(`    회사: ${matched.company || matched.registration_data?.company || '-'}`)
      console.log(`    날짜: ${new Date(matched.completed_at).toISOString().split('T')[0]}`)
    } else {
      console.log('')
      console.log(`  ❌ 정확한 매칭 없음`)
    }
    
    console.log('')
  }
  
  // 2026-02-03 데이터 확인
  console.log('2026-02-03 데이터 확인')
  console.log('-'.repeat(80))
  
  const feb03Entries = allEntries?.filter((e: any) => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    return dateStr === '2026-02-03'
  }) || []
  
  console.log(`2026-02-03 데이터: ${feb03Entries.length}개`)
  
  if (feb03Entries.length > 0) {
    console.log('')
    console.log('2026-02-03 데이터 목록:')
    feb03Entries.forEach((e: any) => {
      const timeStr = new Date(e.completed_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      console.log(`  survey_no: ${e.survey_no}, 이름: ${e.name}, 전화: ${e.phone_norm}, 회사: ${e.company || e.registration_data?.company || '-'}, 시간: ${timeStr}`)
    })
  }
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

searchAllFor176177(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
