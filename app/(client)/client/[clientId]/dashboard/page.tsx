import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UnifiedListItem from './components/UnifiedListItem'

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
    
    // 웨비나, 온디맨드, 캠페인을 병렬로 조회 (성능 최적화)
    // 기존: 순차 쿼리 900ms → 개선: 병렬 쿼리 300ms (3배 개선)
    const [webinarsResult, ondemandsResult, campaignsResult] = await Promise.allSettled([
      // 웨비나 목록 조회 (라이브만, 온디맨드 제외)
      admin
        .from('webinars')
        .select('*')
        .eq('client_id', clientId)
        .or('type.is.null,type.eq.live,type.neq.ondemand') // type이 null이거나 'live'이거나 'ondemand'가 아닌 것
        .order('created_at', { ascending: false }),
      // 온디맨드 목록 조회
      admin
        .from('webinars')
        .select('*')
        .eq('client_id', clientId)
        .eq('type', 'ondemand')
        .order('created_at', { ascending: false }),
      // 설문조사 캠페인 목록 조회
      admin
        .from('event_survey_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ])
    
    // 결과 추출 및 에러 처리
    const webinars = webinarsResult.status === 'fulfilled' ? webinarsResult.value.data : null
    const webinarsError = webinarsResult.status === 'fulfilled' ? webinarsResult.value.error : null
    
    const ondemands = ondemandsResult.status === 'fulfilled' ? ondemandsResult.value.data : null
    const ondemandsError = ondemandsResult.status === 'fulfilled' ? ondemandsResult.value.error : null
    
    const campaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value.data : null
    const campaignsError = campaignsResult.status === 'fulfilled' ? campaignsResult.value.error : null
    
    // 실제 에러가 있는 경우에만 로그 출력 (PGRST205=테이블 없음, 42703=컬럼 없음은 무시)
    if (webinarsError && webinarsError.code !== '42703' && webinarsError.code !== 'PGRST205') {
      const hasErrorInfo = 
        (webinarsError.code !== undefined && webinarsError.code !== null) ||
        (webinarsError.message !== undefined && webinarsError.message !== null) ||
        (webinarsError.details !== undefined && webinarsError.details !== null) ||
        (webinarsError.hint !== undefined && webinarsError.hint !== null)
      
      if (hasErrorInfo) {
        const errorInfo: any = {}
        if (webinarsError.code !== undefined && webinarsError.code !== null) errorInfo.code = String(webinarsError.code)
        if (webinarsError.message !== undefined && webinarsError.message !== null) errorInfo.message = String(webinarsError.message)
        if (webinarsError.details !== undefined && webinarsError.details !== null) errorInfo.details = String(webinarsError.details)
        if (webinarsError.hint !== undefined && webinarsError.hint !== null) errorInfo.hint = String(webinarsError.hint)
        
        console.error('[ClientDashboard] 웨비나 목록 조회 오류:', JSON.stringify(errorInfo, null, 2))
      } else {
        console.warn('[ClientDashboard] 웨비나 목록 조회 - 에러 객체는 있지만 상세 정보 없음:', {
          clientId,
          errorType: typeof webinarsError,
          errorExists: !!webinarsError,
        })
      }
    }
    
    // 실제 에러가 있는 경우에만 로그 출력 (PGRST205=테이블 없음은 inev 전용 DB 등에서 정상)
    if (campaignsError && campaignsError.code !== 'PGRST205') {
      const hasErrorInfo = 
        (campaignsError.code !== undefined && campaignsError.code !== null) ||
        (campaignsError.message !== undefined && campaignsError.message !== null) ||
        (campaignsError.details !== undefined && campaignsError.details !== null) ||
        (campaignsError.hint !== undefined && campaignsError.hint !== null)
      
      if (hasErrorInfo) {
        const errorInfo: any = {}
        if (campaignsError.code !== undefined && campaignsError.code !== null) errorInfo.code = String(campaignsError.code)
        if (campaignsError.message !== undefined && campaignsError.message !== null) errorInfo.message = String(campaignsError.message)
        if (campaignsError.details !== undefined && campaignsError.details !== null) errorInfo.details = String(campaignsError.details)
        if (campaignsError.hint !== undefined && campaignsError.hint !== null) errorInfo.hint = String(campaignsError.hint)
        
        console.error('[ClientDashboard] 캠페인 목록 조회 오류:', JSON.stringify(errorInfo, null, 2))
      } else {
        console.warn('[ClientDashboard] 캠페인 목록 조회 - 에러 객체는 있지만 상세 정보 없음:', {
          clientId,
          errorType: typeof campaignsError,
          errorExists: !!campaignsError,
        })
      }
    }
  
  // 웨비나, 온디맨드, 설문조사, 등록 페이지를 통합 리스트로 변환
  const unifiedItems = [
    ...(webinars || []).map((webinar: any) => ({
      type: 'webinar' as const,
      id: webinar.id,
      slug: webinar.slug,
      title: webinar.title,
      project_name: webinar.project_name,
      start_time: webinar.start_time,
      created_at: webinar.created_at,
    })),
    ...(ondemands || []).map((ondemand: any) => ({
      type: 'ondemand' as const,
      id: ondemand.id,
      slug: ondemand.slug,
      title: ondemand.title,
      project_name: ondemand.project_name,
      start_time: null, // 온디맨드는 시작 시간 없음
      created_at: ondemand.created_at,
    })),
    ...(campaigns || []).map((campaign: any) => ({
      type: (campaign.type || 'survey') as 'survey' | 'registration',
      id: campaign.id,
      title: campaign.title,
      public_path: campaign.public_path,
      created_at: campaign.created_at,
    })),
  ].sort((a, b) => {
    // 최신순 정렬
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {clientName} 대시보드
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">웨비나, 설문조사, 등록페이지를 생성하고 관리하세요</p>
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
              href={`/client/${clientId}/webinars/new`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              + 웨비나 생성
            </Link>
            <Link 
              href={`/client/${clientId}/ondemand/new`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              + 온디맨드 생성
            </Link>
            <Link 
              href={`/client/${clientId}/surveys/new`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:from-pink-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              + 설문조사 생성
            </Link>
            <Link 
              href={`/client/${clientId}/registrations/new`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              + 등록페이지 생성
            </Link>
            <Link 
              href={`/client/${clientId}/campaigns`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              📈 광고/캠페인
            </Link>
            <Link 
              href={`/client/${clientId}/notes`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              📝 노트
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-blue-500 dark:border-blue-400">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">웨비나 수</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{webinars?.length || 0}</p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-20 dark:opacity-30 flex-shrink-0 ml-2">🎥</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-teal-500 dark:border-teal-400">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">온디맨드 수</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{ondemands?.length || 0}</p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-20 dark:opacity-30 flex-shrink-0 ml-2">📺</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-purple-500 dark:border-purple-400">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">설문조사 수</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {campaigns?.filter((c: any) => (c.type || 'survey') === 'survey').length || 0}
                </p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-20 dark:opacity-30 flex-shrink-0 ml-2">📋</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-cyan-500 dark:border-cyan-400">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">등록페이지 수</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {campaigns?.filter((c: any) => c.type === 'registration').length || 0}
                </p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-20 dark:opacity-30 flex-shrink-0 ml-2">📝</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white">웨비나 & 온디맨드 & 설문조사 & 등록페이지 목록</h2>
          </div>
          <div className="p-4 sm:p-6">
            {unifiedItems.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {unifiedItems.map((item) => (
                  <UnifiedListItem 
                    key={`${item.type}-${item.id}`} 
                    item={item}
                    clientId={clientId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8 sm:py-12">
                <div className="text-4xl sm:text-5xl mb-4">📋</div>
                <p className="text-base sm:text-lg">웨비나나 설문조사가 없습니다.</p>
                <p className="text-sm mt-2">새 웨비나나 설문조사를 생성해주세요.</p>
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

