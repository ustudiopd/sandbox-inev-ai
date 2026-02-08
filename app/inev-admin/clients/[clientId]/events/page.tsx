import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth, ensureClientAccess } from '@/lib/auth/inev-api-auth'
import Link from 'next/link'

type EventRow = {
  id: string
  client_id: string
  code: string
  slug: string
  module_registration: boolean
  module_survey: boolean
  module_webinar: boolean
  created_at: string
}

export default async function InevAdminEventsPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  
  // 인증 및 권한 확인
  const auth = await getInevAuth()
  if (auth instanceof Response) {
    return <div className="text-red-600">인증 오류</div>
  }
  
  const forbidden = ensureClientAccess(clientId, auth.allowedClientIds)
  if (forbidden) {
    return <div className="text-red-600">접근 권한이 없습니다</div>
  }
  
  // 서버 사이드에서 직접 데이터 조회 (성능 최적화)
  const admin = createAdminSupabase()
  
  // 클라이언트 정보 조회 (Wert Intelligence 확인용)
  const { data: client } = await admin
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .maybeSingle()
  
  const { data: events, error } = await admin
    .from('events')
    .select('id, client_id, code, slug, module_registration, module_survey, module_webinar, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(100) // 최대 100개만 조회 (성능 최적화)
  
  if (error) {
    return <div className="text-red-600">오류: {error.message}</div>
  }

  const eventsList = events || []
  const isWertIntelligence = client?.name?.includes('Wert Intelligence') || client?.name?.includes('워트 인텔리전스')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inev-admin" className="text-sm text-gray-500 hover:text-gray-700">← Clients</Link>
          {isWertIntelligence ? (
            <h1 className="mt-1 text-xl font-semibold text-gray-900">{client?.name || 'Wert Intelligence'}</h1>
          ) : (
            <h1 className="mt-1 text-xl font-semibold text-gray-900">이벤트</h1>
          )}
        </div>
        <Link
          href={`/inev-admin/clients/${clientId}/events/new`}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          이벤트 추가
        </Link>
      </div>
      {eventsList.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
          이벤트가 없습니다. 이벤트를 추가해 보세요.
        </div>
      ) : (
        <ul className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {eventsList.map((e) => (
            <li key={e.id} className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0">
              <div>
                <span className="font-medium text-gray-900">{e.slug}</span>
                <span className="ml-2 text-sm text-gray-500">코드: {e.code}</span>
              </div>
              <div className="flex gap-2 text-xs">
                {e.module_registration && <span className="rounded bg-gray-100 px-1.5 py-0.5">등록</span>}
                {e.module_survey && <span className="rounded bg-gray-100 px-1.5 py-0.5">설문</span>}
                {e.module_webinar && <span className="rounded bg-gray-100 px-1.5 py-0.5">웨비나</span>}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/inev-admin/clients/${clientId}/events/${e.id}`} className="text-sm text-gray-700 hover:underline">
                  편집
                </Link>
                <Link href={`/event/${e.slug}`} className="text-sm text-blue-600 hover:underline" target="_blank" rel="noopener">
                  Public →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
