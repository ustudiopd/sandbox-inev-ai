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

export default function DashboardTab({ webinarId, webinarSlug }: DashboardTabProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('interval', '5m')

      const response = await fetch(`/api/webinars/${webinarSlug}/stats?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setStats(result.data)
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
          <div className="text-sm text-gray-600 mb-2">총 등록자 수</div>
          <div className="text-3xl font-bold text-blue-600">{stats.registrants?.totalRegistrants || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-md">
          <div className="text-sm text-gray-600 mb-2">최대 동시 접속자</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.access?.maxConcurrentParticipants || stats.registrants?.maxConcurrentParticipants || 0}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-md">
          <div className="text-sm text-gray-600 mb-2">채팅 참여율</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.chat?.participationRate ? `${stats.chat.participationRate.toFixed(1)}%` : '0%'}
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

      {/* 접속 통계 */}
      {stats.access && accessTimelineData.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">접속 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">최대 동시 접속자</div>
              <div className="text-2xl font-bold text-green-600">{stats.access.maxConcurrentParticipants}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">평균 동시 접속자</div>
              <div className="text-2xl font-bold text-blue-600">
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
