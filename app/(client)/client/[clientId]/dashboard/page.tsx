import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UnifiedListItem from './components/UnifiedListItem'
import StatisticsOverview from './components/StatisticsOverview'

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
      .select('id, code, slug, created_at, updated_at, module_webinar, module_survey, module_registration')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (eventsError && eventsError.code !== 'PGRST205') {
      console.error('[ClientDashboard] 이벤트 목록 조회 오류:', eventsError)
    }
    
    const events = eventsData || []
  
  // 이벤트 목록을 통합 리스트로 변환
  const unifiedItems = (events || []).map((event: any) => ({
    type: 'event' as const,
    id: event.id,
    code: event.code,
    slug: event.slug,
    title: `이벤트 ${event.code}`,
    created_at: event.created_at,
    updated_at: event.updated_at,
    module_webinar: event.module_webinar,
    module_survey: event.module_survey,
    module_registration: event.module_registration,
  }))
  
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {clientName} 대시보드
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">이벤트를 생성하고 관리하세요</p>
            </div>
            <div className="bg-white dark:bg-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 w-full md:w-auto">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">접속 계정</div>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{finalProfile?.display_name || finalProfile?.email || user.email}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">클라이언트 {roleNames[role] || role}</div>
                </div>
                <Link
                  href="/settings/profile"
                  className="ml-4 px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors min-h-[44px] flex items-center justify-center flex-shrink-0"
                >
                  수정
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <Link 
              href={`/inev-admin/clients/${clientId}/events/new`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              + 이벤트 생성
            </Link>
            <Link 
              href={`/client/${clientId}/notes`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              📝 노트
            </Link>
          </div>
        </div>
        
        {/* Phase 10: 통계는 StatisticsOverview 컴포넌트에서 API로 조회 */}
        <div className="mb-6 sm:mb-8">
          <StatisticsOverview clientId={clientId} />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white">이벤트 목록</h2>
          </div>
          <div className="p-4 sm:p-6">
            {unifiedItems.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {unifiedItems.map((item) => (
                  <Link
                    key={`event-${item.id}`}
                    href={`/inev-admin/clients/${clientId}/events/${item.id}`}
                    className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-300">코드: {item.code}</span>
                          {item.module_webinar && (
                            <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                              웨비나
                            </span>
                          )}
                          {item.module_survey && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              설문
                            </span>
                          )}
                          {item.module_registration && (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                              등록
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                        {new Date(item.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8 sm:py-12">
                <div className="text-4xl sm:text-5xl mb-4">📋</div>
                <p className="text-base sm:text-lg">이벤트가 없습니다.</p>
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

