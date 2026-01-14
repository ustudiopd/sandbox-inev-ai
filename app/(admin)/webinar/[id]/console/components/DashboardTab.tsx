'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DashboardTabProps {
  webinarId: string
  webinarSlug: string
}

interface StatsData {
  chat?: {
    totalMessages: number
    uniqueSenders: number
    participationRate: number
    timeline: Array<{ time_slot: string; message_count: number; sender_count: number }>
    topSenders: Array<{ user_id: string; nickname: string; message_count: number }>
    peakTime: { time: string; messageCount: number } | null
  }
  qa?: {
    totalQuestions: number
    answeredQuestions: number
    uniqueQuestioners: number
    answerTime: { avgMinutes: number; minMinutes: number; maxMinutes: number }
    timeline: Array<{ time_slot: string; question_count: number; answered_count: number }>
    topQuestioners: Array<{ user_id: string; nickname: string; question_count: number }>
  }
  forms?: {
    totalSurveys: number
    totalQuizzes: number
    survey: { totalSubmissions: number; uniqueRespondents: number }
    quiz: { totalAttempts: number; uniqueParticipants: number; avgScore: number; maxScore: number; minScore: number }
  }
  giveaways?: {
    totalGiveaways: number
    drawnGiveaways: number
    totalEntries: number
    uniqueParticipants: number
    timeline: Array<{ time_slot: string; entry_count: number; participant_count: number }>
  }
  files?: {
    totalFiles: number
    totalDownloads: number
    uniqueDownloaders: number
    fileDownloads: Array<{ file_id: number; file_name: string; file_size: number; download_count: number }>
  }
  registrants?: {
    totalRegistrants: number
    registrationSources: Array<{ source: string; count: number }>
    maxConcurrentParticipants: number
  }
  access?: {
    currentParticipants?: number // 실시간 현재 접속자 수
    currentParticipantList?: Array<{
      userId: string
      displayName: string
      email: string | null
      role: string | null
      lastSeenAt: string
      joinedAt: string
    }> // 현재 접속 중인 참여자 목록
    totalAttendees?: number // 입장한 사람 수 (joined_at이 있는 고유 user_id 수)
    maxConcurrentParticipants: number
    avgConcurrentParticipants: number
    timeline: Array<{
      time: string
      avgParticipants: number
      maxParticipants: number
      minParticipants: number
      lastParticipants: number
    }>
    peakTime: { time: string; participantCount: number } | null
  }
}

interface PresenceUser {
  id: string
  display_name?: string
  email?: string
}

