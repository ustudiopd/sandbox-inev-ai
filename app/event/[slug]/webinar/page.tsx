import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export default async function PublicEventWebinarPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminSupabase()
  
  // 숫자 코드면 code로 조회, 아니면 slug로 조회
  const isNumericCode = /^\d+$/.test(slug)
  const eventQuery = isNumericCode
    ? supabase.from('events').select('id, code, slug, module_webinar').eq('code', slug).limit(1).single()
    : supabase.from('events').select('id, code, slug, module_webinar').eq('slug', slug).limit(1).single()
  
  const { data: event, error } = await eventQuery

  if (error || !event) notFound()
  if (!event.module_webinar) notFound()

  // 이벤트에 연결된 웨비나 조회 (event_id로 연결된 웨비나, Phase 6)
  let webinar = null
  
  // Phase 6: event_id로 웨비나 조회 시도
  try {
    const { data: webinarByEventId, error: webinarError } = await supabase
      .from('webinars')
      .select('id, slug')
      .eq('event_id', event.id)
      .maybeSingle()
    
    if (webinarByEventId && !webinarError) {
      webinar = webinarByEventId
    } else if (webinarError && webinarError.code !== '42703') {
      // 42703은 컬럼이 없는 경우이므로 무시, 다른 에러는 로깅
      console.error('[PublicEventWebinarPage] 웨비나 조회 오류:', webinarError)
    }
  } catch (error: any) {
    // event_id 컬럼이 없을 수 있음 (마이그레이션 미적용)
    console.log('[PublicEventWebinarPage] event_id로 웨비나 조회 실패 (컬럼 없을 수 있음):', error.message)
  }

  // 웨비나를 찾았으면 웨비나 페이지로 리다이렉트
  if (webinar) {
    redirect(`/webinar/${webinar.id}`)
  }

  // 웨비나가 없으면 안내 메시지 표시
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">웨비나</h1>
          <p className="mt-2 text-sm text-gray-600">이벤트 코드: {event.code}</p>
        </div>
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            이 이벤트에 연결된 웨비나가 아직 설정되지 않았습니다.
          </p>
          <p className="mt-2 text-xs text-yellow-700">
            관리자 페이지에서 웨비나를 생성하고 이벤트에 연결해주세요.
          </p>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <a
            href={`/event/${event.slug}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            ← 이벤트로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
}
