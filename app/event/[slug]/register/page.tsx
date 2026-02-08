import { createAdminSupabase } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { RegistrationForm } from './RegistrationForm'
import { VisitLogger } from '../VisitLogger'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PublicEventRegisterPage({ params, searchParams }: Props) {
  const { slug } = await params
  const q = await searchParams
  const supabase = createAdminSupabase()
  const { data: event, error } = await supabase
    .from('events')
    .select('id, slug, module_registration, module_utm')
    .eq('slug', slug)
    .limit(1)
    .single()

  if (error || !event) notFound()
  if (!event.module_registration) notFound()

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
          path={`/event/${event.slug}/register`}
          utm_source={utmSource}
          utm_medium={utmMedium}
          utm_campaign={utmCampaign}
          utm_term={utmTerm}
          utm_content={utmContent}
        />
      )}
      <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">이벤트 등록</h1>
          <p className="mt-1 text-xs text-gray-500">{event.slug}</p>
        </div>
        <RegistrationForm slug={event.slug} />
      </div>
    </div>
  )
}
