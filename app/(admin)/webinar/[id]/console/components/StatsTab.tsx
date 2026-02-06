'use client'

import { useState, useEffect } from 'react'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface Webinar {
  id: string
  title: string
  slug?: string | null
  start_time?: string | null
  end_time?: string | null
  webinar_start_time?: string | null
}

interface StatsTabProps {
  webinar: Webinar
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
    answerTimeDistribution: Array<{ range: string; count: number }>
  }
  access?: {
    maxConcurrentParticipants: number
    avgConcurrentParticipants: number
    totalAttendees?: number
    timeline: Array<{
      time: string
      maxParticipants: number
      minParticipants: number
      avgParticipants: number
    }>
    peakTime: { time: string; participantCount: number } | null
  }
  forms?: {
    totalSurveys: number
    totalQuizzes: number
    survey: {
      totalSubmissions: number
      uniqueRespondents: number
    }
    quiz: {
      totalAttempts: number
      avgScore: number
    }
  }
  giveaways?: {
    totalGiveaways: number
    drawnGiveaways: number
    totalEntries: number
    uniqueParticipants: number
  }
  files?: {
    totalFiles: number
    totalDownloads: number
    uniqueDownloaders: number
    fileDownloads: Array<{ file_id: string; file_name: string; download_count: number }>
  }
  registrants?: {
    totalRegistrants: number
    maxConcurrentParticipants: number
    registrationSources: Array<{ source: string; count: number }>
  }
  survey?: {
    hasCampaign: boolean
    campaignTitle?: string
    campaignStatus?: string
    totalCompleted: number
    totalVerified: number
    totalPrizeRecorded: number
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function StatsTab({ webinar }: StatsTabProps) {
  const webinarId = webinar.slug || webinar.id
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log('[StatsTab] 컴포넌트 렌더링:', { webinarId, webinar })

  useEffect(() => {
    console.log('[StatsTab] useEffect 실행:', { webinarId })
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinarId])

  const fetchStats = async () => {
    console.log('[StatsTab] fetchStats 시작')
    setLoading(true)
    setError(null)
    try {
      // 웨비나 시작 시간 기준으로 해당 날짜 집계
      // 웨비나의 webinar_start_time(또는 start_time)부터 해당 날짜 자정까지(또는 end_time까지)의 통계 조회
      const params = new URLSearchParams()
      params.set('interval', '5m')
      
      // webinar_start_time을 우선 사용, 없으면 start_time 사용
      const webinarStartTime = webinar.webinar_start_time || webinar.start_time
      if (webinarStartTime) {
        const startTime = new Date(webinarStartTime)
        // 시작 시간을 기준으로 해당 날짜의 자정 계산
        const startDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())
        const endOfDay = new Date(startDate)
        endOfDay.setDate(endOfDay.getDate() + 1) // 다음날 자정
        endOfDay.setHours(0, 0, 0, 0)
        
        // 웨비나 종료 시간이 있고 해당 날짜 안에 있으면 종료 시간까지, 아니면 자정까지
        const webinarEndTime = webinar.end_time ? new Date(webinar.end_time) : null
        const now = new Date()
        
        let toTime: Date
        if (webinarEndTime && webinarEndTime <= endOfDay) {
          // 종료 시간이 해당 날짜 안에 있으면 종료 시간까지
          toTime = webinarEndTime
        } else if (now < endOfDay) {
          // 현재 시간이 해당 날짜 안에 있으면 현재 시간까지
          toTime = now
        } else {
          // 해당 날짜가 지났으면 자정까지
          toTime = endOfDay
        }
        
        params.set('from', startTime.toISOString())
        params.set('to', toTime.toISOString())
      }

      const apiUrl = `/api/webinars/${webinarId}/stats?${params.toString()}`
      console.log('[StatsTab] API 호출 시작:', {
        apiUrl,
        webinarId,
        webinar,
        params: Object.fromEntries(params),
        startTime: webinarStartTime,
        endTime: webinar.end_time
      })

      const response = await fetch(apiUrl)
      console.log('[StatsTab] fetch 완료:', { ok: response.ok, status: response.status })
      
      console.log('[StatsTab] 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[StatsTab] API 오류 응답:', errorText)
        setError(`API 오류 (${response.status}): ${errorText || response.statusText}`)
        return
      }

      const result = await response.json()
      console.log('[StatsTab] API 응답 받음:', {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        error: result.error
      })

      if (result.success) {
        console.log('[StatsTab] 통계 데이터 설정:', result.data)
        setStats(result.data)
      } else {
        console.error('[StatsTab] API 오류:', result.error)
        setError(result.error || '통계 조회 실패')
      }
    } catch (err: any) {
      console.error('[StatsTab] fetchStats 예외 발생:', err)
      console.error('[StatsTab] 에러 스택:', err.stack)
      setError(err.message || '통계 조회 중 오류가 발생했습니다.')
    } finally {
      console.log('[StatsTab] fetchStats 완료, loading false')
      setLoading(false)
    }
  }

  console.log('[StatsTab] 렌더링 상태:', { loading, error, hasStats: !!stats })

  if (loading) {
    console.log('[StatsTab] 로딩 중 렌더링')
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">통계를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    console.log('[StatsTab] 에러 렌더링:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">오류: {error}</p>
        <p className="text-red-600 text-sm mt-2">브라우저 콘솔을 확인하세요.</p>
      </div>
    )
  }

  if (!stats) {
    console.log('[StatsTab] stats가 null, null 반환')
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">통계 데이터가 없습니다.</p>
        <p className="text-yellow-600 text-sm mt-2">브라우저 콘솔을 확인하세요.</p>
      </div>
    )
  }

  console.log('[StatsTab] 통계 데이터 렌더링:', stats)

  // 차트 데이터 준비
  const chatTimelineData = stats.chat?.timeline.map((item) => ({
    time: new Date(item.time_slot).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    messages: item.message_count,
    senders: item.sender_count,
  })) || []

  const qaTimelineData = stats.qa?.timeline.map((item) => ({
    time: new Date(item.time_slot).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    questions: item.question_count,
    answered: item.answered_count,
  })) || []

  const accessTimelineData = stats.access?.timeline.map((item) => ({
    time: new Date(item.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    avg: Math.round(item.avgParticipants),
    max: item.maxParticipants,
    min: item.minParticipants,
  })) || []

  const registrationSourceData =
    stats.registrants?.registrationSources.map((item) => ({
      name: item.source === 'email' ? '이메일' : item.source === 'manual' ? '수동' : item.source === 'invite' ? '초대' : item.source,
      value: item.count,
    })) || []

  return (
    <div className="space-y-6">
      {/* 개요 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">총 등록자 수</div>
          <div className="text-3xl font-bold text-blue-600">{stats.registrants?.totalRegistrants || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">실제 접속자 수</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.access?.totalAttendees || 0}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">최대 동시 접속자</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.access?.maxConcurrentParticipants || stats.registrants?.maxConcurrentParticipants || 0}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">평균 동시 접속자</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.access?.avgConcurrentParticipants
              ? stats.access.avgConcurrentParticipants.toFixed(2)
              : '0.00'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">총 메시지 수</div>
          <div className="text-3xl font-bold text-indigo-600">
            {stats.chat?.totalMessages || 0}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">총 질문 수</div>
          <div className="text-3xl font-bold text-amber-600">
            {stats.qa?.totalQuestions || 0}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">답변된 질문 수</div>
          <div className="text-3xl font-bold text-emerald-600">
            {stats.qa?.answeredQuestions || 0}
          </div>
        </div>
      </div>

      {/* 채팅 통계 */}
      {stats.chat && (
        <div className="bg-white rounded-xl shadow-lg p-6">
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
              <ResponsiveContainer width="100%" height={300}>
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
          {stats.chat.topSenders && stats.chat.topSenders.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-4">최다 발신자</h4>
              <div className="space-y-2">
                {stats.chat.topSenders.slice(0, 5).map((sender, index) => (
                  <div key={sender.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-bold">#{index + 1}</span>
                      <span className="font-medium">{sender.nickname}</span>
                    </div>
                    <span className="text-blue-600 font-bold">{sender.message_count}개</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Q&A 통계 */}
      {stats.qa && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Q&A 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          {qaTimelineData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-4">시간대별 질문 추이</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={qaTimelineData}>
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
                  <Line type="monotone" dataKey="questions" stroke="#F59E0B" strokeWidth={2} name="질문 수" />
                  <Line type="monotone" dataKey="answered" stroke="#10B981" strokeWidth={2} name="답변 수" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {stats.qa.topQuestioners && stats.qa.topQuestioners.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-4">최다 질문자</h4>
              <div className="space-y-2">
                {stats.qa.topQuestioners.slice(0, 5).map((questioner, index) => (
                  <div
                    key={questioner.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-bold">#{index + 1}</span>
                      <span className="font-medium">{questioner.nickname}</span>
                    </div>
                    <span className="text-orange-600 font-bold">{questioner.question_count}개</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 접속 통계 - 항상 표시 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">접속 통계</h3>
        
        {/* 웨비나 시작 시간 표시 및 안내 */}
        {(webinar.webinar_start_time || webinar.start_time) ? (
          (() => {
            // webinar_start_time을 우선 사용, 없으면 start_time 사용
            const startTimeValue = webinar.webinar_start_time || webinar.start_time
            const startTime = new Date(startTimeValue!)
            // KST 기준으로 현재 시간 계산
            const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
            // 시작일의 자정 (KST)
            const startDateKST = new Date(startTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
            startDateKST.setHours(0, 0, 0, 0)
            
            // 시작일 이전인지 확인
            const isBeforeStartDate = nowKST < startDateKST
            
            // 웨비나 시작 시간 포맷팅 (KST)
            const startTimeFormatted = startTime.toLocaleString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Seoul',
            })
            
            return (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-blue-900 font-semibold text-sm mb-1">
                      웨비나 시작 시간: <span className="font-bold">{startTimeFormatted}</span>
                    </p>
                    <p className="text-blue-700 text-sm">
                      웨비나 시작일 당일부터 접속 통계가 제공됩니다.
                    </p>
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              웨비나 시작 시간이 설정되지 않았습니다.
            </p>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">최대 동시 접속자</div>
            <div className="text-2xl font-bold text-green-600">
              {stats?.access?.maxConcurrentParticipants ?? 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">평균 동시 접속자</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.access?.avgConcurrentParticipants
                ? Math.round(stats.access.avgConcurrentParticipants)
                : 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">피크 시간</div>
            <div className="text-lg font-bold text-purple-600">
              {stats?.access?.peakTime
                ? new Date(stats.access.peakTime.time).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Seoul',
                  })
                : '-'}
            </div>
          </div>
        </div>

        {/* 그래프 섹션 - 항상 표시 */}
        <div className="mt-6">
          <h4 className="text-md font-semibold mb-4">시간대별 접속자 수 추이</h4>
          {(() => {
            // webinar_start_time을 우선 사용, 없으면 start_time 사용
            const webinarStartTime = webinar.webinar_start_time || webinar.start_time
            if (!webinarStartTime) {
              return (
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <p className="text-gray-500 font-medium mb-1">
                      웨비나 시작 시간을 설정해주세요.
                    </p>
                    <p className="text-gray-400 text-sm">
                      웨비나 시작 시간 설정 후 접속자 통계가 그래프로 표시됩니다.
                    </p>
                  </div>
                </div>
              )
            }

            const startTime = new Date(webinarStartTime)
            // 웨비나 시작 시간 1시간 전
            const oneHourBeforeStart = new Date(startTime.getTime() - 60 * 60 * 1000)
            // KST 기준으로 현재 시간 계산
            const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
            
            // 웨비나 시작 시간 1시간 전 이전인지 확인
            const isBeforeOneHourBeforeStart = nowKST < oneHourBeforeStart
            
            if (isBeforeOneHourBeforeStart || !stats?.access || accessTimelineData.length === 0) {
              return (
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <p className="text-gray-500 font-medium mb-1">
                      {isBeforeOneHourBeforeStart ? '웨비나 시작 1시간 전부터 통계가 표시됩니다.' : '접속 통계 데이터가 아직 없습니다.'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      웨비나 시작 1시간 전부터 접속자 통계가 그래프로 표시됩니다.
                    </p>
                  </div>
                </div>
              )
            }

            return (
              <ResponsiveContainer width="100%" height={300}>
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
            )
          })()}
        </div>
      </div>

      {/* 폼/퀴즈 통계 */}
      {stats.forms && (
        <div className="bg-white rounded-xl shadow-lg p-6">
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
        <div className="bg-white rounded-xl shadow-lg p-6">
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">파일 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          {stats.files.fileDownloads && stats.files.fileDownloads.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-4">인기 파일</h4>
              <div className="space-y-2">
                {stats.files.fileDownloads.slice(0, 5).map((file) => (
                  <div key={file.file_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium truncate flex-1">{file.file_name}</span>
                    <span className="text-blue-600 font-bold ml-4">{file.download_count}회</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 등록 출처 통계 */}
      {stats.registrants && registrationSourceData.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">등록 출처 통계</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="grid grid-cols-3 gap-4">
                {stats.registrants.registrationSources.map((source) => (
                  <div key={source.source} className="text-center">
                    <div className="text-sm text-gray-600 mb-1">
                      {source.source === 'email'
                        ? '이메일'
                        : source.source === 'manual'
                          ? '수동'
                          : source.source === 'invite'
                            ? '초대'
                            : source.source}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{source.count}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stats.registrants && stats.registrants.totalRegistrants > 0
                        ? ((source.count / stats.registrants.totalRegistrants) * 100).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={registrationSourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {registrationSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 설문조사 통계 */}
      {stats.survey && stats.survey.hasCampaign && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">설문조사 통계</h3>
          {stats.survey.campaignTitle && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-1">캠페인명</div>
              <div className="text-lg font-medium text-gray-900">{stats.survey.campaignTitle}</div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">완료 수</div>
              <div className="text-2xl font-bold text-blue-600">{stats.survey.totalCompleted}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">스캔 완료 수</div>
              <div className="text-2xl font-bold text-green-600">{stats.survey.totalVerified}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">경품 기록 수</div>
              <div className="text-2xl font-bold text-purple-600">{stats.survey.totalPrizeRecorded}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
