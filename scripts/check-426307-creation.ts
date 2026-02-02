import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 426307 웨비나와 캠페인의 생성 시점 및 상세 정보 확인
 */
async function check426307Creation() {
  try {
    const admin = createAdminSupabase()
    
    console.log('\n🔍 426307 웨비나 조회 중...')
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, created_at, updated_at, registration_campaign_id, client_id, agency_id')
      .eq('slug', '426307')
      .maybeSingle()
    
    if (webinarError) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError.message)
      process.exit(1)
    }
    
    if (!webinar) {
      console.log(`⚠️  426307 웨비나를 찾을 수 없습니다`)
    } else {
      console.log(`\n✅ 웨비나 정보:`)
      console.log(`   ID: ${webinar.id}`)
      console.log(`   Slug: ${webinar.slug}`)
      console.log(`   Title: ${webinar.title}`)
      console.log(`   생성 시각: ${webinar.created_at}`)
      console.log(`   수정 시각: ${webinar.updated_at}`)
      console.log(`   Client ID: ${webinar.client_id}`)
      console.log(`   Agency ID: ${webinar.agency_id}`)
      console.log(`   Registration Campaign ID: ${webinar.registration_campaign_id || '없음'}`)
      
      // 생성 시각을 KST로 변환
      if (webinar.created_at) {
        const createdDate = new Date(webinar.created_at)
        const kstDate = new Date(createdDate.getTime() + 9 * 60 * 60 * 1000)
        console.log(`   생성 시각 (KST): ${kstDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`)
      }
    }
    
    console.log('\n🔍 /426307 캠페인 조회 중...')
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, type, created_at, updated_at, client_id, agency_id, created_by')
      .eq('public_path', '/426307')
      .maybeSingle()
    
    if (campaignError) {
      console.error(`❌ 캠페인 조회 실패:`, campaignError.message)
      process.exit(1)
    }
    
    if (!campaign) {
      console.log(`⚠️  /426307 캠페인을 찾을 수 없습니다`)
    } else {
      console.log(`\n✅ 캠페인 정보:`)
      console.log(`   ID: ${campaign.id}`)
      console.log(`   Title: ${campaign.title}`)
      console.log(`   Public Path: ${campaign.public_path}`)
      console.log(`   Type: ${campaign.type}`)
      console.log(`   생성 시각: ${campaign.created_at}`)
      console.log(`   수정 시각: ${campaign.updated_at}`)
      console.log(`   Client ID: ${campaign.client_id}`)
      console.log(`   Agency ID: ${campaign.agency_id}`)
      console.log(`   Created By: ${campaign.created_by || '없음'}`)
      
      // 생성 시각을 KST로 변환
      if (campaign.created_at) {
        const createdDate = new Date(campaign.created_at)
        const kstDate = new Date(createdDate.getTime() + 9 * 60 * 60 * 1000)
        console.log(`   생성 시각 (KST): ${kstDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`)
      }
      
      // created_by 프로필 정보 확인
      if (campaign.created_by) {
        const { data: creator } = await admin
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', campaign.created_by)
          .maybeSingle()
        
        if (creator) {
          console.log(`   생성자: ${creator.full_name || creator.email || creator.id}`)
        }
      }
    }
    
    // 웨비나와 캠페인의 연동 상태 확인
    if (webinar && campaign) {
      console.log('\n🔗 연동 상태:')
      if (webinar.registration_campaign_id === campaign.id) {
        console.log(`   ✅ 정상 연동됨`)
      } else {
        console.log(`   ⚠️  연동되지 않음`)
        console.log(`      웨비나의 registration_campaign_id: ${webinar.registration_campaign_id}`)
        console.log(`      캠페인 ID: ${campaign.id}`)
      }
      
      // 생성 시각 비교
      if (webinar.created_at && campaign.created_at) {
        const webinarCreated = new Date(webinar.created_at)
        const campaignCreated = new Date(campaign.created_at)
        const diffMs = Math.abs(webinarCreated.getTime() - campaignCreated.getTime())
        const diffMinutes = Math.floor(diffMs / 1000 / 60)
        
        console.log(`\n⏰ 생성 시각 비교:`)
        console.log(`   웨비나 생성: ${webinar.created_at}`)
        console.log(`   캠페인 생성: ${campaign.created_at}`)
        console.log(`   시간 차이: ${diffMinutes}분`)
        
        if (diffMinutes < 5) {
          console.log(`   💡 거의 동시에 생성됨 (${diffMinutes}분 차이)`)
        }
      }
    }
    
    // 최근 생성된 웨비나/캠페인 목록 확인 (비교용)
    console.log('\n📊 최근 생성된 웨비나 (최근 5개):')
    const { data: recentWebinars } = await admin
      .from('webinars')
      .select('id, slug, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentWebinars && recentWebinars.length > 0) {
      recentWebinars.forEach((w, idx) => {
        const createdDate = new Date(w.created_at)
        const kstDate = new Date(createdDate.getTime() + 9 * 60 * 60 * 1000)
        console.log(`   ${idx + 1}. ${w.slug} - ${w.title || '제목 없음'} (${kstDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`)
      })
    }
    
    console.log('\n📊 최근 생성된 캠페인 (최근 5개):')
    const { data: recentCampaigns } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentCampaigns && recentCampaigns.length > 0) {
      recentCampaigns.forEach((c, idx) => {
        const createdDate = new Date(c.created_at)
        const kstDate = new Date(createdDate.getTime() + 9 * 60 * 60 * 1000)
        console.log(`   ${idx + 1}. ${c.public_path || '경로 없음'} - ${c.title || '제목 없음'} (${kstDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`)
      })
    }
    
  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message)
    process.exit(1)
  }
}

check426307Creation()
  .then(() => {
    console.log('\n✅ 조회 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error)
    process.exit(1)
  })
