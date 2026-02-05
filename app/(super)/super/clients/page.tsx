import { requireSuperAdmin } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import ClientDeleteButton from './_components/ClientDeleteButton'

// 인텔리전트 → 인텔리전스로 변환하는 헬퍼 함수
function normalizeClientName(name: string): string {
  if (name.includes('인텔리전트')) {
    return name.replace(/인텔리전트/g, '인텔리전스')
  }
  return name
}

export default async function ClientsPage() {
  await requireSuperAdmin()
  // 슈퍼어드민은 Admin Supabase 사용 (RLS 우회, 성능 향상)
  const admin = createAdminSupabase()

  // 모든 클라이언트 조회 (에이전시 정보 포함)
  const { data: clients } = await admin
    .from('clients')
    .select(`
      *,
      agencies (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            클라이언트 관리
          </h1>
          <p className="text-gray-600">전체 클라이언트 목록 및 관리</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <h2 className="text-xl font-semibold text-white">클라이언트 목록</h2>
          </div>
          {clients && clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      에이전시
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
                  {clients.map((client: any) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{normalizeClientName(client.name)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.agencies?.name || '알 수 없음'}
                        </div>
                        {client.agencies?.id && (
                          <Link
                            href={`/super/agencies`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            에이전시 보기
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {client.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(client.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/client/${client.id}/dashboard`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            대시보드 →
                          </Link>
                          <ClientDeleteButton
                            clientId={client.id}
                            clientName={normalizeClientName(client.name)}
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
              <p className="text-lg">클라이언트가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

