/**
 * /149400 페이지 정보 조회 스크립트
 * 테스트 전에 필요한 ID들을 조회하는 유틸리티
 * 
 * 사용법: npx tsx scripts/get-149400-info.ts
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function get149400Info() {
  try {
    const admin = createAdminSupabase()
    
    console.log('\n🔍 /149400 페이지 정보 조회 중...\n')
    
    // 1. 웨비나 정보
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, registration_campaign_id')
      .eq('slug', '149400')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (!webinar) {
      console.error(`❌ slug가 149400인 웨비나를 찾을 수 없습니다`)
      console.log(`   먼저 scripts/create-149400-test-webinar.ts를 실행하세요.`)
      process.exit(1)
    }
    
    console.log(`✅ 웨비나 정보:`)
    console.log(`   ID: ${webinar.id}`)
    console.log(`   Slug: ${webinar.slug}`)
    console.log(`   제목: ${webinar.title}`)
    console.log(`   등록 캠페인 ID: ${webinar.registration_campaign_id || '(없음)'}`)
    
    // 2. 캠페인 정보
    let campaignId = webinar.registration_campaign_id
    
    if (!campaignId) {
      // public_path로 찾기
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, type')
        .eq('public_path', '/149400')
        .maybeSingle()
      
      if (campaignError || !campaign) {
        console.error(`❌ /149400 캠페인을 찾을 수 없습니다`)
        process.exit(1)
      }
      
      campaignId = campaign.id
      console.log(`\n✅ 캠페인 정보 (public_path로 찾음):`)
      console.log(`   ID: ${campaign.id}`)
      console.log(`   제목: ${campaign.title}`)
      console.log(`   타입: ${campaign.type}`)
    } else {
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, type')
        .eq('id', campaignId)
        .single()
      
      if (!campaignError && campaign) {
        console.log(`\n✅ 캠페인 정보:`)
        console.log(`   ID: ${campaign.id}`)
        console.log(`   제목: ${campaign.title}`)
        console.log(`   Public Path: ${campaign.public_path}`)
        console.log(`   타입: ${campaign.type}`)
      }
    }
    
    // 3. 경품 정보
    const { data: giveaways, error: giveawayError } = await admin
      .from('giveaways')
      .select('id, name, status, winners_count')
      .eq('webinar_id', webinar.id)
      .order('created_at', { ascending: false })
    
    if (!giveawayError && giveaways && giveaways.length > 0) {
      console.log(`\n✅ 경품 정보:`)
      giveaways.forEach((g, idx) => {
        console.log(`   ${idx + 1}. ${g.name || '(이름 없음)'}`)
        console.log(`      ID: ${g.id}`)
        console.log(`      상태: ${g.status}`)
        console.log(`      당첨자 수: ${g.winners_count}`)
      })
      
      const openGiveaway = giveaways.find(g => g.status === 'open')
      if (openGiveaway) {
        console.log(`\n   ⚠️  열린 경품이 있습니다: ${openGiveaway.id}`)
      } else {
        console.log(`\n   ⚠️  열린 경품이 없습니다. 경품 추첨 테스트를 하려면 경품을 생성하고 상태를 'open'으로 설정하세요.`)
      }
    } else {
      console.log(`\n⚠️  경품이 없습니다. 경품 추첨 테스트를 하려면 경품을 생성하세요.`)
    }
    
    // 4. 설문 폼 정보
    if (campaignId) {
      const { data: campaignDetail, error: detailError } = await admin
        .from('event_survey_campaigns')
        .select('form_id')
        .eq('id', campaignId)
        .single()
      
      if (!detailError && campaignDetail?.form_id) {
        const { data: form, error: formError } = await admin
          .from('forms')
          .select('id, title, kind')
          .eq('id', campaignDetail.form_id)
          .maybeSingle()
        
        if (!formError && form) {
          console.log(`\n✅ 설문 폼 정보:`)
          console.log(`   ID: ${form.id}`)
          console.log(`   제목: ${form.title || '(제목 없음)'}`)
          console.log(`   종류: ${form.kind}`)
        }
      }
    }
    
    // 5. 통계 정보
    if (campaignId) {
      const { data: entries, error: entriesError } = await admin
        .from('event_survey_entries')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
      
      if (!entriesError) {
        console.log(`\n✅ 설문 제출 통계:`)
        console.log(`   총 제출 수: ${entries || 0}건`)
      }
    }
    
    // 6. 테스트 명령어 출력
    console.log(`\n📝 테스트 명령어:`)
    console.log(`\n   1. Node.js 스크립트:`)
    console.log(`      npx tsx scripts/load-test-149400.ts --users 100`)
    console.log(`\n   2. k6 스크립트:`)
    console.log(`      CAMPAIGN_ID=${campaignId} k6 run scripts/k6-load-test-149400.js`)
    console.log(`\n   3. 환경 변수:`)
    console.log(`      BASE_URL=http://localhost:3000`)
    console.log(`      CAMPAIGN_ID=${campaignId}`)
    console.log(`      WEBINAR_ID=${webinar.id}`)
    if (giveaways && giveaways.length > 0 && giveaways.find(g => g.status === 'open')) {
      const openG = giveaways.find(g => g.status === 'open')
      console.log(`      GIVEAWAY_ID=${openG?.id}`)
    }
    
    console.log(`\n✨ 정보 조회 완료!\n`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
}

get149400Info()
