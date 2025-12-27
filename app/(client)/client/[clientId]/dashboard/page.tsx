import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import UnifiedListItem from './components/UnifiedListItem'

export default async function ClientDashboard({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const { user, role } = await requireClientMember(clientId)
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
    operator: '운영자',
    analyst: '분석가',
    viewer: '조회자',
    member: '멤버',
  }
  
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()
  
  const admin = createAdminSupabase()
  
  // 웨비나 목록 조회
  const { data: webinars } = await admin
    .from('webinars')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  
  // 설문조사 캠페인 목록 조회
  const { data: campaigns } = await admin
    .from('event_survey_campaigns')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  
  // 웨비나와 설문조사를 통합 리스트로 변환
  const unifiedItems = [
    ...(webinars || []).map((webinar: any) => ({
      type: 'webinar' as const,
      id: webinar.id,
      slug: webinar.slug,
      title: webinar.title,
      start_time: webinar.start_time,
      created_at: webinar.created_at,
    })),
    ...(campaigns || []).map((campaign: any) => ({
      type: 'survey' as const,
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {client?.name} 대시보드
              </h1>
              <p className="text-sm sm:text-base text-gray-600">웨비나와 설문조사를 생성하고 관리하세요</p>
            </div>
            <div className="bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow border border-gray-200 w-full md:w-auto">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-gray-600">접속 계정</div>
                  <div className="font-semibold text-gray-900 truncate">{profile?.display_name || profile?.email || user.email}</div>
                  <div className="text-xs text-blue-600 mt-1">클라이언트 {roleNames[role] || role}</div>
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
              href={`/client/${clientId}/webinars/new`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              + 웨비나 생성
            </Link>
            <Link 
              href={`/client/${clientId}/surveys/new`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:from-pink-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              + 설문조사 생성
            </Link>
            <Link 
              href={`/client/${clientId}/settings/branding`}
              className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium min-h-[44px] flex items-center justify-center"
            >
              🎨 브랜딩 설정
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">웨비나 수</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{webinars?.length || 0}</p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-20 flex-shrink-0 ml-2">🎥</div>
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-purple-500">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">설문조사 수</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{campaigns?.length || 0}</p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-20 flex-shrink-0 ml-2">📋</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white">웨비나 & 설문조사 목록</h2>
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
              <div className="text-center text-gray-500 py-8 sm:py-12">
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
}

