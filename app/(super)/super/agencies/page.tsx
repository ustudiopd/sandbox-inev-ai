import { requireSuperAdmin } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import AgencyCreateModal from './_components/AgencyCreateModal'
import AgencyDeleteButton from './_components/AgencyDeleteButton'

export const dynamic = 'force-dynamic'

export default async function AgenciesPage() {
  await requireSuperAdmin()
  // 슈퍼어드민은 Admin Supabase 사용 (RLS 우회, 성능 향상)
  const admin = createAdminSupabase()

  // 에이전시 목록 조회 (클라이언트 수 포함)
  const { data: agencies } = await admin
    .from('agencies')
    .select(`
      *,
      clients (id)
    `)
    .order('created_at', { ascending: false })

  // 각 에이전시의 클라이언트 수 계산
  const agenciesWithCount = agencies?.map((agency: any) => ({
    ...agency,
    clientCount: agency.clients?.length || 0,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              에이전시 관리
            </h1>
            <p className="text-gray-600">에이전시 목록 및 관리</p>
          </div>
          <AgencyCreateModal />
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <h2 className="text-xl font-semibold text-white">에이전시 목록</h2>
          </div>
          {agenciesWithCount && agenciesWithCount.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      클라이언트 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agenciesWithCount.map((agency: any) => (
                    <tr key={agency.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{agency.clientCount}개</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {agency.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(agency.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/agency/${agency.id}/dashboard`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            대시보드 →
                          </Link>
                          <AgencyDeleteButton
                            agencyId={agency.id}
                            agencyName={agency.name}
                            clientCount={agency.clientCount}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg">에이전시가 없습니다.</p>
              <p className="text-sm mt-2">새 에이전시를 생성해주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

