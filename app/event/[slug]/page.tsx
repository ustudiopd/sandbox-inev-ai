import { createAdminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VisitLogger } from './VisitLogger'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

/**
 * slug가 숫자 코드인지 확인
 */
function isNumericCode(slug: string): boolean {
  return /^\d+$/.test(slug)
}

/**
 * 메타데이터 생성 함수
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminSupabase()
  
  try {
    // 숫자 코드면 code로 조회, 아니면 slug로 조회
    const query = isNumericCode(slug)
      ? admin.from('events').select('id, code, slug').eq('code', slug).maybeSingle()
      : admin.from('events').select('id, code, slug').eq('slug', slug).maybeSingle()
    
    const { data: event } = await query
    
    // 185044 이벤트에 대한 특별 메타데이터
    if (event?.code === '185044') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wert.inev.ai'
      // 로컬 이미지 파일 사용 (public/img/wert/thumb_wert2.png)
      const thumbnailUrl = `${appUrl}/img/wert/thumb_wert2.png`
      const canonicalUrl = `${appUrl}/event/${slug}`
      
      const metaTitle = '실제 고객사례로 알아보는 AI 특허리서치 실무 활용 웨비나'
      const metaDescription = 'IP팀·특허사무소·R&D팀의 키워트 인사이트 활용 방식이 궁금하다면, 2월 6일 웨비나에서 직접 확인하세요.'
      
      return {
        title: `${metaTitle} | keywert Insight`,
        description: metaDescription,
        metadataBase: new URL(appUrl),
        openGraph: {
          title: metaTitle,
          description: metaDescription,
          type: 'website',
          url: canonicalUrl,
          siteName: 'keywert Insight',
          images: [
            {
              url: thumbnailUrl,
              width: 1200,
              height: 630,
              alt: metaTitle,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title: metaTitle,
          description: metaDescription,
          images: [thumbnailUrl],
        },
        alternates: {
          canonical: canonicalUrl,
        },
      }
    }
  } catch (error) {
    console.error('[generateMetadata] 이벤트 메타데이터 조회 오류:', error)
  }
  
  return {}
}

export default async function PublicEventPage({ params, searchParams }: Props) {
  const { slug } = await params
  const q = await searchParams
  const supabase = createAdminSupabase()
  
  // 숫자 코드면 code로 조회, 아니면 slug로 조회
  const query = isNumericCode(slug)
    ? supabase.from('events').select('id, code, slug, title, module_registration, module_survey, module_webinar, module_utm, module_ondemand, event_date, event_start_date, event_end_date, event_date_type').eq('code', slug).limit(1).single()
    : supabase.from('events').select('id, code, slug, title, module_registration, module_survey, module_webinar, module_utm, module_ondemand, event_date, event_start_date, event_end_date, event_date_type').eq('slug', slug).limit(1).single()
  
  const { data: event, error } = await query

  if (error || !event) notFound()

  // 722895 메인 페이지는 Event722895Landing 사용
  if (event.code === '722895') {
    const Event722895Landing = (await import('./components/Event722895Landing')).default
    return <Event722895Landing event={event} />
  }

  // 175419 메인 페이지는 Event175419Landing 사용
  if (event.code === '175419') {
    const Event175419Landing = (await import('./components/Event175419Landing')).default
    return <Event175419Landing event={event} />
  }

  // 149403 메인 페이지는 WebinarFormWertPage 사용 (온디맨드 모듈이어도 메인 페이지 표시)
  if (event.code === '149403') {
    const WebinarFormWertPage = (await import('@/app/webinarform/wert/page')).default
    return <WebinarFormWertPage />
  }

  // 185044 메인 페이지는 WebinarFormPatentPage 사용
  if (event.code === '185044') {
    const WebinarFormPatentPage = (await import('@/app/webinarform/patent/page')).default
    return <WebinarFormPatentPage />
  }

  // 149403이 아닌 다른 온디맨드 이벤트는 온디맨드 시청 페이지로 리다이렉트
  if (event.module_ondemand && event.code !== '149403') {
    const { redirect } = await import('next/navigation')
    redirect(`/event/${event.slug}/ondemand`)
  }

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
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {event.slug === event.code ? event.code : event.slug}
          </h1>
          {event.slug !== event.code && (
            <p className="mt-2 text-sm text-gray-600">이벤트 코드: {event.code}</p>
          )}
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
          {event.module_ondemand && (
            <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              온디맨드
            </span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {event.module_ondemand ? (
            <Link
              href={`/event/${event.slug}/ondemand`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              입장하기
            </Link>
          ) : (
            <Link
              href={`/event/${event.slug}/enter`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              이벤트 진입
            </Link>
          )}
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
