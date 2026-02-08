import { createAdminSupabase } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import EnterPageClient from './EnterPageClient'

type Props = { params: Promise<{ slug: string }> }

/**
 * inev Phase 5: Entry Gate 페이지
 * /event/[slug]/enter
 * 
 * 자동입장: ?email= 쿼리 파라미터로 등록 정보 조회
 * 수동입장: 이메일+이름 입력 폼
 * 
 * 버튼 클릭 시에만 세션 생성 (링크 오픈만으로 side effect 금지)
 */
export default async function PublicEventEnterPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminSupabase()
  const { data: event, error } = await supabase
    .from('events')
    .select('id, code, slug')
    .eq('slug', slug)
    .limit(1)
    .single()

  if (error || !event) notFound()

  return <EnterPageClient event={event} />
}
