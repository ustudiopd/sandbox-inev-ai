import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function estimateWertEmailRegistrations() {
  const admin = createAdminSupabase()

  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트인텔리전트 149403
  const todayStr = new Date().toISOString().slice(0, 10)
  const since = `${todayStr}T00:00:00.000Z`

  console.log('🔍 워트인텔리전트 149403 — 오늘 9시 이후 등록 중 이메일 대량메일 유입 추정\n')
  console.log(`기준 시각: ${since} UTC (오늘 09:00 KST)\n`)

  const { data: entries, error } = await admin
    .from('event_survey_entries')
    .select('id, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, created_at')
    .eq('campaign_id', campaignId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  const total = entries?.length ?? 0
  if (total === 0) {
    console.log('등록 건수: 0건')
    return
  }

  // 이메일 대량메일로 볼 소스/매체
  const emailMediums = new Set(['email', 'e-mail', 'mail'])
  const emailSources = new Set([
    'stibee',      // 스티비
    'newsletter',  // 뉴스레터
    'mailchimp', 'sendgrid', 'braze', 'mail', 'email', 'edm', 'dm'
  ])
  const emailCampaignPattern = /newsletter|뉴스레터|메일|mail|email|edm|스티비|stibee/i

  const linkIds = [...new Set((entries ?? []).map((e) => e.marketing_campaign_link_id).filter(Boolean))] as string[]
  let linkMeta: Record<string, { name: string; utm_source: string | null; utm_medium: string | null }> = {}
  if (linkIds.length > 0) {
    const { data: links } = await admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium')
      .in('id', linkIds)
    links?.forEach((l) => {
      linkMeta[l.id] = { name: l.name, utm_source: l.utm_source || null, utm_medium: l.utm_medium || null }
    })
  }

  let emailCount = 0
  const emailExamples: Array<{ utm_source: string | null; utm_medium: string | null; linkName?: string }> = []

  for (const e of entries ?? []) {
    const src = (e.utm_source || '').toLowerCase()
    const med = (e.utm_medium || '').toLowerCase()
    const camp = (e.utm_campaign || '')
    const linkId = e.marketing_campaign_link_id
    const link = linkId ? linkMeta[linkId] : null

    const fromMedium = emailMediums.has(med)
    const fromSource = emailSources.has(src) || (link?.utm_medium && emailMediums.has(link.utm_medium.toLowerCase()))
    const fromCampaign = emailCampaignPattern.test(camp)
    const fromLinkName = link?.name && /메일|뉴스레터|newsletter|stibee|스티비|mail|email/i.test(link.name)

    if (fromMedium || fromSource || fromCampaign || fromLinkName) {
      emailCount++
      if (emailExamples.length < 10) {
        emailExamples.push({
          utm_source: e.utm_source || link?.utm_source || null,
          utm_medium: e.utm_medium || link?.utm_medium || null,
          linkName: link?.name,
        })
      }
    }
  }

  console.log(`총 등록(오늘 9시 이후): ${total}건\n`)
  console.log('📧 이메일 대량메일 유입 추정')
  console.log('   (utm_medium=email, utm_source=stibee/newsletter 등, 링크명·캠페인명에 뉴스레터·메일 포함)\n')
  console.log(`   추정 건수: ${emailCount}건`)
  console.log(`   비율: ${total ? ((emailCount / total) * 100).toFixed(1) : 0}%\n`)
  if (emailExamples.length > 0) {
    console.log('   샘플 (최대 10건):')
    emailExamples.forEach((s, i) => {
      console.log(`   ${i + 1}. source=${s.utm_source ?? '-'}, medium=${s.utm_medium ?? '-'}${s.linkName ? `, 링크=${s.linkName}` : ''}`)
    })
  }
}

estimateWertEmailRegistrations().catch(console.error)
