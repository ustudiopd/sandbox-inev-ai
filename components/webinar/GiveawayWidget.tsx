'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'

interface Giveaway {
  id: string
  webinar_id: string
  name: string  // title 대신 name 사용
  status: 'draft' | 'open' | 'closed' | 'drawn'
  winners_count: number  // winner_count 대신 winners_count 사용
  seed_commit?: string
  seed_reveal?: string
  drawn_at?: string
}

interface GiveawayEntry {
  id: string
  giveaway_id: string
  participant_id: string
  weight: number
  eligible: boolean
  created_at: string
}

interface GiveawayWinner {
  id: string
  giveaway_id: string
  participant_id: string
  rank: number
  user?: {
    display_name?: string
    email?: string
  }
}

interface GiveawayWidgetProps {
  webinarId: string
  giveawayId: string
  className?: string
}

// 당첨 여부 확인 컴포넌트
function WinnerCheck({ winners, supabase }: { winners: GiveawayWinner[], supabase: any }) {
  const [isWinner, setIsWinner] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkWinner = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const winner = winners.find((w) => w.participant_id === user.id)
        setIsWinner(!!winner)
      }
      setChecking(false)
    }
    checkWinner()
  }, [winners, supabase])

  if (checking) return null

  return (
    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
      <p className="text-sm text-gray-700">
        {isWinner ? (
          <span className="font-medium text-green-600">🎉 축하합니다! 당첨되셨습니다!</span>
        ) : (
          '참여해주셔서 감사합니다'
        )}
      </p>
    </div>
  )
}

/**
 * 추첨 참여 위젯 컴포넌트
 * 참여자가 추첨에 참여하고 결과를 확인할 수 있는 UI 제공
 */