export default function DashboardTab({ webinarId, webinarSlug }: DashboardTabProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [realtimeParticipants, setRealtimeParticipants] = useState<Array<{
    userId: string
    displayName: string
    email: string | null
    role: string | null
    lastSeenAt: string
    joinedAt: string
  }>>([])
  const supabase = createClientSupabase()
  const channelRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStats = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('interval', '5m')

      const response = await fetch(`/api/webinars/${webinarSlug}/stats?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        console.log('[DashboardTab] 통계 데이터:', result.data)
        console.log('[DashboardTab] 현재 접속자:', result.data?.access?.currentParticipants)
        console.log('[DashboardTab] 현재 접속자 목록:', result.data?.access?.currentParticipantList)
        setStats(result.data)
        // 초기 접속자 목록은 실시간 presence에서 가져오므로 여기서는 설정하지 않음
      } else {
        setError(result.error || '통계 조회 실패')
      }
    } catch (err: any) {
      setError(err.message || '통계 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [webinarSlug])

    // 실시간 접속자 구독 (PresenceBar 로직 적용)
  useEffect(() => {
    const channelName = `presence:webinar-${webinarId}`
    console.log('[DashboardTab] Presence 채널 생성:', channelName)
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: 'user',
        },
      },
    })

    channelRef.current = channel

    // 현재 사용자 정보 (나중에 track에서 사용)
    let currentUserInfo: { id: string; display_name?: string; email?: string } | null = null

    // Presence 상태 업데이트 함수
    const updateParticipants = async () => {
      const state = channel.presenceState()
      const usersMap = new Map<string, PresenceUser>()

      console.log('[DashboardTab] Presence state:', JSON.stringify(state, null, 2))
      console.log('[DashboardTab] Presence state keys:', Object.keys(state))

      Object.keys(state).forEach((key) => {
        const presences = state[key]
        console.log(`[DashboardTab] Key "${key}":`, presences)
        
        if (Array.isArray(presences)) {
          console.log(`[DashboardTab] Key "${key}" is array, length:`, presences.length)
          presences.forEach((presence: any, index: number) => {
            console.log(`[DashboardTab] Presence[${index}]:`, presence)
            if (presence && presence.user && presence.user.id) {
              usersMap.set(presence.user.id, presence.user)
            }
          })
        } else if (presences && typeof presences === 'object') {
          console.log(`[DashboardTab] Key "${key}" is object:`, presences)
          const presence = presences as any
          if (presence.user && presence.user.id) {
            usersMap.set(presence.user.id, presence.user)
          }
        }
      })

      const uniqueUsers = Array.from(usersMap.values())
      const userIds = uniqueUsers.map(u => u.id)

      console.log('[DashboardTab] Unique users:', uniqueUsers.length, userIds)
      console.log('[DashboardTab] Unique users details:', uniqueUsers.map(u => ({ id: u.id, display_name: u.display_name, email: u.email })))

      // 채팅에 참여한 사용자들도 추가 (최근 5분 이내 메시지 발신자)
      try {
        const recentMessagesResponse = await fetch(`/api/webinars/${webinarId}/messages?limit=100`)
        if (recentMessagesResponse.ok) {
          const messagesResult = await recentMessagesResponse.json()
          const messages = messagesResult.messages || []
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          
          // 최근 5분 이내 메시지를 보낸 사용자들
          const recentSenders = new Set<string>()
          messages.forEach((msg: any) => {
            const msgTime = new Date(msg.created_at)
            if (msgTime >= fiveMinutesAgo && msg.user_id) {
              recentSenders.add(msg.user_id)
              // presence에 없으면 추가
              if (!userIds.includes(msg.user_id) && msg.user) {
                usersMap.set(msg.user_id, {
                  id: msg.user_id,
                  display_name: msg.user.display_name,
                  email: msg.user.email,
                })
              }
            }
          })
          
          console.log('[DashboardTab] 최근 채팅 참여자:', Array.from(recentSenders))
        }
      } catch (error) {
        console.warn('[DashboardTab] 최근 메시지 조회 실패:', error)
      }

      // 접속 기록 기반 접속자 확인 (webinar_live_presence - 최근 5분 이내)
      // API를 통해 조회 (RLS 우회)
      try {
        const accessStatsResponse = await fetch(`/api/webinars/${webinarId}/stats/access`)
        if (accessStatsResponse.ok) {
          const accessStatsResult = await accessStatsResponse.json()
          const accessStats = accessStatsResult.data
          
          if (accessStats?.currentParticipantList && accessStats.currentParticipantList.length > 0) {
            console.log('[DashboardTab] 접속 기록 기반 사용자:', accessStats.currentParticipantList.length)
            // 접속 기록에 있지만 presence에 없는 사용자 추가
            accessStats.currentParticipantList.forEach((participant: any) => {
              if (!userIds.includes(participant.userId)) {
                usersMap.set(participant.userId, {
                  id: participant.userId,
                  display_name: participant.displayName,
                  email: participant.email || undefined,
                })
              }
            })
          }
        }
      } catch (error) {
        console.warn('[DashboardTab] 접속 기록 조회 실패:', error)
      }

      // 업데이트된 사용자 목록
      const allUniqueUsers = Array.from(usersMap.values())
      const allUserIds = allUniqueUsers.map(u => u.id)

      console.log('[DashboardTab] 최종 사용자 수 (presence + 채팅):', allUniqueUsers.length, allUserIds)

      // 프로필 및 등록 정보 조회
      if (allUserIds.length > 0) {
        try {
          // registrations 조회 (에러 발생 시 빈 맵 사용)
          let registrationsMap = new Map()
          try {
            const registrationsResult = await supabase
              .from('registrations')
              .select('user_id, nickname, role')
              .eq('webinar_id', webinarId)
              .in('user_id', allUserIds)

            if (registrationsResult.data) {
              registrationsMap = new Map(
                registrationsResult.data.map((r: any) => [r.user_id, r])
              )
            }
          } catch (regError) {
            console.warn('[DashboardTab] Registrations 조회 실패:', regError)
            // registrations 조회 실패해도 계속 진행
          }

          // 프로필 정보는 API를 통해 개별 조회 (RLS 우회)
          const profilePromises = allUserIds.map(async (userId) => {
            try {
              const response = await fetch(`/api/profiles/${userId}`)
              if (response.ok) {
                const result = await response.json()
                return { userId, profile: result.profile }
              }
            } catch (error) {
              // 조용히 실패 처리 (로그만 출력)
              console.debug(`[DashboardTab] 프로필 조회 실패 (${userId}):`, error)
            }
            return { userId, profile: null }
          })

          const profileResults = await Promise.all(profilePromises)
          const profilesMap = new Map(
            profileResults
              .filter((r) => r.profile)
              .map((r) => [r.userId, r.profile])
          )

          // presence + 채팅 데이터를 기반으로 참가자 목록 생성
          const participantList = allUniqueUsers.map((presenceUser) => {
            const profile = profilesMap.get(presenceUser.id)
            const registration = registrationsMap.get(presenceUser.id)

            const displayName =
              registration?.nickname ||
              profile?.display_name ||
              presenceUser.display_name ||
              profile?.email ||
              presenceUser.email ||
              '익명'

            return {
              userId: presenceUser.id,
              displayName,
              email: profile?.email || presenceUser.email || null,
              role: registration?.role || null,
              lastSeenAt: new Date().toISOString(),
              joinedAt: new Date().toISOString(),
            }
          })

          console.log('[DashboardTab] Participant list:', participantList.length, participantList)
          setRealtimeParticipants(participantList)

          // 접속자 수가 변경되면 로그에 저장 (최소 1분 간격)
          const now = Date.now()
          const lastLogTime = localStorage.getItem(`last_log_time_${webinarId}`)
          const shouldLog = !lastLogTime || (now - parseInt(lastLogTime)) >= 60 * 1000 // 1분

          if (shouldLog && participantList.length > 0) {
            // 비동기로 로그 저장 (블로킹 방지)
            fetch(`/api/webinars/${webinarId}/access/log`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
              .then(response => {
                if (response.ok) {
                  localStorage.setItem(`last_log_time_${webinarId}`, String(now))
                  console.log('[DashboardTab] 접속자 수 로그 저장 완료:', participantList.length, '명')
                }
              })
              .catch(error => {
                console.debug('[DashboardTab] 접속자 수 로그 저장 실패:', error)
              })
          }
        } catch (error) {
          console.error('[DashboardTab] 접속자 정보 조회 실패:', error)
          // 에러 발생 시에도 presence + 채팅 데이터만으로 표시
          const participantList = allUniqueUsers.map((presenceUser) => ({
            userId: presenceUser.id,
            displayName: presenceUser.display_name || presenceUser.email || '익명',
            email: presenceUser.email || null,
            role: null,
            lastSeenAt: new Date().toISOString(),
            joinedAt: new Date().toISOString(),
          }))
          console.log('[DashboardTab] Fallback participant list:', participantList.length)
          setRealtimeParticipants(participantList)
        }
      } else {
        setRealtimeParticipants([])
      }
    }

    // Presence 상태 동기화
    channel
      .on('presence', { event: 'sync' }, async () => {
        console.log('[DashboardTab] Presence sync 이벤트 발생')
        await updateParticipants()
      })
      .on('presence', { event: 'join' }, async ({ newPresences }) => {
        console.log('[DashboardTab] User joined:', newPresences)
        // join 이벤트는 자동으로 sync를 트리거하지만, 즉시 업데이트
        await updateParticipants()
      })
      .on('presence', { event: 'leave' }, async ({ leftPresences }) => {
        console.log('[DashboardTab] User left:', leftPresences)
        // leave 이벤트는 자동으로 sync를 트리거하지만, 즉시 업데이트
        await updateParticipants()
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[DashboardTab] Presence 채널 구독 완료')
          
          // 구독 완료 후 현재 사용자 정보 가져오기 및 track
          supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (user) {
              try {
                const [profileResponse, registrationResponse, adminCheckResponse] = await Promise.all([
                  fetch(`/api/profiles/${user.id}`),
                  supabase
                    .from('registrations')
                    .select('role')
                    .eq('webinar_id', webinarId)
                    .eq('user_id', user.id)
                    .maybeSingle(),
                  fetch(`/api/webinars/${webinarId}/check-admin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userIds: [user.id] }),
                  })
                ])

                let profile = null
                if (profileResponse.ok) {
                  const result = await profileResponse.json()
                  profile = result.profile
                }

                const registration = registrationResponse.data
                const isParticipant = (registration as any)?.role === 'attendee'

                let isAdmin = false
                if (adminCheckResponse.ok) {
                  const adminResult = await adminCheckResponse.json()
                  isAdmin = adminResult.adminUserIds?.includes(user.id) || false
                }

                const displayName = isAdmin || !isParticipant
                  ? '관리자'
                  : ((profile as any)?.display_name || (profile as any)?.email || '익명')

                currentUserInfo = {
                  id: user.id,
                  display_name: displayName,
                  email: (profile as any)?.email,
                }

                // Presence에 참여 (subscribe 완료 후)
                await channel.track({
                  user: currentUserInfo,
                  online_at: new Date().toISOString(),
                })
                
                console.log('[DashboardTab] Presence track 완료:', currentUserInfo)
                console.log('[DashboardTab] Presence state after track:', channel.presenceState())
              } catch (error) {
                console.warn('[DashboardTab] 현재 사용자 프로필 조회 실패:', error)
                // 프로필 없이도 presence 참여
                currentUserInfo = {
                  id: user.id,
                }
                await channel.track({
                  user: currentUserInfo,
                  online_at: new Date().toISOString(),
                })
              }
            }
          })
          
          // 구독 완료 후 초기 presence state 확인 (약간의 지연 후)
          setTimeout(() => updateParticipants(), 500)
          
          // 주기적으로 presence state 확인 (5초마다) - sync 이벤트가 누락될 수 있으므로
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          intervalRef.current = setInterval(() => {
            console.log('[DashboardTab] 주기적 presence state 확인')
            updateParticipants()
          }, 5000)

          // 주기적으로 접속자 수를 로그에 저장 (1분마다)
          // 크론 작업이 있지만, 대시보드에서도 수동으로 저장하여 즉시 반영
          if (logIntervalRef.current) {
            clearInterval(logIntervalRef.current)
          }
          logIntervalRef.current = setInterval(async () => {
            try {
              // 접속자 수를 로그에 저장하는 API 호출
              // API 내부에서 webinar_live_presence를 직접 조회하므로 정확한 수치 저장
              const response = await fetch(`/api/webinars/${webinarId}/access/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              })
              
              if (response.ok) {
                const result = await response.json()
                console.log('[DashboardTab] 접속자 수 로그 저장 완료:', result.participantCount, '명')
              } else {
                console.warn('[DashboardTab] 접속자 수 로그 저장 실패:', response.status)
              }
            } catch (error) {
              console.warn('[DashboardTab] 접속자 수 로그 저장 실패:', error)
            }
          }, 60 * 1000) // 1분
        }
      })

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current)
        logIntervalRef.current = null
      }
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [webinarId])

  const handleRefresh = () => {
    fetchStats()
  }

  if (loading && !stats) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">통계를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">오류: {error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  // 차트 데이터 준비
  const chatTimelineData = stats.chat?.timeline.map((item) => ({
    time: new Date(item.time_slot).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    messages: item.message_count,
    senders: item.sender_count,
  })) || []

  const accessTimelineData = stats.access?.timeline.map((item) => ({
    time: new Date(item.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    avg: Math.round(item.avgParticipants),
    max: item.maxParticipants,
    min: item.minParticipants,
  })) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">대시보드</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
          {refreshing ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {/* 개요 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md">
          <div className="text-sm text-gray-600 mb-2">총 등록자</div>
          <div className="text-3xl font-bold text-blue-600">{stats.registrants?.totalRegistrants || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-md">
          <div className="text-sm text-gray-600 mb-2">입장한 사람</div>
          <div className="text-3xl font-bold text-indigo-600">{stats.access?.totalAttendees || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm text-gray-600">현재 접속자</div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {realtimeParticipants.length > 0 ? realtimeParticipants.length : (stats.access?.currentParticipants !== undefined ? stats.access.currentParticipants : 0)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-md">
          <div className="text-sm text-gray-600 mb-2">평균 동시 접속자</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.access?.avgConcurrentParticipants ? Math.round(stats.access.avgConcurrentParticipants) : 0}
          </div>
        </div>
      </div>

      {/* 채팅 통계 */}
      {stats.chat && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">채팅 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">총 메시지 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.chat.totalMessages}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">발신자 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.chat.uniqueSenders}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">참여율</div>
              <div className="text-2xl font-bold text-green-600">{stats.chat.participationRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">피크 시간</div>
              <div className="text-lg font-bold text-blue-600">
                {stats.chat.peakTime
                  ? new Date(stats.chat.peakTime.time).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </div>
            </div>
          </div>
          {chatTimelineData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-4">시간대별 메시지 추이</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chatTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="messages" stroke="#3B82F6" strokeWidth={2} name="메시지 수" />
                  <Line type="monotone" dataKey="senders" stroke="#10B981" strokeWidth={2} name="발신자 수" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Q&A 통계 */}
      {stats.qa && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Q&A 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">총 질문 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.qa.totalQuestions}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">답변 수</div>
              <div className="text-2xl font-bold text-green-600">{stats.qa.answeredQuestions}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">답변률</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.qa.totalQuestions > 0
                  ? ((stats.qa.answeredQuestions / stats.qa.totalQuestions) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">평균 답변 시간</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.qa.answerTime.avgMinutes > 0 ? `${stats.qa.answerTime.avgMinutes.toFixed(1)}분` : '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 현재 접속 중인 참여자 목록 - 실시간 업데이트 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">현재 접속 중인 참여자</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">실시간</span>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-3xl font-bold text-green-600">
            {realtimeParticipants.length > 0 ? realtimeParticipants.length : (stats.access?.currentParticipants !== undefined ? stats.access.currentParticipants : 0)}명
          </div>
        </div>
        
        {realtimeParticipants.length > 0 ? (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {realtimeParticipants.map((participant) => (
                    <tr key={participant.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{participant.displayName}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{participant.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          participant.role === 'admin' || participant.role === 'moderator'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {participant.role === 'admin' ? '관리자' : participant.role === 'moderator' ? '운영자' : '참가자'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">접속 중</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {stats.access ? '현재 접속 중인 참여자가 없습니다.' : '접속 정보를 불러오는 중...'}
            </div>
          )}
      </div>

      {/* 접속 통계 (타임라인) */}
      {stats.access && accessTimelineData.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">접속 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">최대 동시 접속자</div>
              <div className="text-2xl font-bold text-blue-600">{stats.access.maxConcurrentParticipants}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">평균 동시 접속자</div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(stats.access.avgConcurrentParticipants)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">피크 시간</div>
              <div className="text-lg font-bold text-purple-600">
                {stats.access.peakTime
                  ? new Date(stats.access.peakTime.time).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-md font-semibold mb-4">시간대별 접속자 수 추이</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={accessTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="avg" stroke="#3B82F6" strokeWidth={2} name="평균 접속자" />
                <Line type="monotone" dataKey="max" stroke="#10B981" strokeWidth={2} name="최대 접속자" />
                <Line type="monotone" dataKey="min" stroke="#EF4444" strokeWidth={2} name="최소 접속자" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 폼/퀴즈 통계 */}
      {stats.forms && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">폼/퀴즈 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">설문 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.forms.totalSurveys}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">설문 응답 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.forms.survey.totalSubmissions}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">설문 응답자 수</div>
              <div className="text-2xl font-bold text-green-600">{stats.forms.survey.uniqueRespondents}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">퀴즈 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.forms.totalQuizzes}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">퀴즈 시도 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.forms.quiz.totalAttempts}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">평균 점수</div>
              <div className="text-2xl font-bold text-blue-600">{stats.forms.quiz.avgScore.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 추첨 통계 */}
      {stats.giveaways && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">추첨 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">추첨 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.giveaways.totalGiveaways}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">완료된 추첨</div>
              <div className="text-2xl font-bold text-green-600">{stats.giveaways.drawnGiveaways}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">참여 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.giveaways.totalEntries}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">참여자 수</div>
              <div className="text-2xl font-bold text-purple-600">{stats.giveaways.uniqueParticipants}</div>
            </div>
          </div>
        </div>
      )}

      {/* 파일 통계 */}
      {stats.files && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">파일 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">파일 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.files.totalFiles}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">다운로드 수</div>
              <div className="text-2xl font-bold text-blue-600">{stats.files.totalDownloads}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">다운로더 수</div>
              <div className="text-2xl font-bold text-green-600">{stats.files.uniqueDownloaders}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
