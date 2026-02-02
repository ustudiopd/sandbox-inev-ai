import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkWertLinksOrder() {
  const admin = createAdminSupabase()
  const clientId = '55317496-d3d6-4e65-81d3-405892de78ab'

  const { data: links } = await admin
    .from('campaign_link_meta')
    .select('id, name, cid, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('워트인텔리전트 캠페인 링크 — 생성일 최신순 (상위 5개)\n')
  links?.forEach((l, i) => {
    const created = l.created_at ? new Date(l.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'
    console.log(`${i + 1}. ${l.name} (CID: ${l.cid}) — ${created}`)
  })
  console.log('')
  const first = links?.[0]
  if (first) {
    const isGuangGo = first.name === '광고메일'
    console.log(isGuangGo ? '✅ "광고메일"이 가장 마지막(최근)에 생성된 링크입니다.' : '❌ "광고메일"이 가장 최근은 아닙니다. 위 목록 1번이 최근 생성.')
  }
}

checkWertLinksOrder().catch(console.error)
