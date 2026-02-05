import { requireAgencyMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import Link from 'next/link'

// 워트인텔리전트 → 워트인텔리전스로 변환하는 헬퍼 함수
function normalizeClientName(name: string): string {
  if (name.includes('워트인텔리전트')) {
    return name.replace(/워트인텔리전트/g, '워트인텔리전스')
  }
  return name
}

export default async function AgencyDashboard({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const { user, role } = await requireAgencyMember(agencyId)
  const supabase = await createServerSupabase()
  
  // 프로필 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single()
  
  // 역할 한글명 매핑
  const roleNames: Record<string, string> = {
    owner: '소유자',
    admin: '관리자',
    analyst: '분석가',
  }
  
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single()
  
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('agency_id', agencyId)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {agency?.name} 대시보드
              </h1>
              <p className="text-sm sm:text-base text-gray-600">에이전시 관리 대시보드</p>
            </div>
            <div className="bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow border border-gray-200 w-full md:w-auto">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-gray-600">접속 계정</div>
                  <div className="font-semibold text-gray-900 truncate">{profile?.display_name || profile?.email || user.email}</div>
                  <div className="text-xs text-blue-600 mt-1">에이전시 {roleNames[role] || role}</div>
                </div>
                <Link
                  href="/settings/profile"
                  className="ml-4 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] flex items-center justify-center flex-shrink-0"
                >
                  수정
                </Link>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <Link 
              href={`/agency/${agencyId}/clients`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              👥 클라이언트 관리
            </Link>
            <Link 
              href={`/agency/${agencyId}/reports`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              📈 리포트 및 통계
            </Link>
            <Link 
              href={`/agency/${agencyId}/domains`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              🌐 도메인 관리
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">클라이언트 수</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{clients?.length || 0}</p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-20 flex-shrink-0 ml-2">👥</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white">클라이언트 목록</h2>
          </div>
          <div className="p-4 sm:p-6">
            {clients && clients.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-800 block truncate">{normalizeClientName(client.name)}</span>
                    </div>
                    <Link 
                      href={`/client/${client.id}/dashboard`}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center text-center sm:text-left"
                    >
                      대시보드 →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8 sm:py-12">
                <div className="text-4xl sm:text-5xl mb-4">📭</div>
                <p className="text-base sm:text-lg">클라이언트가 없습니다.</p>
                <p className="text-sm mt-2">새 클라이언트를 생성하거나 초대해주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

