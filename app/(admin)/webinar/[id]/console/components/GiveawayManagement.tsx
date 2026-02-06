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
  const [description, setDescription] = useState('')
  const [winnersCount, setWinnersCount] = useState(1)
  const [drawType, setDrawType] = useState<'random' | 'manual'>('random')
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
          description: description.trim() || undefined,
          winnersCount,
          drawType,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
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
              설명문구
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추첨에 대한 설명을 입력하세요 (선택사항)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              추첨 방식 *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="drawType"
                  value="random"
                  checked={drawType === 'random'}
                  onChange={(e) => setDrawType(e.target.value as 'random' | 'manual')}
                  className="w-4 h-4 text-blue-600"
                  disabled={creating}
                />
                <span className="text-sm">추첨 방식 (랜덤)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="drawType"
                  value="manual"
                  checked={drawType === 'manual'}
                  onChange={(e) => setDrawType(e.target.value as 'random' | 'manual')}
                  className="w-4 h-4 text-blue-600"
                  disabled={creating}
                />
                <span className="text-sm">사용자 지정 방식</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {drawType === 'random' 
                ? '전체 참여자 중에서 랜덤으로 당첨자를 선정합니다'
                : '전체 참여자 중에서 직접 당첨자를 선택합니다'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              당첨자 수 *
            </label>
            <input
              type="number"
              value={winnersCount}
              onChange={(e) => {
                const count = Math.max(1, parseInt(e.target.value) || 1)
                setWinnersCount(count)
              }}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={creating}
            />
            <p className="mt-1 text-xs text-gray-500">
              {drawType === 'random' 
                ? '추첨할 당첨자의 수를 입력하세요. 추첨 실행 시 참여자 목록에서 제외할 사람을 선택할 수 있습니다.'
                : '당첨자 수를 입력하세요. 추첨 실행 시 참여자 목록에서 직접 당첨자를 선택할 수 있습니다.'}
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
  draw_type?: 'random' | 'manual'
  manual_winners?: string[] | null
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
  eligible: boolean
}

