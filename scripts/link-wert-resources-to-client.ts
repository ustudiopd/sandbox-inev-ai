/**
 * 워트인텔리전트 웨비나와 이벤트 캠페인을 워트인텔리전트 클라이언트에 연결하는 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/link-wert-resources-to-client.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const wertClientId = '89e22a5f-e9ff-4e3b-959f-0314caa94356'
const wertAgencyId = 'd61ee043-2bad-47b4-a7a2-d5f2a286edaf'

// 워트인텔리전트 관련 리소스
const webinarSlug = 'wert-summit-26'
const eventPath = '149403'

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 1) 워트인텔리전트 클라이언트 확인
    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', wertClientId)
      .single()

    if (clientError || !client) {
      throw new Error(`워트인텔리전트 클라이언트를 찾을 수 없습니다: ${clientError?.message}`)
    }

    console.log('✅ 워트인텔리전트 클라이언트 확인:', client.name)
    console.log('   클라이언트 ID:', client.id)
    console.log('   에이전시 ID:', client.agency_id)

    // 2) 웨비나 찾기 및 업데이트
    const { data: webinar, error: webinarFindError } = await admin
      .from('webinars')
      .select('id, title, slug, client_id, agency_id')
      .eq('slug', webinarSlug)
      .maybeSingle()

    if (webinarFindError) {
      throw new Error(`웨비나 조회 실패: ${webinarFindError.message}`)
    }

    if (webinar) {
      console.log('\n📋 웨비나 정보:')
      console.log('   ID:', webinar.id)
      console.log('   제목:', webinar.title)
      console.log('   Slug:', webinar.slug)
      console.log('   현재 클라이언트 ID:', webinar.client_id)
      console.log('   현재 에이전시 ID:', webinar.agency_id)

      if (webinar.client_id !== wertClientId || webinar.agency_id !== client.agency_id) {
        const { error: updateError } = await admin
          .from('webinars')
          .update({
            client_id: wertClientId,
            agency_id: client.agency_id,
          })
          .eq('id', webinar.id)

        if (updateError) {
          throw new Error(`웨비나 업데이트 실패: ${updateError.message}`)
        }
        console.log('✅ 웨비나를 워트인텔리전트 클라이언트에 연결했습니다')
      } else {
        console.log('ℹ️  웨비나가 이미 워트인텔리전트 클라이언트에 연결되어 있습니다')
      }
    } else {
      console.log('⚠️  웨비나를 찾을 수 없습니다 (slug:', webinarSlug, ')')
    }

    // 3) 이벤트 캠페인 찾기 및 업데이트
    // public_path는 슬래시 포함/미포함 모두 확인
    let campaign = null
    const { data: campaignWithSlash } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, client_id, agency_id')
      .eq('public_path', `/${eventPath}`)
      .maybeSingle()
    
    if (campaignWithSlash) {
      campaign = campaignWithSlash
    } else {
      const { data: campaignWithoutSlash } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, client_id, agency_id')
        .eq('public_path', eventPath)
        .maybeSingle()
      campaign = campaignWithoutSlash
    }
    

    if (campaign) {
      console.log('\n📋 이벤트 캠페인 정보:')
      console.log('   ID:', campaign.id)
      console.log('   제목:', campaign.title)
      console.log('   Public Path:', campaign.public_path)
      console.log('   현재 클라이언트 ID:', campaign.client_id)
      console.log('   현재 에이전시 ID:', campaign.agency_id)

      if (campaign.client_id !== wertClientId || campaign.agency_id !== client.agency_id) {
        const { error: updateError } = await admin
          .from('event_survey_campaigns')
          .update({
            client_id: wertClientId,
            agency_id: client.agency_id,
          })
          .eq('id', campaign.id)

        if (updateError) {
          throw new Error(`이벤트 캠페인 업데이트 실패: ${updateError.message}`)
        }
        console.log('✅ 이벤트 캠페인을 워트인텔리전트 클라이언트에 연결했습니다')
      } else {
        console.log('ℹ️  이벤트 캠페인이 이미 워트인텔리전트 클라이언트에 연결되어 있습니다')
      }
    } else {
      console.log('⚠️  이벤트 캠페인을 찾을 수 없습니다 (public_path:', eventPath, ')')
    }

    // 4) 감사 로그
    try {
      await admin.from('audit_logs').insert({
        actor_user_id: client.id, // 클라이언트 ID를 임시로 사용
        agency_id: client.agency_id,
        client_id: wertClientId,
        action: 'LINK_WERT_RESOURCES',
        payload: { webinarSlug, eventPath }
      })
    } catch (auditError) {
      console.warn('⚠️  감사 로그 기록 실패 (무시됨):', auditError)
    }

    console.log('\n✅ 완료!')
    console.log('\n📋 연결된 리소스:')
    if (webinar) {
      console.log('1. 웨비나:', webinar.title, `(/webinar/${webinarSlug})`)
    }
    if (campaign) {
      console.log('2. 이벤트 캠페인:', campaign.title, `(/event/${eventPath})`)
    }
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
