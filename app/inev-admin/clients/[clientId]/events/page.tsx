import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth, ensureClientAccess } from '@/lib/auth/inev-api-auth'
import Link from 'next/link'
import { Edit, ExternalLink, ArrowLeft } from 'lucide-react'

type EventRow = {
  id: string
  client_id: string
  code: string
  slug: string
  title?: string | null
  module_registration: boolean
  module_survey: boolean
  module_webinar: boolean
  module_ondemand?: boolean
  module_email?: boolean
  module_utm?: boolean
  created_at: string
  settings?: {
    title?: string
  } | null
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
    .select('id, client_id, code, slug, title, campaign_start_date, campaign_end_date, event_date, event_start_date, event_end_date, event_date_type, module_registration, module_survey, module_webinar, module_ondemand, module_email, module_utm, created_at, settings')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(100) // 최대 100개만 조회 (성능 최적화)
  
  if (error) {
    return <div className="text-red-600">오류: {error.message}</div>
  }

  const eventsList = events || []
  const isWertIntelligence = client?.name?.includes('Wert Intelligence') || client?.name?.includes('워트 인텔리전스')

  // 날짜 포맷 함수
  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Seoul'
    })
  }

  // 이벤트 날짜 표시 함수
  const formatEventDate = (event: any) => {
    if (event.event_date_type === 'range') {
      const start = formatDate(event.event_start_date)
      const end = formatDate(event.event_end_date)
      if (start && end) return `${start} ~ ${end}`
      if (start) return `${start} ~`
      if (end) return `~ ${end}`
    } else {
      return formatDate(event.event_date)
    }
    return null
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <Link
            href={`/client/${clientId}/dashboard`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">이벤트</h1>
            </div>
            <Link
              href={`/inev-admin/clients/${clientId}/events/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
            >
              + 이벤트 추가
            </Link>
          </div>
        </div>
        
        {eventsList.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500 dark:text-gray-400">이벤트가 없습니다. 이벤트를 추가해 보세요.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">이벤트 목록 ({eventsList.length})</h2>
            </div>
            <ul>
              {eventsList.map((e) => (
                <li key={e.id} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Link 
                          href={`/inev-admin/clients/${clientId}/events/${e.id}`}
                          className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {(e as any).title || e.settings?.title || e.slug}
                        </Link>
                        <span className="text-sm text-gray-500 dark:text-gray-400">코드: {e.code}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        {((e as any).campaign_start_date || (e as any).campaign_end_date) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            캠페인: {(e as any).campaign_start_date ? formatDate((e as any).campaign_start_date) : '시작 미정'}
                            {(e as any).campaign_end_date ? ` ~ ${formatDate((e as any).campaign_end_date)}` : (e as any).campaign_start_date ? ' ~ 종료 미정' : ''}
                          </div>
                        )}
                        {formatEventDate(e as any) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            이벤트: {formatEventDate(e as any)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {e.module_registration && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            등록
                          </span>
                        )}
                        {e.module_survey && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            설문
                          </span>
                        )}
                        {e.module_webinar && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            웨비나
                          </span>
                        )}
                        {(e as any).module_ondemand && (
                          <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded">
                            온디맨드
                          </span>
                        )}
                        {(e as any).module_email && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                            이메일
                          </span>
                        )}
                        {(e as any).module_utm && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                            UTM
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link 
                        href={`/inev-admin/clients/${clientId}/events/${e.id}`} 
                        className="inline-flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        title="편집"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link 
                        href={`/event/${e.slug}`} 
                        className="inline-flex items-center justify-center p-2 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" 
                        target="_blank" 
                        rel="noopener"
                        title="공개 페이지"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