export default function GiveawayWidget({
  webinarId,
  giveawayId,
  className = '',
}: GiveawayWidgetProps) {
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [loading, setLoading] = useState(true)
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entered, setEntered] = useState(false)
  const [entryCount, setEntryCount] = useState(0)
  const [winners, setWinners] = useState<GiveawayWinner[]>([])
  const supabase = createClientSupabase()

  // 추첨 정보 로드
  useEffect(() => {
    const loadGiveaway = async () => {
      try {
        setLoading(true)
        
        // 추첨 정보 조회
        const response = await fetch(`/api/webinars/${webinarId}/giveaways`)
        const result = await response.json()

        if (!response.ok || result.error) {
          throw new Error(result.error || '추첨 정보를 불러올 수 없습니다')
        }

        const found = result.giveaways?.find((g: Giveaway) => g.id === giveawayId)
        if (!found) {
          throw new Error('추첨을 찾을 수 없습니다')
        }

        setGiveaway(found)

        // 참여 여부 확인 및 자동 참가
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // 참여 여부 확인
          const { data: entry } = await supabase
            .from('giveaway_entries')
            .select('id')
            .eq('giveaway_id', giveawayId)
            .eq('participant_id', user.id)
            .maybeSingle()
          
          // 이미 참가한 경우
          if (entry) {
            setEntered(true)
          } else if (found.status === 'open') {
            // 오픈된 추첨이고 아직 참가하지 않은 경우 자동 참가 시도
            try {
              const enterResponse = await fetch(
                `/api/webinars/${webinarId}/giveaways/${giveawayId}/enter`,
                {
                  method: 'POST',
                  credentials: 'include',
                }
              )
              
              if (enterResponse.ok) {
                setEntered(true)
                setEntryCount((prev) => prev + 1)
              } else if (enterResponse.status === 409) {
                // 이미 참가한 경우 (동시성 문제)
                setEntered(true)
              }
            } catch (error) {
              console.warn('[GiveawayWidget] 자동 참가 실패:', error)
              // 자동 참가 실패해도 계속 진행
            }
          }
        }

        // 참여자 수 조회
        const { count } = await supabase
          .from('giveaway_entries')
          .select('*', { count: 'exact', head: true })
          .eq('giveaway_id', giveawayId)
          .eq('eligible', true)
        
        setEntryCount(count || 0)

        // 당첨자 조회 (추첨 완료된 경우)
        if (found.status === 'drawn') {
          const resultsResponse = await fetch(
            `/api/webinars/${webinarId}/giveaways/${giveawayId}/results`
          )
          const resultsResult = await resultsResponse.json()
          
          if (resultsResponse.ok && resultsResult.results?.winners) {
            setWinners(resultsResult.results.winners)
          }
        }
      } catch (err: any) {
        setError(err.message || '추첨 정보를 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadGiveaway()

    // 실시간 업데이트 구독
    const channel = supabase
      .channel(`webinar:${webinarId}:giveaways`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giveaways',
          filter: `id=eq.${giveawayId}`,
        },
        () => {
          loadGiveaway()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'giveaway_entries',
          filter: `giveaway_id=eq.${giveawayId}`,
        },
        async () => {
          // 참여자 수 업데이트
          const { count } = await supabase
            .from('giveaway_entries')
            .select('*', { count: 'exact', head: true })
            .eq('giveaway_id', giveawayId)
            .eq('eligible', true)
          
          setEntryCount(count || 0)
          
          // 현재 사용자의 참여 여부도 확인
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: entry } = await supabase
              .from('giveaway_entries')
              .select('id')
              .eq('giveaway_id', giveawayId)
              .eq('participant_id', user.id)
              .maybeSingle()
            
            if (entry) {
              setEntered(true)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [webinarId, giveawayId, supabase])

  const handleEnter = async () => {
    if (!giveaway) return

    try {
      setEntering(true)
      setError(null)

      const response = await fetch(
        `/api/webinars/${webinarId}/giveaways/${giveawayId}/enter`,
        {
          method: 'POST',
        }
      )

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || '참여에 실패했습니다')
      }

      setEntered(true)
      setEntryCount((prev) => prev + 1)
    } catch (err: any) {
      setError(err.message || '참여 중 오류가 발생했습니다')
    } finally {
      setEntering(false)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">추첨 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error && !giveaway) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!giveaway) {
    return null
  }

  if (giveaway.status === 'draft') {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-gray-600">아직 시작되지 않은 추첨입니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 sm:p-6 ${className}`}>
      {/* 헤더 */}
      <div className="mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
          🎁 {giveaway.name}
        </h3>
      </div>

      {/* 상태별 UI */}
      {giveaway.status === 'open' && (
        <>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">참여자 수</span>
              <span className="text-lg font-semibold text-blue-600">{entryCount}명</span>
            </div>
            {giveaway.winners_count > 0 && (
              <p className="text-xs text-gray-600">
                당첨자 {giveaway.winners_count}명 추첨 예정
              </p>
            )}
          </div>

          {entered ? (
            <div className="text-center py-6">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <p className="text-lg font-medium text-gray-900 mb-2">참여 완료</p>
              <p className="text-sm text-gray-600">
                추첨 결과는 추첨 완료 후 공개됩니다
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <button
                onClick={handleEnter}
                disabled={entering}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {entering ? '참여 중...' : '추첨 참여하기'}
              </button>
            </>
          )}
        </>
      )}

      {giveaway.status === 'closed' && (
        <div className="text-center py-6">
          <p className="text-gray-600">마감된 추첨입니다</p>
          {entered && (
            <p className="text-sm text-gray-500 mt-2">참여해주셔서 감사합니다</p>
          )}
        </div>
      )}

      {giveaway.status === 'drawn' && (
        <>
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">참여자 수</span>
              <span className="text-lg font-semibold text-green-600">{entryCount}명</span>
            </div>
            {giveaway.drawn_at && (
              <p className="text-xs text-gray-600">
                추첨 완료: {new Date(giveaway.drawn_at).toLocaleString('ko-KR')}
              </p>
            )}
          </div>

          {winners.length > 0 ? (
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-4">
                🎉 당첨자 발표
              </h4>
              <div className="space-y-2">
                {winners.map((winner, index) => (
                  <div
                    key={winner.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-yellow-600">
                        {winner.rank}등
                      </span>
                      <span className="text-sm text-gray-900">
                        {winner.user?.display_name || winner.user?.email || '익명'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600">당첨자 정보를 불러올 수 없습니다</p>
            </div>
          )}

          {entered && <WinnerCheck winners={winners} supabase={supabase} />}
        </>
      )}
    </div>
  )
}

