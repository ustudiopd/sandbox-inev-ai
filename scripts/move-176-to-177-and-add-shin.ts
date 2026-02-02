/**
 * 176번 최진욱을 177번으로 이동하고, 신홍동을 176번으로 추가
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function move176To177AndAddShin() {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('176번 → 177번 이동 및 신홍동 176번 추가')
  console.log('='.repeat(80))
  console.log('')
  
  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트 캠페인
  const clientId = '55317496-d3d6-4e65-81d3-405892de78ab'
  
  // 1. 현재 176번 데이터 확인
  console.log('1. 현재 176번 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: current176, error: current176Error } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('survey_no', 176)
    .maybeSingle()
  
  if (current176Error) {
    console.error('❌ 176번 조회 실패:', current176Error)
    return
  }
  
  if (!current176) {
    console.log('⚠️  176번 데이터가 없습니다.')
  } else {
    console.log(`✅ 176번 데이터 발견: ${current176.name} (${current176.code6})`)
    console.log(`   이메일: ${current176.registration_data?.email || 'N/A'}`)
    console.log(`   전화: ${current176.phone_norm || 'N/A'}`)
  }
  
  // 2. 현재 177번 데이터 확인
  console.log('')
  console.log('2. 현재 177번 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: current177, error: current177Error } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('survey_no', 177)
    .maybeSingle()
  
  if (current177Error) {
    console.error('❌ 177번 조회 실패:', current177Error)
    return
  }
  
  if (current177) {
    console.log(`⚠️  177번 데이터가 이미 존재합니다: ${current177.name} (${current177.code6})`)
    console.log('   기존 177번 데이터를 삭제하시겠습니까? (스크립트 수정 필요)')
    return
  } else {
    console.log('✅ 177번 자리가 비어있습니다.')
  }
  
  // 3. 176번을 177번으로 이동
  if (current176) {
    console.log('')
    console.log('3. 176번 → 177번 이동')
    console.log('-'.repeat(80))
    
    const { error: updateError } = await admin
      .from('event_survey_entries')
      .update({
        survey_no: 177,
        code6: '000177',
      })
      .eq('campaign_id', campaignId)
      .eq('survey_no', 176)
    
    if (updateError) {
      console.error('❌ 이동 실패:', updateError)
      return
    }
    
    console.log(`✅ ${current176.name}을(를) 177번으로 이동 완료`)
  }
  
  // 4. 신홍동을 176번으로 추가
  console.log('')
  console.log('4. 신홍동 176번 추가')
  console.log('-'.repeat(80))
  
  // 완료일시를 KST에서 UTC로 변환
  const completedAtKST = new Date('2026-02-03T02:39:00+09:00')
  const completedAtUTC = new Date(completedAtKST.getTime() - 9 * 60 * 60 * 1000)
  
  const shinEntry = {
    campaign_id: campaignId,
    client_id: clientId,
    survey_no: 176,
    code6: '000176',
    name: '신홍동',
    company: '세원테크놀로지',
    phone_norm: '01096345739',
    completed_at: completedAtUTC.toISOString(),
    utm_source: 'stibee',
    utm_medium: 'email',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    marketing_campaign_link_id: 'c0f38538-5763-4129-a5d5-544268d3b80b',
    registration_data: {
      email: 'logon5739@gmail.com',
      organization: '시스템개발',
      position: '과장',
      company: '세원테크놀로지',
    },
  }
  
  const { error: insertError } = await admin
    .from('event_survey_entries')
    .insert(shinEntry)
  
  if (insertError) {
    console.error('❌ 추가 실패:', insertError)
    
    // unique constraint 오류인 경우 업데이트 시도
    if (insertError.code === '23505') {
      console.log('   업데이트 시도...')
      const { error: updateError } = await admin
        .from('event_survey_entries')
        .update({
          name: shinEntry.name,
          company: shinEntry.company,
          phone_norm: shinEntry.phone_norm,
          completed_at: shinEntry.completed_at,
          utm_source: shinEntry.utm_source,
          utm_medium: shinEntry.utm_medium,
          utm_campaign: shinEntry.utm_campaign,
          marketing_campaign_link_id: shinEntry.marketing_campaign_link_id,
          registration_data: shinEntry.registration_data,
        })
        .eq('campaign_id', campaignId)
        .eq('survey_no', 176)
      
      if (updateError) {
        console.error('❌ 업데이트 실패:', updateError)
        return
      } else {
        console.log('✅ 업데이트 완료')
      }
    } else {
      return
    }
  } else {
    console.log('✅ 신홍동 176번 추가 완료')
  }
  
  // 5. 최종 확인
  console.log('')
  console.log('5. 최종 확인')
  console.log('-'.repeat(80))
  
  const { data: final176, error: final176Error } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('survey_no', 176)
    .maybeSingle()
  
  const { data: final177, error: final177Error } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('survey_no', 177)
    .maybeSingle()
  
  if (final176Error || final177Error) {
    console.error('❌ 최종 확인 실패')
    return
  }
  
  console.log('176번:')
  if (final176) {
    console.log(`   이름: ${final176.name}`)
    console.log(`   이메일: ${final176.registration_data?.email || 'N/A'}`)
    console.log(`   전화: ${final176.phone_norm || 'N/A'}`)
    console.log(`   UTM Source: ${final176.utm_source || 'N/A'}`)
    console.log(`   UTM Medium: ${final176.utm_medium || 'N/A'}`)
  } else {
    console.log('   없음')
  }
  
  console.log('')
  console.log('177번:')
  if (final177) {
    console.log(`   이름: ${final177.name}`)
    console.log(`   이메일: ${final177.registration_data?.email || 'N/A'}`)
    console.log(`   전화: ${final177.phone_norm || 'N/A'}`)
  } else {
    console.log('   없음')
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 작업 완료')
}

move176To177AndAddShin()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
