import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkWertUTMCID() {
  const admin = createAdminSupabase()

  const clientId = '55317496-d3d6-4e65-81d3-405892de78ab' // 워트인텔리전트

  console.log('🔍 워트인텔리전트 UTM·CID(캠페인 링크) 확인...\n')

  // 1) 클라이언트 확인
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    console.error('❌ 워트인텔리전트 클라이언트를 찾을 수 없습니다:', clientError?.message)
    return
  }
  console.log(`✅ 클라이언트: ${client.name} (${client.id})\n`)

  // 2) 해당 클라이언트의 이벤트/등록 캠페인 (public_path 포함)
  const { data: campaigns, error: campError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path, type, status')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (campError) {
    console.error('❌ 캠페인 조회 실패:', campError.message)
    return
  }

  console.log('📋 캠페인 목록:')
  if (!campaigns?.length) {
    console.log('   (없음)\n')
  } else {
    campaigns.forEach((c) => {
      const is149403 = c.public_path === '/149403' || c.public_path === '149403'
      const marker = is149403 ? ' ← 149403 등록' : ''
      console.log(`   - ${c.title}`)
      console.log(`     ID: ${c.id}`)
      console.log(`     public_path: ${c.public_path}`)
      console.log(`     type: ${c.type}, status: ${c.status}${marker}`)
      console.log('')
    })
  }

  // 149403 등록 캠페인 ID (있으면 사용)
  const campaign149403 = campaigns?.find(
    (c) => c.public_path === '/149403' || c.public_path === '149403'
  )
  const registrationCampaignId149403 = campaign149403?.id ?? null

  if (registrationCampaignId149403) {
    console.log(`📌 149403 등록 캠페인 ID: ${registrationCampaignId149403}\n`)
  } else {
    console.log('⚠️ public_path가 /149403 인 캠페인이 없습니다.\n')
  }

  // 3) campaign_link_meta (CID·UTM) 목록
  const { data: links, error: linksError } = await admin
    .from('campaign_link_meta')
    .select('id, name, cid, target_campaign_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, status, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (linksError) {
    console.error('❌ 캠페인 링크 조회 실패:', linksError.message)
    return
  }

  console.log('📋 캠페인 링크 (CID·UTM):')
  if (!links?.length) {
    console.log('   (없음)\n')
    console.log('→ 149403 등록용 링크가 없으면 새로 추가해야 합니다.')
    return
  }

  links.forEach((link) => {
    const targets149403 =
      registrationCampaignId149403 &&
      link.target_campaign_id === registrationCampaignId149403
    const status = link.status || 'active'
    console.log(`   ---`)
    console.log(`   링크명: ${link.name}`)
    console.log(`   링크 ID: ${link.id}`)
    console.log(`   CID: ${link.cid}`)
    console.log(`   target_campaign_id: ${link.target_campaign_id || '(없음)'}`)
    console.log(
      `   149403 등록 캠페인 타겟: ${targets149403 ? '✅ 예' : '❌ 아니오'}`
    )
    console.log(`   UTM: source=${link.utm_source || '-'}, medium=${link.utm_medium || '-'}, campaign=${link.utm_campaign || '-'}`)
    console.log(`   status: ${status}`)
    console.log('')
  })

  const linksTargeting149403 = links.filter(
    (l) =>
      registrationCampaignId149403 &&
      l.target_campaign_id === registrationCampaignId149403
  )

  console.log('---')
  console.log(`총 캠페인 링크: ${links.length}개`)
  console.log(`149403 등록 캠페인을 타겟으로 하는 링크: ${linksTargeting149403.length}개`)
  if (linksTargeting149403.length > 0) {
    console.log('\n✅ 149403 등록용 CID가 이미 있음 → 기존 CID 그대로 사용 가능.')
  } else {
    console.log('\n⚠️ 149403 등록용 링크가 없음 → 등록용 새 링크(CID) 추가 필요.')
  }
}

checkWertUTMCID().catch(console.error)
