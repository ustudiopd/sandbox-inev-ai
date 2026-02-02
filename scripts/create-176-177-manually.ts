/**
 * survey_no 176, 177 수동 생성
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function create176177Manually(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('survey_no 176, 177 수동 생성')
  console.log('='.repeat(80))
  console.log('')
  
  // 생성할 데이터
  const entriesToCreate = [
    {
      survey_no: 177,
      code6: '000177',
      name: '신홍동',
      company: '세원테크놀로지',
      position: '과장',
      phone_norm: '01096345739', // 끝자리 5739
      completed_at: new Date('2026-02-03T02:39:00+09:00').toISOString(), // 2026-02-03 오전 02:39 KST
    },
    {
      survey_no: 176,
      code6: '000176',
      name: '김인섭',
      company: '보람시스템',
      position: '대리',
      phone_norm: '01065148357', // 끝자리 8357
      completed_at: new Date('2026-02-03T02:05:00+09:00').toISOString(), // 2026-02-03 오전 02:05 KST
    },
  ]
  
  // 1. 기존 데이터 확인
  console.log('1. 기존 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: existing } = await admin
    .from('event_survey_entries')
    .select('survey_no, name')
    .eq('campaign_id', campaignId)
    .in('survey_no', [176, 177])
  
  if (existing && existing.length > 0) {
    console.log('기존 데이터:')
    existing.forEach((e: any) => {
      console.log(`  survey_no ${e.survey_no}: ${e.name}`)
    })
    console.log('')
    console.log('⚠️  이미 데이터가 존재합니다. 삭제 후 재생성할까요?')
    return
  }
  
  console.log('기존 데이터 없음')
  console.log('')
  
  // 2. 최대 survey_no 확인 (중복 방지)
  const { data: maxSurveyNoData } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  const maxSurveyNo = maxSurveyNoData?.survey_no || 0
  console.log(`현재 최대 survey_no: ${maxSurveyNo}`)
  console.log('')
  
  // 3. 데이터 생성
  console.log('2. 데이터 생성')
  console.log('-'.repeat(80))
  
  for (const entry of entriesToCreate) {
    // KST를 UTC로 변환
    const kstDate = new Date(entry.completed_at)
    const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000)
    
    const entryData = {
      campaign_id: campaignId,
      client_id: clientId,
      name: entry.name,
      company: entry.company,
      phone_norm: entry.phone_norm,
      survey_no: entry.survey_no,
      code6: entry.code6,
      completed_at: utcDate.toISOString(),
      registration_data: {
        company: entry.company,
        position: entry.position,
      },
    }
    
    const { error } = await admin
      .from('event_survey_entries')
      .insert(entryData)
    
    if (error) {
      console.error(`  ❌ ${entry.name} (survey_no ${entry.survey_no}): ${error.message}`)
      
      // unique constraint 오류인 경우 업데이트 시도
      if (error.code === '23505') {
        console.log(`  업데이트 시도...`)
        const { error: updateError } = await admin
          .from('event_survey_entries')
          .update({
            name: entry.name,
            company: entry.company,
            phone_norm: entry.phone_norm,
            completed_at: utcDate.toISOString(),
            registration_data: {
              company: entry.company,
              position: entry.position,
            },
          })
          .eq('campaign_id', campaignId)
          .eq('survey_no', entry.survey_no)
        
        if (updateError) {
          console.error(`  ❌ 업데이트 실패: ${updateError.message}`)
        } else {
          console.log(`  ✅ 업데이트 완료`)
        }
      }
    } else {
      console.log(`  ✅ ${entry.name} (survey_no ${entry.survey_no}) 생성 완료`)
    }
  }
  
  console.log('')
  
  // 4. 최종 확인
  console.log('3. 최종 확인')
  console.log('-'.repeat(80))
  
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('survey_no, name, phone_norm, completed_at, company')
    .eq('campaign_id', campaignId)
    .in('survey_no', [176, 177])
    .order('survey_no', { ascending: true })
  
  console.log(`survey_no 176, 177 데이터: ${finalEntries?.length || 0}개`)
  
  if (finalEntries && finalEntries.length > 0) {
    finalEntries.forEach((e: any) => {
      const dateStr = new Date(e.completed_at).toLocaleString('ko-KR')
      console.log(`  ${e.survey_no}: ${e.name} (${e.phone_norm}) - ${e.company || '-'} - ${dateStr}`)
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

create176177Manually(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
