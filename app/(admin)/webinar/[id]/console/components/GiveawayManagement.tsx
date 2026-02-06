'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'

// CSS 애니메이션 (인라인 스타일로 추가)
const fadeInUpStyle = `
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out forwards;
  opacity: 0;
}
`

// 추첨 생성 모달 컴포넌트
function CreateGiveawayModal({
  webinarId,
  onClose,
  onSuccess,
}: {
  webinarId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [winnersCount, setWinnersCount] = useState(1)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('추첨 이름을 입력해주세요')
      return
    }

    if (winnersCount < 1) {
      setError('당첨자 수는 1명 이상이어야 합니다')
      return
    }

    try {
      setCreating(true)
      setError(null)

      const response = await fetch(`/api/webinars/${webinarId}/giveaways/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          winnersCount,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || '추첨 생성 실패')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || '추첨 생성에 실패했습니다')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">새 추첨 만들기</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              추첨 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 이벤트 경품 추첨"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              당첨자 수 *
            </label>
            <input
              type="number"
              value={winnersCount}
              onChange={(e) => setWinnersCount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={creating}
            />
            <p className="mt-1 text-xs text-gray-500">
              추첨할 당첨자의 수를 입력하세요
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '생성 중...' : '생성하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface Giveaway {
  id: string
  name: string
  winners_count: number
  status: 'draft' | 'open' | 'closed' | 'drawn'
  seed_reveal?: string
  drawn_at?: string
  created_at: string
}

interface GiveawayWinner {
  participant_id: string
  rank: number
  proof: any
  user?: {
    display_name?: string
    email?: string
  }
}

interface Participant {
  participant_id: string
  name: string
  email: string | null
  created_at: string
}

// 참여자 목록 모달 컴포넌트
function ParticipantsModal({
  webinarId,
  giveawayId,
  giveawayName,
  onClose,
}: {
  webinarId: string
  giveawayId: string
  giveawayName: string
  onClose: () => void
}) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabase()
  
  useEffect(() => {
    loadParticipants()
    
    // 실시간 구독
    const channel = supabase
      .channel(`giveaway-${giveawayId}-participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giveaway_entries',
          filter: `giveaway_id=eq.${giveawayId}`,
        },
        () => {
          loadParticipants()
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [giveawayId])
  
  const loadParticipants = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${giveawayId}/participants`)
      
      if (!response.ok) {
        throw new Error('참여자 목록 조회 실패')
      }
      
      const result = await response.json()
      setParticipants(result.participants || [])
    } catch (error: any) {
      console.error('참여자 목록 로드 실패:', error)
      setParticipants([])
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{giveawayName} - 참여자 목록</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-8">참여자 목록을 불러오는 중...</div>
          ) : participants.length === 0 ? (
            <div className="text-center text-gray-500 py-8">참여자가 없습니다</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">참여 시간</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant) => (
                    <tr key={participant.participant_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{participant.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(participant.created_at).toLocaleString('ko-KR')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

interface GiveawayManagementProps {
  webinarId: string
}

export default function GiveawayManagement({ webinarId }: GiveawayManagementProps) {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(false)
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({})
  const [winners, setWinners] = useState<Record<string, GiveawayWinner[]>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [showDrawAnimation, setShowDrawAnimation] = useState(false)
  const [drawingWinners, setDrawingWinners] = useState<GiveawayWinner[]>([])
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(null)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [selectedGiveawayForParticipants, setSelectedGiveawayForParticipants] = useState<Giveaway | null>(null)
  const supabase = createClientSupabase()
  
  useEffect(() => {
    loadGiveaways()
    
    // 실시간 구독
    const channel = supabase
      .channel(`webinar-${webinarId}-giveaways-management`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giveaways',
          filter: `webinar_id=eq.${webinarId}`,
        },
        () => {
          loadGiveaways()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giveaway_entries',
        },
        () => {
          loadEntryCounts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giveaway_winners',
        },
        () => {
          loadWinners()
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [webinarId])
  
  useEffect(() => {
    loadEntryCounts()
    loadWinners()
  }, [giveaways])
  
  const loadGiveaways = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/webinars/${webinarId}/giveaways`)
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '추첨 목록 로드 실패')
      }
      
      setGiveaways(result.giveaways || [])
    } catch (error) {
      console.error('추첨 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadEntryCounts = async () => {
    if (giveaways.length === 0) return
    
    const counts: Record<string, number> = {}
    for (const giveaway of giveaways) {
      try {
        const { count } = await supabase
          .from('giveaway_entries')
          .select('*', { count: 'exact', head: true })
          .eq('giveaway_id', giveaway.id)
          .eq('eligible', true)
        counts[giveaway.id] = count || 0
      } catch (error) {
        console.error(`참여자 수 조회 실패 (${giveaway.id}):`, error)
        counts[giveaway.id] = 0
      }
    }
    setEntryCounts(counts)
  }
  
  const loadWinners = async () => {
    const winnersMap: Record<string, GiveawayWinner[]> = {}
    for (const giveaway of giveaways) {
      if (giveaway.status === 'drawn') {
        try {
          const response = await fetch(`/api/webinars/${webinarId}/giveaways/${giveaway.id}/results`)
          const result = await response.json()
          
          if (response.ok && result.results?.winners) {
            winnersMap[giveaway.id] = result.results.winners
          }
        } catch (error) {
          console.error('당첨자 로드 실패:', error)
        }
      }
    }
    setWinners(winnersMap)
  }
  
  const handleStatusChange = async (giveawayId: string, newStatus: 'open' | 'closed') => {
    try {
      // 상태 변경은 추첨 생성/수정 API를 통해 처리 (간단히 open/closed만)
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${giveawayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '상태 변경 실패')
      }
      
      loadGiveaways()
    } catch (error: any) {
      console.error('상태 변경 실패:', error)
      alert(error.message || '상태 변경에 실패했습니다')
    }
  }
  
  const handleDraw = async () => {
    if (!selectedGiveaway) return
    
    if (!confirm('추첨을 실행하시겠습니까? 결과는 즉시 확정됩니다.')) return
    
    try {
      // 모달 닫고 애니메이션 시작
      setShowDrawModal(false)
      setShowDrawAnimation(true)
      
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${selectedGiveaway.id}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        setShowDrawAnimation(false)
        throw new Error(result.error || '추첨 실행 실패')
      }
      
      // 당첨자 정보 저장 및 애니메이션 표시
      setDrawingWinners(result.winners || [])
      
      // 3초 후 애니메이션 닫기
      setTimeout(() => {
        setShowDrawAnimation(false)
        setDrawingWinners([])
        setSelectedGiveaway(null)
        loadGiveaways()
        loadWinners()
      }, 3000)
    } catch (error: any) {
      console.error('추첨 실행 실패:', error)
      setShowDrawAnimation(false)
      alert(error.message || '추첨 실행에 실패했습니다')
    }
  }
  
  const handleDelete = async (giveawayId: string) => {
    if (!confirm('이 추첨을 삭제하시겠습니까?')) return
    
    try {
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${giveawayId}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '삭제 실패')
      }
      
      loadGiveaways()
    } catch (error: any) {
      console.error('삭제 실패:', error)
      alert(error.message || '삭제에 실패했습니다')
    }
  }
  
  return (
    <div>
      {/* 애니메이션 스타일 */}
      <style dangerouslySetInnerHTML={{ __html: fadeInUpStyle }} />
      
      {/* 액션 버튼 */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 새 추첨 만들기
        </button>
      </div>
      
      {/* 추첨 목록 */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {loading && giveaways.length === 0 ? (
          <div className="text-center text-gray-500 py-8">추첨을 불러오는 중...</div>
        ) : giveaways.length === 0 ? (
          <div className="text-center text-gray-500 py-8">추첨이 없습니다</div>
        ) : (
          giveaways.map((giveaway) => (
            <div
              key={giveaway.id}
              className={`p-4 rounded-lg border-2 transition-colors ${
                giveaway.status === 'open' 
                  ? 'border-green-200 bg-green-50' 
                  : giveaway.status === 'drawn'
                  ? 'border-purple-200 bg-purple-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg">{giveaway.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      giveaway.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : giveaway.status === 'drawn'
                        ? 'bg-purple-100 text-purple-800'
                        : giveaway.status === 'closed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {giveaway.status === 'open' ? '진행 중' : 
                       giveaway.status === 'drawn' ? '추첨 완료' :
                       giveaway.status === 'closed' ? '마감' : '초안'}
                    </span>
                    <span className="text-xs text-gray-600">
                      당첨자: {giveaway.winners_count}명
                    </span>
                    <span className="text-xs text-gray-600">
                      참여: {entryCounts[giveaway.id] ?? 0}명
                    </span>
                    {entryCounts[giveaway.id] > 0 && (
                      <button
                        onClick={() => {
                          setSelectedGiveawayForParticipants(giveaway)
                          setShowParticipantsModal(true)
                        }}
                        className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                      >
                        참여자 보기
                      </button>
                    )}
                  </div>
                  {giveaway.drawn_at && (
                    <div className="text-xs text-gray-500">
                      추첨 시간: {new Date(giveaway.drawn_at).toLocaleString('ko-KR')}
                    </div>
                  )}
                  {winners[giveaway.id] && winners[giveaway.id].length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <div className="text-xs font-semibold mb-1">당첨자:</div>
                      <div className="text-xs text-gray-600">
                        {winners[giveaway.id].map((w, idx) => (
                          <span key={idx} className="mr-2">
                            {w.rank}등: {w.user?.email || w.participant_id.substring(0, 8) + '...'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-wrap">
                  {/* 새창 열기 버튼 - 모든 상태에서 표시 */}
                  <button
                    onClick={() => {
                      const url = `/webinar/${webinarId}/console/giveaway/${giveaway.id}/draw`
                      window.open(url, '_blank', 'width=1200,height=800')
                    }}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                  >
                    {giveaway.status === 'drawn' ? '결과 보기' : '새창에서 추첨'}
                  </button>
                  
                  {giveaway.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(giveaway.id, 'open')}
                      className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                    >
                      오픈
                    </button>
                  )}
                  {giveaway.status === 'open' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(giveaway.id, 'closed')}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                      >
                        마감
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGiveaway(giveaway)
                          setShowDrawModal(true)
                        }}
                        className="text-xs px-3 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
                      >
                        추첨 실행
                      </button>
                    </>
                  )}
                  {giveaway.status === 'closed' && (
                    <button
                      onClick={() => {
                        setSelectedGiveaway(giveaway)
                        setShowDrawModal(true)
                      }}
                      className="text-xs px-3 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
                    >
                      추첨 실행
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(giveaway.id)}
                    className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 생성 모달 */}
      {showCreateModal && (
        <CreateGiveawayModal
          webinarId={webinarId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadGiveaways()
          }}
        />
      )}
      
      {/* 추첨 실행 모달 */}
      {showDrawModal && selectedGiveaway && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">추첨 실행</h3>
            <p className="text-sm text-gray-600 mb-4">
              추첨을 실행하시겠습니까? 결과는 즉시 확정됩니다.
            </p>
            {entryCounts[selectedGiveaway.id] !== undefined && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  참여자 수: <strong>{entryCounts[selectedGiveaway.id]}명</strong>
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  당첨자 수: <strong>{selectedGiveaway.winners_count}명</strong>
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDrawModal(false)
                  setSelectedGiveaway(null)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDraw}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                추첨 실행
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 추첨 애니메이션 모달 */}
      {showDrawAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 max-w-2xl w-full mx-4 text-white relative overflow-hidden">
            {/* 배경 애니메이션 */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-300 opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
            
            <div className="relative z-10 text-center">
              {drawingWinners.length === 0 ? (
                <>
                  <div className="mb-6">
                    <div className="inline-block animate-spin text-6xl mb-4">🎰</div>
                    <h2 className="text-3xl font-bold mb-2">추첨 중...</h2>
                    <p className="text-purple-200">당첨자를 선정하고 있습니다</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6 animate-bounce">
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-4xl font-bold mb-2">추첨 완료!</h2>
                  </div>
                  
                  <div className="space-y-4 mt-8">
                    <h3 className="text-2xl font-semibold mb-4">당첨자</h3>
                    {drawingWinners
                      .sort((a, b) => a.rank - b.rank)
                      .map((winner, idx) => (
                        <div
                          key={winner.participant_id}
                          className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 animate-fade-in-up"
                          style={{ animationDelay: `${idx * 0.2}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-3xl font-bold text-yellow-300">
                                {winner.rank}등
                              </div>
                              <div className="text-left">
                                <div className="text-xl font-semibold">
                                  {winner.user?.email || winner.participant_id.substring(0, 8) + '...'}
                                </div>
                              </div>
                            </div>
                            <div className="text-4xl">🏆</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
