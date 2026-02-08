import { createAdminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VisitLogger } from './VisitLogger'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PublicEventPage({ params, searchParams }: Props) {
  const { slug } = await params
  const q = await searchParams
  const supabase = createAdminSupabase()
  const { data: event, error } = await supabase
    .from('events')
    .select('id, code, slug, module_registration, module_survey, module_webinar, module_utm')
    .eq('slug', slug)
    .limit(1)
    .single()

  if (error || !event) notFound()

  const utmSource = typeof q?.utm_source === 'string' ? q.utm_source : undefined
  const utmMedium = typeof q?.utm_medium === 'string' ? q.utm_medium : undefined
  const utmCampaign = typeof q?.utm_campaign === 'string' ? q.utm_campaign : undefined
  const utmTerm = typeof q?.utm_term === 'string' ? q.utm_term : undefined
  const utmContent = typeof q?.utm_content === 'string' ? q.utm_content : undefined

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {event.module_utm && (
        <VisitLogger
          slug={event.slug}
          path={`/event/${event.slug}`}
          utm_source={utmSource}
          utm_medium={utmMedium}
          utm_campaign={utmCampaign}
          utm_term={utmTerm}
          utm_content={utmContent}
        />
      )}
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{event.slug}</h1>
          <p className="mt-1 text-xs text-gray-500">코드: {event.code}</p>
        </div>

        {/* 모듈 배지 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {event.module_registration && (
            <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              등록
            </span>
          )}
          {event.module_survey && (
            <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              설문
            </span>
          )}
          {event.module_webinar && (
            <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              웨비나
            </span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/event/${event.slug}/enter`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            이벤트 진입
          </Link>
          {event.module_registration && (
            <Link
              href={`/event/${event.slug}/register`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              등록하기
            </Link>
          )}
          {event.module_survey && (
            <Link
              href={`/event/${event.slug}/survey`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              설문 참여
            </Link>
          )}
          {event.module_webinar && (
            <Link
              href={`/event/${event.slug}/webinar`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              웨비나
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
