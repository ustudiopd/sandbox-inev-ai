/**
 * 워트인텔리전트 클라이언트 통합 스크립트
 * 
 * 기존 클라이언트(89e22a5f-e9ff-4e3b-959f-0314caa94356)의 리소스를
 * 새 클라이언트(55317496-d3d6-4e65-81d3-405892de78ab)로 이동하고
 * 기존 클라이언트를 삭제합니다.
 * 
 * 사용법: 
 *   npx tsx scripts/merge-wert-clients.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const oldClientId = '89e22a5f-e9ff-4e3b-959f-0314caa94356'
const newClientId = '55317496-d3d6-4e65-81d3-405892de78ab'

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    console.log('🔄 워트인텔리전트 클라이언트 통합 시작...\n')

    // 1) 기존 클라이언트의 멤버들을 새 클라이언트로 이동
    console.log('1️⃣ 클라이언트 멤버 이동 중...')
    const { data: oldMembers } = await admin
      .from('client_members')
      .select('user_id, role')
      .eq('client_id', oldClientId)

    if (oldMembers && oldMembers.length > 0) {
      for (const member of oldMembers) {
        // 새 클라이언트에 이미 멤버가 있는지 확인
        const { data: existingMember } = await admin
          .from('client_members')
          .select('id')
          .eq('client_id', newClientId)
          .eq('user_id', member.user_id)
          .maybeSingle()

        if (!existingMember) {
          // 멤버 추가
          await admin
            .from('client_members')
            .insert({
              client_id: newClientId,
              user_id: member.user_id,
              role: member.role,
            })
          console.log(`   ✅ 멤버 이동: ${member.user_id} (역할: ${member.role})`)
        } else {
          console.log(`   ℹ️  멤버 이미 존재: ${member.user_id}`)
        }
      }
    }

    // 2) 기존 클라이언트의 웨비나를 새 클라이언트로 이동
    console.log('\n2️⃣ 웨비나 이동 중...')
    const { data: oldWebinars } = await admin
      .from('webinars')
      .select('id, title, slug')
      .eq('client_id', oldClientId)

    if (oldWebinars && oldWebinars.length > 0) {
      for (const webinar of oldWebinars) {
        await admin
          .from('webinars')
          .update({ client_id: newClientId })
          .eq('id', webinar.id)
        console.log(`   ✅ 웨비나 이동: ${webinar.title || webinar.slug || webinar.id}`)
      }
    } else {
      console.log('   ℹ️  이동할 웨비나 없음')
    }

    // 3) 기존 클라이언트의 캠페인을 새 클라이언트로 이동
    console.log('\n3️⃣ 캠페인 이동 중...')
    const { data: oldCampaigns } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path')
      .eq('client_id', oldClientId)

    if (oldCampaigns && oldCampaigns.length > 0) {
      for (const campaign of oldCampaigns) {
        await admin
          .from('event_survey_campaigns')
          .update({ client_id: newClientId })
          .eq('id', campaign.id)
        console.log(`   ✅ 캠페인 이동: ${campaign.title || campaign.public_path || campaign.id}`)
      }
    } else {
      console.log('   ℹ️  이동할 캠페인 없음')
    }

    // 4) 기존 클라이언트의 멤버십 삭제
    console.log('\n4️⃣ 기존 클라이언트 멤버십 삭제 중...')
    await admin
      .from('client_members')
      .delete()
      .eq('client_id', oldClientId)
    console.log('   ✅ 기존 클라이언트 멤버십 삭제 완료')

    // 5) 기존 클라이언트 삭제
    console.log('\n5️⃣ 기존 클라이언트 삭제 중...')
    const { error: deleteError } = await admin
      .from('clients')
      .delete()
      .eq('id', oldClientId)

    if (deleteError) {
      throw new Error(`클라이언트 삭제 실패: ${deleteError.message}`)
    }
    console.log('   ✅ 기존 클라이언트 삭제 완료')

    console.log('\n✅ 워트인텔리전트 클라이언트 통합 완료!')
    console.log(`\n📋 최종 클라이언트 ID: ${newClientId}`)
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
})()
