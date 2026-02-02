import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkWertEntriesUTM() {
  const admin = createAdminSupabase()

  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
  const todayStr = new Date().toISOString().slice(0, 10)
  const since = `${todayStr}T00:00:00.000Z`

  const { data: entries } = await admin
    .from('event_survey_entries')
    .select('id, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, created_at')
    .eq('campaign_id', campaignId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(100)

  const total = entries?.length ?? 0
  const withUTM = entries?.filter((e) => e.utm_source || e.utm_medium || e.utm_campaign).length ?? 0
  const withLinkId = entries?.filter((e) => e.marketing_campaign_link_id).length ?? 0

  console.log('오늘 9시 이후 등록:', total, '건')
  console.log('UTM 있음:', withUTM, '건')
  console.log('링크 ID 있음:', withLinkId, '건\n')

  // utm_source/medium 분포
  const bySource: Record<string, number> = {}
  const byMedium: Record<string, number> = {}
  entries?.forEach((e) => {
    const src = e.utm_source || '(없음)'
    const med = e.utm_medium || '(없음)'
    bySource[src] = (bySource[src] || 0) + 1
    byMedium[med] = (byMedium[med] || 0) + 1
  })

  console.log('utm_source 분포:')
  Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(' ', k, v, '건'))
  console.log('\nutm_medium 분포:')
  Object.entries(byMedium).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(' ', k, v, '건'))

  if (entries && entries.length > 0) {
    console.log('\n샘플 5건:')
    entries.slice(0, 5).forEach((e, i) => {
      console.log(` ${i + 1}. source=${e.utm_source ?? '-'}, medium=${e.utm_medium ?? '-'}, campaign=${(e.utm_campaign ?? '-').slice(0, 40)}, link_id=${e.marketing_campaign_link_id ? 'O' : 'X'}`)
    })
  }
}

checkWertEntriesUTM().catch(console.error)
