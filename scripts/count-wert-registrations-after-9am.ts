import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function countWertRegistrationsAfter9am() {
  const admin = createAdminSupabase()

  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트인텔리전트 149403 등록 캠페인

  // 오늘 9시 KST = 같은 날 00:00 UTC (KST = UTC+9)
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const since = `${todayStr}T00:00:00.000Z`

  console.log('🔍 워트인텔리전트 149403 등록 — 오늘 9시(KST) 이후 건수\n')
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`기준 시각: ${since} UTC (오늘 09:00 KST)\n`)

  const { count, error } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .gte('created_at', since)

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  console.log(`✅ 오늘 9시(KST) 이후 등록 건수: ${count ?? 0}건`)
}

countWertRegistrationsAfter9am().catch(console.error)
