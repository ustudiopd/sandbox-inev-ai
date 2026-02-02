/**
 * survey_no 176, 177 데이터 찾기 및 복구
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findAndRestore176177(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('survey_no 176, 177 데이터 찾기 및 복구')
  console.log('='.repeat(80))
  console.log('')
  
  // 찾을 데이터
  const targetData = [
    {
      survey_no: 177,
      name: '신홍동',
      company: '세원테크놀로지',
      position: '과장',
      phone_end: '5739',
      date: '2026-02-03',
      time: '02:39',
    },
    {
      survey_no: 176,
      name: '김인섭',
      company: '보람시스템',
      position: '대리',
      phone_end: '8357',
      date: '2026-02-03',
      time: '02:05',
    },
  ]
  
  // 1. 이름과 전화번호로 검색
  console.log('1. 데이터 검색')
  console.log('-'.repeat(80))
  
  const foundEntries: any[] = []
  
  for (const target of targetData) {
    console.log(`검색 중: ${target.name} (전화번호 끝자리: ${target.phone_end})`)
    
    // 이름으로 검색
    const { data: byName } = await admin
      .from('event_survey_entries')
      .select('*')
      .eq('campaign_id', campaignId)
      .ilike('name', `%${target.name}%`)
      .order('completed_at', { ascending: false })
    
    if (byName && byName.length > 0) {
      console.log(`  이름으로 찾음: ${byName.length}개`)
      
      // 전화번호 끝자리로 필터링
      const matched = byName.find((e: any) => {
        const phone = e.phone_norm || ''
        return phone.endsWith(target.phone_end)
      })
      
      if (matched) {
        console.log(`  ✅ 매칭됨: survey_no ${matched.survey_no}, 전화번호 ${matched.phone_norm}`)
        foundEntries.push({
          ...matched,
          target_survey_no: target.survey_no,
        })
      } else {
        console.log(`  ⚠️  전화번호 매칭 실패`)
        byName.slice(0, 3).forEach((e: any) => {
          console.log(`    - survey_no ${e.survey_no}, 전화번호 ${e.phone_norm || '-'}`)
        })
      }
    } else {
      // 전화번호 끝자리로 검색
      const { data: allEntries } = await admin
        .from('event_survey_entries')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('completed_at', { ascending: false })
        .limit(1000)
      
      const matchedByPhone = allEntries?.find((e: any) => {
        const phone = e.phone_norm || ''
        return phone.endsWith(target.phone_end)
      })
      
      if (matchedByPhone) {
        console.log(`  ✅ 전화번호로 찾음: survey_no ${matchedByPhone.survey_no}, 이름 ${matchedByPhone.name}`)
        foundEntries.push({
          ...matchedByPhone,
          target_survey_no: target.survey_no,
        })
      } else {
        console.log(`  ❌ 찾을 수 없음`)
      }
    }
    
    console.log('')
  }
  
  console.log(`총 ${foundEntries.length}개 찾음`)
  console.log('')
  
  if (foundEntries.length === 0) {
    console.log('⚠️  데이터를 찾을 수 없습니다.')
    console.log('   수동으로 입력해야 할 수 있습니다.')
    return
  }
  
  // 2. survey_no 업데이트
  console.log('2. survey_no 업데이트')
  console.log('-'.repeat(80))
  
  for (const entry of foundEntries) {
    const currentSurveyNo = entry.survey_no
    const targetSurveyNo = entry.target_survey_no
    
    if (currentSurveyNo === targetSurveyNo) {
      console.log(`  ✅ ${entry.name}: 이미 survey_no ${targetSurveyNo}입니다.`)
      continue
    }
    
    // 기존 survey_no가 있는지 확인
    const { data: existing } = await admin
      .from('event_survey_entries')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('survey_no', targetSurveyNo)
      .maybeSingle()
    
    if (existing) {
      console.log(`  ⚠️  survey_no ${targetSurveyNo}가 이미 사용 중입니다.`)
      continue
    }
    
    // code6도 업데이트
    const code6 = String(targetSurveyNo).padStart(6, '0')
    
    // 업데이트
    const { error } = await admin
      .from('event_survey_entries')
      .update({
        survey_no: targetSurveyNo,
        code6: code6,
      })
      .eq('id', entry.id)
    
    if (error) {
      console.error(`  ❌ ${entry.name}: 업데이트 실패 - ${error.message}`)
    } else {
      console.log(`  ✅ ${entry.name}: survey_no ${currentSurveyNo} → ${targetSurveyNo}`)
    }
  }
  
  console.log('')
  
  // 3. 최종 확인
  console.log('3. 최종 확인')
  console.log('-'.repeat(80))
  
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('survey_no, name, phone_norm')
    .eq('campaign_id', campaignId)
    .in('survey_no', [176, 177])
    .order('survey_no', { ascending: true })
  
  console.log(`survey_no 176, 177 데이터: ${finalEntries?.length || 0}개`)
  
  if (finalEntries && finalEntries.length > 0) {
    finalEntries.forEach((e: any) => {
      console.log(`  ${e.survey_no}: ${e.name} (${e.phone_norm})`)
    })
  }
  
  // 전체 확인
  const { data: allFinal } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .not('name', 'ilike', '%[보정]%')
    .not('name', 'ilike', '%[복구]%')
    .order('survey_no', { ascending: true })
  
  const finalCount = allFinal?.length || 0
  const finalSurveyNos = allFinal?.map(e => e.survey_no).filter(Boolean).sort((a, b) => a - b) || []
  
  console.log('')
  console.log(`전체 실제 데이터: ${finalCount}개`)
  if (finalSurveyNos.length > 0) {
    console.log(`survey_no 범위: ${finalSurveyNos[0]} ~ ${finalSurveyNos[finalSurveyNos.length - 1]}`)
  }
  
  // 누락 확인
  const missing: number[] = []
  for (let i = 1; i <= 177; i++) {
    if (!finalSurveyNos.includes(i)) {
      missing.push(i)
    }
  }
  
  if (missing.length === 0) {
    console.log('')
    console.log('✅ survey_no 1~177 모두 복구되었습니다!')
  } else {
    console.log('')
    console.log(`⚠️  누락된 survey_no: ${missing.length}개`)
    console.log(`  ${missing.join(', ')}`)
  }
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

findAndRestore176177(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
