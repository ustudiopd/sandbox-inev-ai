import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UnifiedListItem from './components/UnifiedListItem'
import EventItemActions from './components/EventItemActions'

export default async function ClientDashboard({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  try {
    const { clientId } = await params
    
    if (!clientId) {
      console.error('[ClientDashboard] clientId가 없습니다')
      redirect('/')
    }
    
    const { user, role, profile } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
    // requireClientMember에서 이미 프로필 정보를 반환하므로 재조회 불필요
    // RLS 무한 재귀 문제를 방지하기 위해 Admin Supabase로 조회하거나 이미 반환된 프로필 사용
    // 프로필이 없는 경우에만 Admin Supabase로 조회 (RLS 우회)
    let finalProfile = profile
    if (!finalProfile) {
      const admin = createAdminSupabase()
      const { data: adminProfile, error: profileError } = await admin
        .from('profiles')
        .select('display_name, email, is_super_admin')
        .eq('id', user.id)
        .maybeSingle()
      
      if (profileError) {
        // PGRST205 = 테이블 없음 (inev 전용 DB 등 EventFlow 스키마 미사용 시 정상)
        if (profileError.code === 'PGRST205') {
          finalProfile = null
        } else {
          const hasErrorInfo = 
            (profileError.code !== undefined && profileError.code !== null) ||
            (profileError.message !== undefined && profileError.message !== null) ||
            (profileError.details !== undefined && profileError.details !== null) ||
            (profileError.hint !== undefined && profileError.hint !== null)
          
          if (hasErrorInfo) {
            const errorInfo: any = {}
            if (profileError.code !== undefined && profileError.code !== null) errorInfo.code = String(profileError.code)
            if (profileError.message !== undefined && profileError.message !== null) errorInfo.message = String(profileError.message)
            if (profileError.details !== undefined && profileError.details !== null) errorInfo.details = String(profileError.details)
            if (profileError.hint !== undefined && profileError.hint !== null) errorInfo.hint = String(profileError.hint)
            
            console.error('[ClientDashboard] 프로필 조회 오류 (Admin):', JSON.stringify(errorInfo, null, 2))
          }
        }
      } else {
        finalProfile = adminProfile || null
      }
    }
    
    // 역할 한글명 매핑
    const roleNames: Record<string, string> = {
      owner: '소유자',
      admin: '관리자',
      operator: '운영자',
      analyst: '분석가',
      viewer: '조회자',
      member: '멤버',
    }
    
    // 클라이언트 정보 조회 (에러 발생 시에도 계속 진행)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()
    
    // 실제 에러가 있는 경우에만 로그 출력
    if (clientError) {
      const hasErrorInfo = 
        (clientError.code !== undefined && clientError.code !== null) ||
        (clientError.message !== undefined && clientError.message !== null) ||
        (clientError.details !== undefined && clientError.details !== null) ||
        (clientError.hint !== undefined && clientError.hint !== null)
      
      if (hasErrorInfo) {
        const errorInfo: any = {}
        if (clientError.code !== undefined && clientError.code !== null) errorInfo.code = String(clientError.code)
        if (clientError.message !== undefined && clientError.message !== null) errorInfo.message = String(clientError.message)
        if (clientError.details !== undefined && clientError.details !== null) errorInfo.details = String(clientError.details)
        if (clientError.hint !== undefined && clientError.hint !== null) errorInfo.hint = String(clientError.hint)
        
        console.error('[ClientDashboard] 클라이언트 조회 오류:', JSON.stringify(errorInfo, null, 2))
      } else {
        console.warn('[ClientDashboard] 클라이언트 조회 - 에러 객체는 있지만 상세 정보 없음:', {
          clientId,
          errorType: typeof clientError,
          errorExists: !!clientError,
        })
      }
    }
    
    if (!client) {
      console.error('[ClientDashboard] 클라이언트를 찾을 수 없습니다:', clientId)
      redirect('/')
    }
    
    // 인텔리전트 → 인텔리전스로 변환
    let clientName = client.name || ''
    if (clientName.includes('인텔리전트')) {
      clientName = clientName.replace(/인텔리전트/g, '인텔리전스')
    }
    
    const admin = createAdminSupabase()
    
    // Phase 10: events 기준으로 변경
    // 이벤트 목록 조회 (최근 50개)
    const { data: eventsData, error: eventsError } = await admin
      .from('events')
      .select('id, code, slug, title, campaign_start_date, campaign_end_date, event_date, event_start_date, event_end_date, event_date_type, created_at, updated_at, module_webinar, module_survey, module_registration, module_ondemand, module_email, module_utm')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (eventsError && eventsError.code !== 'PGRST205') {
      console.error('[ClientDashboard] 이벤트 목록 조회 오류:', eventsError)
    }
    
    const events = eventsData || []
  
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

  // 이벤트 목록을 통합 리스트로 변환
  const unifiedItems = (events || []).map((event: any) => ({
    type: 'event' as const,
    id: event.id,
    code: event.code,
    slug: event.slug,
    title: event.title || `이벤트 ${event.code}`,
    campaign_start_date: event.campaign_start_date,
    campaign_end_date: event.campaign_end_date,
    event_date: event.event_date,
    event_start_date: event.event_start_date,
    event_end_date: event.event_end_date,
    event_date_type: event.event_date_type,
    created_at: event.created_at,
    updated_at: event.updated_at,
    module_webinar: event.module_webinar,
    module_survey: event.module_survey,
    module_registration: event.module_registration,
    module_ondemand: event.module_ondemand,
    module_email: event.module_email,
    module_utm: event.module_utm,
  }))
  
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 헤더 영역 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {clientName} 대시보드
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">이벤트를 생성하고 관리하세요</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/inev-admin/clients/${clientId}/events/new`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
              >
                + 이벤트 생성
              </Link>
              <Link 
                href={`/client/${clientId}/notes`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                📝 노트
              </Link>
            </div>
          </div>
        </div>
        
        {/* 이벤트 목록 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">이벤트 목록</h2>
          </div>
          <div className="p-6">
            {unifiedItems.length > 0 ? (
              <div className="space-y-2">
                {unifiedItems.map((item) => (
                  <div
                    key={`event-${item.id}`}
                    className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/inev-admin/clients/${clientId}/events/${item.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block mb-1">
                          {item.title || item.slug}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">코드: {item.code}</span>
                            {item.campaign_start_date && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                캠페인: {formatDate(item.campaign_start_date)}
                                {item.campaign_end_date ? ` ~ ${formatDate(item.campaign_end_date)}` : ' ~ 종료 미정'}
                              </span>
                            )}
                            {formatEventDate(item) && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                이벤트: {formatEventDate(item)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                          {item.module_registration && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                              등록
                            </span>
                          )}
                          {item.module_survey && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              설문
                            </span>
                          )}
                          {item.module_webinar && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                              웨비나
                            </span>
                          )}
                          {item.module_ondemand && (
                            <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded">
                              온디맨드
                            </span>
                          )}
                          {item.module_email && (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                              이메일
                            </span>
                          )}
                          {item.module_utm && (
                            <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                              UTM
                            </span>
                          )}
                          </div>
                        </div>
                      </Link>
                      <EventItemActions
                        clientId={clientId}
                        eventId={item.id}
                        eventSlug={item.slug}
                        eventCode={item.code}
                        createdAt={item.created_at}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-base">이벤트가 없습니다.</p>
                <p className="text-sm mt-2">새 이벤트를 생성해주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    )
  } catch (error: any) {
    // NEXT_REDIRECT는 정상적인 리다이렉트이므로 에러로 처리하지 않음
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // 리다이렉트는 그대로 전파
    }
    console.error('[ClientDashboard] 대시보드 로드 오류:', error)
    console.error('[ClientDashboard] 에러 상세:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    redirect('/')
  }
}

