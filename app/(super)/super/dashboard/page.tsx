import { requireSuperAdmin } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function SuperDashboard() {
  const { user } = await requireSuperAdmin()
  // 슈퍼어드민은 Admin Supabase 사용 (RLS 우회, 성능 향상)
  const admin = createAdminSupabase()

  // 병렬로 모든 데이터 조회 (에러 처리 포함)
  const [
    profileResult,
    agenciesCountResult,
    clientsCountResult,
    webinarsCountResult,
    recentAgenciesResult,
    recentClientsResult,
  ] = await Promise.allSettled([
    admin
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single(),
    admin
      .from('agencies')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('clients')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('webinars')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('agencies')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('clients')
      .select('id, name, agency_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // 결과 추출 (에러 발생 시 기본값 사용)
  const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null
  const agenciesCount = agenciesCountResult.status === 'fulfilled' ? agenciesCountResult.value.count : 0
  const clientsCount = clientsCountResult.status === 'fulfilled' ? clientsCountResult.value.count : 0
  const webinarsCount = webinarsCountResult.status === 'fulfilled' ? webinarsCountResult.value.count : 0
  const recentAgencies = recentAgenciesResult.status === 'fulfilled' ? recentAgenciesResult.value.data : []
  const recentClients = recentClientsResult.status === 'fulfilled' ? recentClientsResult.value.data : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                슈퍼 관리자 대시보드
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">전체 시스템 관리 및 모니터링</p>
            </div>
            <div className="bg-white dark:bg-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 w-full md:w-auto">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">접속 계정</div>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                    {profile?.display_name || profile?.email || user.email}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">슈퍼 관리자</div>
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
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 min-w-0">
              <h2 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-200 truncate">에이전시 수</h2>
              <div className="text-3xl md:text-4xl flex-shrink-0 ml-2">🏢</div>
            </div>
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400">{agenciesCount || 0}</p>
            <Link
              href="/super/agencies"
              className="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 min-w-0">
              <h2 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-200 truncate">클라이언트 수</h2>
              <div className="text-3xl md:text-4xl flex-shrink-0 ml-2">👥</div>
            </div>
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-purple-600 dark:text-purple-400">{clientsCount || 0}</p>
            <Link
              href="/super/clients"
              className="mt-4 inline-block text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 min-w-0">
              <h2 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-200 truncate">웨비나 수</h2>
              <div className="text-3xl md:text-4xl flex-shrink-0 ml-2">🎥</div>
            </div>
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-green-600 dark:text-green-400">{webinarsCount || 0}</p>
          </div>
        </div>

        {/* 최근 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* 최근 에이전시 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white">최근 에이전시</h2>
            </div>
            <div className="p-4 sm:p-6">
              {recentAgencies && recentAgencies.length > 0 ? (
                <ul className="space-y-2 sm:space-y-3">
                  {recentAgencies.map((agency) => (
                    <li
                      key={agency.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">{agency.name}</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(agency.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <Link
                        href="/super/agencies"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium w-full sm:w-auto text-center sm:text-left"
                      >
                        보기 →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p>에이전시가 없습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* 최근 클라이언트 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white">최근 클라이언트</h2>
            </div>
            <div className="p-4 sm:p-6">
              {recentClients && recentClients.length > 0 ? (
                <ul className="space-y-2 sm:space-y-3">
                  {recentClients.map((client) => (
                    <li
                      key={client.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">{client.name}</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(client.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <Link
                        href="/super/clients"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium w-full sm:w-auto text-center sm:text-left"
                      >
                        보기 →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p>클라이언트가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

