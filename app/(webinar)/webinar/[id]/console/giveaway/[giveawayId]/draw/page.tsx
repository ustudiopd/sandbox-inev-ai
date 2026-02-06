'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase/client'

// CSS 애니메이션
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
@keyframes pulse-large {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
.animate-pulse-large {
  animation: pulse-large 1s ease-in-out infinite;
}
`

interface Giveaway {
  id: string
  name: string
  winners_count: number
  status: string
}

interface Winner {
  participant_id: string
  rank: number
  user?: {
    display_name?: string
    email?: string
  }
}

export default function GiveawayDrawPage() {
  const params = useParams()
  const webinarId = params.id as string
  const giveawayId = params.giveawayId as string
  
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadGiveaway = async () => {
      try {
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
      } catch (err: any) {
        setError(err.message || '추첨 정보를 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadGiveaway()
  }, [webinarId, giveawayId])

  const handleDraw = async () => {
    if (!giveaway) return
    
    if (giveaway.status === 'drawn') {
      // 이미 추첨 완료된 경우 결과만 표시
      loadWinners()
      return
    }

    if (!confirm('추첨을 실행하시겠습니까? 결과는 즉시 확정됩니다.')) return

    try {
      setDrawing(true)
      setError(null)

      // 카운트다운 시작
      setCountdown(3)
      
      for (let i = 3; i > 0; i--) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        setCountdown(i - 1)
      }

      // 추첨 API 호출
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${giveawayId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || '추첨 실행 실패')
      }

      setWinners(result.winners || [])
      setGiveaway({ ...giveaway, status: 'drawn' })
    } catch (err: any) {
      setError(err.message || '추첨 실행에 실패했습니다')
      setCountdown(null)
    } finally {
      setDrawing(false)
    }
  }

  const loadWinners = async () => {
    try {
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${giveawayId}/results`)
      const result = await response.json()

      if (response.ok && result.results?.winners) {
        setWinners(result.results.winners)
      }
    } catch (err) {
      console.error('당첨자 로드 실패:', err)
    }
  }

  useEffect(() => {
    if (giveaway?.status === 'drawn') {
      loadWinners()
    }
  }, [giveaway])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">추첨 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (error && !giveaway) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">{error}</div>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fadeInUpStyle }} />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🎁 {giveaway?.name}
          </h1>
          <p className="text-xl text-purple-200">
            당첨자: {giveaway?.winners_count}명
          </p>
        </div>

        {/* 카운트다운 */}
        {countdown !== null && countdown > 0 && (
          <div className="text-center mb-8">
            <div className="text-9xl md:text-[12rem] font-bold text-white animate-pulse-large">
              {countdown}
            </div>
            <p className="text-2xl text-purple-200 mt-4">추첨 중...</p>
          </div>
        )}
        
        {/* 추첨 진행 중 (카운트다운 0일 때) */}
        {countdown === 0 && drawing && (
          <div className="text-center mb-8">
            <div className="text-6xl md:text-8xl font-bold text-white animate-pulse">
              🎲
            </div>
            <p className="text-2xl text-purple-200 mt-4">추첨 진행 중...</p>
          </div>
        )}

        {/* 추첨 버튼 */}
        {!drawing && countdown === null && giveaway?.status !== 'drawn' && (
          <div className="text-center mb-8">
            <button
              onClick={handleDraw}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-xl font-semibold rounded-lg shadow-lg transition-colors"
            >
              추첨 시작
            </button>
          </div>
        )}

        {/* 당첨 결과 */}
        {winners.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl p-8 animate-fade-in-up" style={{ animation: 'fade-in-up 0.5s ease-out forwards' }}>
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-900">
              🎉 추첨 완료! 🎉
            </h2>
            <div className="space-y-4">
              {winners
                .sort((a, b) => a.rank - b.rank)
                .map((winner) => (
                  <div
                    key={winner.participant_id}
                    className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-purple-600">
                          {winner.rank}등
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-900">
                            {winner.user?.email || winner.participant_id.substring(0, 8) + '...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
