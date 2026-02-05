/**
 * /149403 등록 캠페인의 등록 정보를 /149400 등록 캠페인으로 복사하는 스크립트
 * 사용법: npx tsx scripts/copy-149403-to-149400-registrations.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function copyRegistrations() {
  try {
    const admin = createAdminSupabase()
    
    // 1. /149403 캠페인 찾기
    console.log('\n🔍 /149403 등록 캠페인 조회 중...')
    const { data: sourceCampaign, error: sourceError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, next_survey_no')
      .eq('public_path', '/149403')
      .eq('type', 'registration')
      .maybeSingle()
    
    if (sourceError) {
      console.error(`❌ /149403 캠페인 조회 실패:`, sourceError.message)
      process.exit(1)
    }
    
    if (!sourceCampaign) {
      console.error(`❌ /149403 등록 캠페인을 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 소스 캠페인 찾음: ${sourceCampaign.title} (ID: ${sourceCampaign.id})`)
    
    // 2. /149400 캠페인 찾기
    console.log('\n🔍 /149400 등록 캠페인 조회 중...')
    const { data: targetCampaign, error: targetError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, next_survey_no')
      .eq('public_path', '/149400')
      .eq('type', 'registration')
      .maybeSingle()
    
    if (targetError) {
      console.error(`❌ /149400 캠페인 조회 실패:`, targetError.message)
      process.exit(1)
    }
    
    if (!targetCampaign) {
      console.error(`❌ /149400 등록 캠페인을 찾을 수 없습니다`)
      process.exit(1)
    }
    
    console.log(`✅ 타겟 캠페인 찾음: ${targetCampaign.title} (ID: ${targetCampaign.id})`)
    
    // 3. /149403의 모든 등록 정보 조회
    console.log('\n🔍 /149403 등록 정보 조회 중...')
    const { data: sourceEntries, error: entriesError } = await admin
      .from('event_survey_entries')
      .select('*')
      .eq('campaign_id', sourceCampaign.id)
      .order('created_at', { ascending: true })
    
    if (entriesError) {
      console.error(`❌ 등록 정보 조회 실패:`, entriesError.message)
      process.exit(1)
    }
    
    if (!sourceEntries || sourceEntries.length === 0) {
      console.log(`⚠️  /149403에 등록 정보가 없습니다.`)
      process.exit(0)
    }
    
    console.log(`✅ ${sourceEntries.length}개의 등록 정보를 찾았습니다.`)
    
    // 4. /149400의 기존 등록 정보 확인 (중복 체크용)
    console.log('\n🔍 /149400 기존 등록 정보 확인 중...')
    const { data: existingEntries } = await admin
      .from('event_survey_entries')
      .select('phone_norm, registration_data')
      .eq('campaign_id', targetCampaign.id)
    
    const existingPhoneNorms = new Set(
      (existingEntries || []).map((e: any) => e.phone_norm).filter(Boolean)
    )
    const existingEmails = new Set(
      (existingEntries || [])
        .map((e: any) => e.registration_data?.email?.toLowerCase())
        .filter(Boolean)
    )
    
    console.log(`   기존 등록 정보: ${existingEntries?.length || 0}개`)
    
    // 5. 등록 정보 복사
    console.log('\n📋 등록 정보 복사 시작...')
    let copiedCount = 0
    let skippedCount = 0
    let currentSurveyNo = targetCampaign.next_survey_no || 1
    
    for (const entry of sourceEntries) {
      const entryData = entry as any
      
      // 중복 체크: phone_norm 또는 email 기준
      const phoneNorm = entryData.phone_norm
      const email = entryData.registration_data?.email?.toLowerCase()
      
      const isDuplicate = 
        (phoneNorm && existingPhoneNorms.has(phoneNorm)) ||
        (email && existingEmails.has(email))
      
      if (isDuplicate) {
        console.log(`   ⏭️  건너뛰기: ${entryData.name} (중복)`)
        skippedCount++
        continue
      }
      
      // 새 등록 정보 생성
      const newSurveyNo = currentSurveyNo++
      const newCode6 = String(newSurveyNo).padStart(6, '0')
      
      const { error: insertError } = await admin
        .from('event_survey_entries')
        .insert({
          campaign_id: targetCampaign.id,
          name: entryData.name,
          company: entryData.company,
          phone_norm: entryData.phone_norm,
          survey_no: newSurveyNo,
          code6: newCode6,
          completed_at: entryData.completed_at || entryData.created_at,
          registration_data: entryData.registration_data,
          utm_source: entryData.utm_source,
          utm_medium: entryData.utm_medium,
          utm_campaign: entryData.utm_campaign,
          utm_term: entryData.utm_term,
          utm_content: entryData.utm_content,
          utm_first_visit_at: entryData.utm_first_visit_at,
          utm_referrer: entryData.utm_referrer,
          marketing_campaign_link_id: entryData.marketing_campaign_link_id,
          created_at: entryData.created_at, // 원본 생성 시간 유지
        })
      
      if (insertError) {
        console.error(`   ❌ 복사 실패: ${entryData.name}`, insertError.message)
        continue
      }
      
      console.log(`   ✅ 복사 완료: ${entryData.name} (survey_no: ${newSurveyNo})`)
      copiedCount++
      
      // 기존 목록에 추가 (중복 방지)
      if (phoneNorm) existingPhoneNorms.add(phoneNorm)
      if (email) existingEmails.add(email)
    }
    
    // 6. 타겟 캠페인의 next_survey_no 업데이트
    if (copiedCount > 0) {
      console.log('\n🔄 타겟 캠페인의 next_survey_no 업데이트 중...')
      const { error: updateError } = await admin
        .from('event_survey_campaigns')
        .update({
          next_survey_no: currentSurveyNo,
        })
        .eq('id', targetCampaign.id)
      
      if (updateError) {
        console.error(`❌ next_survey_no 업데이트 실패:`, updateError.message)
      } else {
        console.log(`✅ next_survey_no 업데이트 완료: ${currentSurveyNo}`)
      }
    }
    
    // 7. 결과 출력
    console.log('\n✅ 복사 완료!')
    console.log(`   - 총 등록 정보: ${sourceEntries.length}개`)
    console.log(`   - 복사 완료: ${copiedCount}개`)
    console.log(`   - 건너뛰기 (중복): ${skippedCount}개`)
    console.log(`   - 타겟 캠페인: /event/149400 (ID: ${targetCampaign.id})`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

copyRegistrations()