// 추첨 실행 모달 컴포넌트
function DrawModal({
  webinarId,
  giveaway,
  entryCounts,
  eligibleCounts,
  excludedCounts,
  onClose,
  onDraw,
}: {
  webinarId: string
  giveaway: Giveaway
  entryCounts: Record<string, number>
  eligibleCounts: Record<string, number>
  excludedCounts: Record<string, number>
  onClose: () => void
  onDraw: (manualWinners?: string[]) => void
}) {
  const [participants, setParticipants] = useState<Array<{ participant_id: string; name: string; email: string | null; eligible: boolean }>>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Array<{ participant_id: string; name: string; email: string | null; eligible: boolean }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedWinners, setSelectedWinners] = useState<string[]>([])
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const supabase = createClientSupabase()
  const isManual = giveaway.draw_type === 'manual'

  useEffect(() => {
    loadParticipants()
  }, [giveaway.id])

  useEffect(() => {
    // 검색 필터링
    if (!searchQuery.trim()) {
      setFilteredParticipants(participants)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredParticipants(
        participants.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.email && p.email.toLowerCase().includes(query))
        )
      )
    }
  }, [searchQuery, participants])

  const loadParticipants = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${giveaway.id}/participants`)
      const result = await response.json()

      if (response.ok && result.participants) {
        setParticipants(result.participants)
        setFilteredParticipants(result.participants)
        
        // 사용자 지정 방식일 때, 참여 상태인 사람들을 자동으로 선택
        if (isManual) {
          const eligibleParticipants = result.participants
            .filter((p: any) => p.eligible === true)
            .map((p: any) => p.participant_id)
            .slice(0, giveaway.winners_count) // 당첨자 수만큼만 선택
          setSelectedWinners(eligibleParticipants)
        }
      }
    } catch (error) {
      console.error('참여자 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEligible = async (participantId: string, currentEligible: boolean) => {
    if (isManual) {
      // 사용자 지정 방식: 당첨자 선택
      setSelectedWinners((prev) => {
        if (prev.includes(participantId)) {
          return prev.filter((id) => id !== participantId)
        } else {
          if (prev.length >= giveaway.winners_count) {
            alert(`당첨자 수는 최대 ${giveaway.winners_count}명입니다. 현재 ${prev.length}명이 선택되어 있습니다. 체크를 해제한 후 다시 선택해주세요.`)
            return prev
          }
          return [...prev, participantId]
        }
      })
    } else {
      // 랜덤 방식: 제외 체크박스
      setUpdating((prev) => ({ ...prev, [participantId]: true }))
      try {
        const response = await fetch(
          `/api/webinars/${webinarId}/giveaways/${giveaway.id}/participants/${participantId}/eligible`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eligible: !currentEligible }),
          }
        )

        const result = await response.json()
        if (!response.ok || result.error) {
          throw new Error(result.error || '상태 업데이트 실패')
        }

        // 로컬 상태 업데이트
        setParticipants((prev) =>
          prev.map((p) =>
            p.participant_id === participantId ? { ...p, eligible: !currentEligible } : p
          )
        )
      } catch (error: any) {
        console.error('상태 업데이트 실패:', error)
        alert('상태 업데이트에 실패했습니다: ' + error.message)
      } finally {
        setUpdating((prev) => {
          const next = { ...prev }
          delete next[participantId]
          return next
        })
      }
    }
  }

  const handleDrawClick = () => {
    if (isManual) {
      if (selectedWinners.length === 0) {
        alert('최소 1명 이상 선택해주세요')
        return
      }
      if (selectedWinners.length !== giveaway.winners_count) {
        const diff = giveaway.winners_count - selectedWinners.length
        const message = diff > 0 
          ? `선택한 인원(${selectedWinners.length}명)이 당첨자 수(${giveaway.winners_count}명)보다 ${diff}명 적습니다. 그래도 추첨을 진행하시겠습니까?`
          : `선택한 인원(${selectedWinners.length}명)이 당첨자 수(${giveaway.winners_count}명)보다 ${Math.abs(diff)}명 많습니다. 그래도 추첨을 진행하시겠습니까?`
        if (!confirm(message)) return
      }
      onDraw(selectedWinners)
    } else {
      if (!confirm('추첨을 실행하시겠습니까? 결과는 즉시 확정됩니다.')) return
      onDraw()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            추첨 실행 - {giveaway.name}
            {isManual ? ' (사용자 지정 방식)' : ' (랜덤 추첨)'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {entryCounts[giveaway.id] !== undefined && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              총 <strong>{entryCounts[giveaway.id]}명</strong> 중 <strong>{eligibleCounts[giveaway.id] ?? 0}명</strong> 추첨 참여
              {excludedCounts[giveaway.id] > 0 && (
                <span className="text-red-600"> (제외 {excludedCounts[giveaway.id]}명)</span>
              )}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              당첨자 수: <strong>{giveaway.winners_count}명</strong>
              {isManual && (
                <span className={`ml-2 ${selectedWinners.length !== giveaway.winners_count ? 'text-red-600 font-semibold' : ''}`}>
                  (현재 {selectedWinners.length}명 선택됨)
                  {selectedWinners.length > giveaway.winners_count && (
                    <span className="block text-xs mt-1">
                      ⚠️ 선택 인원이 당첨자 수보다 {selectedWinners.length - giveaway.winners_count}명 많습니다. 체크를 해제해주세요.
                    </span>
                  )}
                  {selectedWinners.length < giveaway.winners_count && (
                    <span className="block text-xs mt-1 text-orange-600">
                      ⚠️ 선택 인원이 당첨자 수보다 {giveaway.winners_count - selectedWinners.length}명 적습니다.
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
        )}

        {/* 검색 입력 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
          {loading ? (
            <div className="text-center text-gray-500 py-8">참여자 목록을 불러오는 중...</div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery ? '검색 결과가 없습니다' : '참여자가 없습니다'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredParticipants.map((participant) => {
                const isSelected = isManual ? selectedWinners.includes(participant.participant_id) : participant.eligible
                return (
                  <label
                    key={participant.participant_id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                      isSelected ? (isManual ? 'bg-blue-50' : '') : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleEligible(participant.participant_id, participant.eligible)}
                      disabled={updating[participant.participant_id] || (isManual && !isSelected && selectedWinners.length >= giveaway.winners_count)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                      {participant.email && (
                        <div className="text-xs text-gray-500">{participant.email}</div>
                      )}
                    </div>
                    {!isManual && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          participant.eligible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {participant.eligible ? '추첨 참여' : '추첨 제외'}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleDrawClick}
            disabled={isManual && selectedWinners.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isManual ? '추첨 시작' : '추첨 실행'}
          </button>
        </div>
      </div>
    </div>
  )
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
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
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
  
  useEffect(() => {
    // 검색 필터링
    if (!searchQuery.trim()) {
      setFilteredParticipants(participants)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredParticipants(
        participants.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.email && p.email.toLowerCase().includes(query))
        )
      )
    }
  }, [participants, searchQuery])
  
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
  
  const handleToggleEligible = async (participantId: string, currentEligible: boolean) => {
    try {
      setUpdating((prev) => ({ ...prev, [participantId]: true }))
      
      const response = await fetch(
        `/api/webinars/${webinarId}/giveaways/${giveawayId}/participants/${participantId}/eligible`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eligible: !currentEligible }),
        }
      )
      
      if (!response.ok) {
        throw new Error('상태 업데이트 실패')
      }
      
      // 로컬 상태 업데이트
      setParticipants((prev) =>
        prev.map((p) =>
          p.participant_id === participantId
            ? { ...p, eligible: !currentEligible }
            : p
        )
      )
    } catch (error: any) {
      console.error('상태 업데이트 실패:', error)
      alert('상태 업데이트에 실패했습니다: ' + error.message)
    } finally {
      setUpdating((prev) => {
        const next = { ...prev }
        delete next[participantId]
        return next
      })
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
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
        
        {/* 검색 입력 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-8">참여자 목록을 불러오는 중...</div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery ? '검색 결과가 없습니다' : '참여자가 없습니다'}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={filteredParticipants.every((p) => p.eligible)}
                        onChange={(e) => {
                          // 전체 선택/해제
                          filteredParticipants.forEach((p) => {
                            if (p.eligible !== e.target.checked) {
                              handleToggleEligible(p.participant_id, p.eligible)
                            }
                          })
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">참여 시간</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredParticipants.map((participant) => (
                    <tr
                      key={participant.participant_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={participant.eligible}
                          onChange={() => handleToggleEligible(participant.participant_id, participant.eligible)}
                          disabled={updating[participant.participant_id]}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                      </td>
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            participant.eligible
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {participant.eligible ? '추첨 참여' : '추첨 제외'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            총 {participants.length}명 중 {participants.filter((p) => p.eligible).length}명 추첨 참여
          </div>
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
  const [eligibleCounts, setEligibleCounts] = useState<Record<string, number>>({})
  const [excludedCounts, setExcludedCounts] = useState<Record<string, number>>({})
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
      
      const giveawaysList = result.giveaways || []
      setGiveaways(giveawaysList)
      
      // giveaways가 설정된 후 즉시 참여자 수 로드
      if (giveawaysList.length > 0) {
        await loadEntryCountsForGiveaways(giveawaysList)
      }
    } catch (error) {
      console.error('추첨 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadEntryCountsForGiveaways = async (giveawaysList: Giveaway[]) => {
    const totalCounts: Record<string, number> = {}
    const eligibleCountsMap: Record<string, number> = {}
    const excludedCountsMap: Record<string, number> = {}
    
    for (const giveaway of giveawaysList) {
      try {
        // 총 참여자 수
        const { count: totalCount } = await supabase
          .from('giveaway_entries')
          .select('*', { count: 'exact', head: true })
          .eq('giveaway_id', giveaway.id)
        
        // 추첨 참여자 수 (eligible = true)
        const { count: eligibleCount } = await supabase
          .from('giveaway_entries')
          .select('*', { count: 'exact', head: true })
          .eq('giveaway_id', giveaway.id)
          .eq('eligible', true)
        
        // 추첨 제외자 수 (eligible = false)
        const { count: excludedCount } = await supabase
          .from('giveaway_entries')
          .select('*', { count: 'exact', head: true })
          .eq('giveaway_id', giveaway.id)
          .eq('eligible', false)
        
        totalCounts[giveaway.id] = totalCount || 0
        eligibleCountsMap[giveaway.id] = eligibleCount || 0
        excludedCountsMap[giveaway.id] = excludedCount || 0
      } catch (error) {
        console.error(`참여자 수 조회 실패 (${giveaway.id}):`, error)
        totalCounts[giveaway.id] = 0
        eligibleCountsMap[giveaway.id] = 0
        excludedCountsMap[giveaway.id] = 0
      }
    }
    setEntryCounts(totalCounts)
    setEligibleCounts(eligibleCountsMap)
    setExcludedCounts(excludedCountsMap)
  }
  
  const loadEntryCounts = async () => {
    if (giveaways.length === 0) return
    await loadEntryCountsForGiveaways(giveaways)
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
  
  const handleDraw = async (manualWinners?: string[]) => {
    if (!selectedGiveaway) return
    
    try {
      // 모달 닫고 애니메이션 시작
      setShowDrawModal(false)
      setShowDrawAnimation(true)
      
      const response = await fetch(`/api/webinars/${webinarId}/giveaways/${selectedGiveaway.id}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualWinners: selectedGiveaway.draw_type === 'manual' ? manualWinners : undefined,
        }),
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
                      {giveaway.draw_type === 'manual' 
                        ? `당첨자 ${giveaway.winners_count}명 추첨 예정`
                        : `당첨자: ${giveaway.winners_count}명`}
                    </span>
                    {giveaway.draw_type !== 'manual' && (
                      <span className="text-xs text-gray-600">
                        참여 {eligibleCounts[giveaway.id] ?? 0}명
                        {excludedCounts[giveaway.id] > 0 && (
                          <span className="text-red-600"> (제외 {excludedCounts[giveaway.id]}명)</span>
                        )}
                      </span>
                    )}
                    {(entryCounts[giveaway.id] > 0 || giveaway.draw_type === 'manual') && (
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
        <DrawModal
          webinarId={webinarId}
          giveaway={selectedGiveaway}
          entryCounts={entryCounts}
          eligibleCounts={eligibleCounts}
          excludedCounts={excludedCounts}
          onClose={() => {
            setShowDrawModal(false)
            setSelectedGiveaway(null)
          }}
          onDraw={handleDraw}
        />
      )}
      
      {/* 참여자 보기 모달 */}
      {showParticipantsModal && selectedGiveawayForParticipants && (
        <ParticipantsModal
          webinarId={webinarId}
          giveawayId={selectedGiveawayForParticipants.id}
          giveawayName={selectedGiveawayForParticipants.name}
          onClose={() => {
            setShowParticipantsModal(false)
            setSelectedGiveawayForParticipants(null)
          }}
        />
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
