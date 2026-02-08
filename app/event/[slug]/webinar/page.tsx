import { createAdminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export default async function PublicEventWebinarPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminSupabase()
  const { data: event, error } = await supabase
    .from('events')
    .select('id, slug, module_webinar')
    .eq('slug', slug)
    .limit(1)
    .single()

  if (error || !event) notFound()
  if (!event.module_webinar) notFound()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">웨비나</h1>
          <p className="mt-1 text-xs text-gray-500">{event.slug}</p>
        </div>
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">웨비나 기능은 Phase 6에서 구현 예정입니다.</p>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <Link href={`/event/${event.slug}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            ← 이벤트로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
