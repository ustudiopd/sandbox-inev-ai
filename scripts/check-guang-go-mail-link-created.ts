import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkGuangGoMailLinkCreated() {
  const admin = createAdminSupabase()

  const clientId = '55317496-d3d6-4e65-81d3-405892de78ab' // 워트인텔리전트

  const { data: link, error } = await admin
    .from('campaign_link_meta')
    .select('id, name, cid, utm_source, utm_medium, utm_campaign, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('name', '광고메일')
    .maybeSingle()

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  if (!link) {
    console.log('⚠️ "광고메일" 링크를 찾을 수 없습니다.')
    return
  }

  const created = link.created_at ? new Date(link.created_at) : null
  const updated = link.updated_at ? new Date(link.updated_at) : null

  console.log('🔗 링크 메타: "광고메일" (스티비)\n')
  console.log('   링크 ID:', link.id)
  console.log('   CID:', link.cid)
  console.log('   UTM source:', link.utm_source)
  console.log('   UTM medium:', link.utm_medium)
  console.log('   UTM campaign:', link.utm_campaign)
  console.log('')
  console.log('   생성 시각 (DB):', link.created_at)
  if (created) {
    console.log('   생성 시각 (KST):', created.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))
  }
  if (updated) {
    console.log('   수정 시각 (DB):', link.updated_at)
    console.log('   수정 시각 (KST):', updated.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))
  }
}

checkGuangGoMailLinkCreated().catch(console.error)
