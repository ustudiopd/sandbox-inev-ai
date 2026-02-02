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

interface StatsTabProps {
  campaignId: string
  campaignType?: 'survey' | 'registration'
}

interface RegistrationDataStats {
  total_registrations: number
  with_email: number
  email_consent: number
  phone_consent: number
  company_distribution: Record<string, number>
  job_title_distribution: Record<string, number>
}

interface CampaignStats {
  total_completed: number
  total_verified: number
  total_prize_recorded: number
}

interface QuestionStat {
  questionId: string
  questionBody: string
  questionType: string
  orderNo: number
  totalAnswers: number
  options: Array<any>
  choiceDistribution: Record<string, number>
  textAnswers: string[]
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

export default function StatsTab({ campaignId, campaignType = 'survey' }: StatsTabProps) {
  const isRegistration = campaignType === 'registration'
  const labelText = isRegistration ? '등록' : '설문'
  const labelTextPlural = isRegistration ? '등록' : '설문'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([])
  const [timelineData, setTimelineData] = useState<Array<{ time: string; count: number }>>([])
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [registrationDataStats, setRegistrationDataStats] = useState<RegistrationDataStats | null>(null)

  useEffect(() => {
    fetchStats()
  }, [campaignId, dateRange])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      // 기본 통계 조회
      const statsResponse = await fetch(`/api/public/event-survey/campaigns/${campaignId}/stats`)
      const statsResult = await statsResponse.json()
      
      if (statsResult.success) {
        setStats(statsResult.stats)
      }

      // 문항별 통계 조회
      const questionStatsResponse = await fetch(`/api/event-survey/campaigns/${campaignId}/question-stats`)
      const questionStatsResult = await questionStatsResponse.json()
      
      if (questionStatsResult.success) {
        setQuestionStats(questionStatsResult.questionStats || [])
      }

      // 시간대별 완료 추이 조회
      await fetchTimelineData()
      
      // 등록 타입일 때 registration_data 분석
      if (isRegistration) {
        await fetchRegistrationDataStats()
      }
    } catch (err: any) {
      console.error('통계 조회 오류:', err)
      setError(err.message || '통계 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrationDataStats = async () => {
    try {
      const entriesResponse = await fetch(`/api/event-survey/campaigns/${campaignId}/entries`)
      const entriesResult = await entriesResponse.json()
      
      if (entriesResult.success && entriesResult.entries) {
        const entries = entriesResult.entries as Array<{ registration_data: any }>
        
        const companyMap = new Map<string, number>()
        const jobTitleMap = new Map<string, number>()
        
        entries.forEach((entry) => {
          const regData = entry.registration_data
          
          if (regData) {
            if (regData.company) {
              const company = regData.company.trim()
              companyMap.set(company, (companyMap.get(company) || 0) + 1)
            }
            
            if (regData.jobTitle) {
              const jobTitle = regData.jobTitle.trim()
              jobTitleMap.set(jobTitle, (jobTitleMap.get(jobTitle) || 0) + 1)
            }
          }
        })
        
        setRegistrationDataStats({
          total_registrations: entries.length,
          with_email: 0,
          email_consent: 0,
          phone_consent: 0,
          company_distribution: Object.fromEntries(companyMap),
          job_title_distribution: Object.fromEntries(jobTitleMap),
        })
      }
    } catch (err: any) {
      console.error('등록 데이터 통계 조회 오류:', err)
    }
  }

  const fetchTimelineData = async () => {
    try {
      const entriesResponse = await fetch(`/api/event-survey/campaigns/${campaignId}/entries`)
      const entriesResult = await entriesResponse.json()
      
      if (entriesResult.success && entriesResult.entries) {
        const entries = entriesResult.entries as Array<{ completed_at: string }>
        
        // 날짜 범위 필터링
        const now = new Date()
        let filteredEntries = entries
        
        if (dateRange === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          filteredEntries = entries.filter((e) => new Date(e.completed_at) >= todayStart)
        } else if (dateRange === 'week') {
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          filteredEntries = entries.filter((e) => new Date(e.completed_at) >= weekStart)
        } else if (dateRange === 'month') {
          const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          filteredEntries = entries.filter((e) => new Date(e.completed_at) >= monthStart)
        }

        // 일자별 집계
        const dailyMap = new Map<string, number>()
        
        filteredEntries.forEach((entry) => {
          const date = new Date(entry.completed_at)
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          
          dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1)
        })

        // 날짜순 정렬
        const timeline = Array.from(dailyMap.entries())
          .map(([time, count]) => ({ time, count }))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        
        setTimelineData(timeline)
      }
    } catch (err: any) {
      console.error('타임라인 데이터 조회 오류:', err)
    }
  }

  if (loading) {
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 날짜 범위 선택 */}
      <div className="flex items-center justify-between">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="all">전체</option>
          <option value="today">오늘</option>
          <option value="week">최근 7일</option>
          <option value="month">최근 30일</option>
        </select>
      </div>

      {/* 개요 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">{isRegistration ? '등록수' : '완료 수'}</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.total_completed || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">스캔 완료 수</div>
          <div className="text-3xl font-bold text-green-600">{stats?.total_verified || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm text-gray-600 mb-2">경품 기록 수</div>
          <div className="text-3xl font-bold text-purple-600">{stats?.total_prize_recorded || 0}</div>
        </div>
      </div>

      {/* 일자별 등록추이 */}
      {timelineData.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">일자별 {labelText}추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('ko-KR')
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                name={isRegistration ? '등록수' : '완료 수'}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 등록 데이터 분석 (등록 타입일 때) */}
      {isRegistration && registrationDataStats && registrationDataStats.total_registrations > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">등록 데이터 분석</h3>
          
          {/* 회사별 분포 */}
          {Object.keys(registrationDataStats.company_distribution).length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-3">회사별 분포</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(registrationDataStats.company_distribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([company, count]) => (
                    <div key={company} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">{company}</span>
                      <span className="text-sm font-bold text-blue-600 ml-2">{count}명</span>
                    </div>
                  ))}
              </div>
              {Object.keys(registrationDataStats.company_distribution).length > 10 && (
                <div className="text-xs text-gray-500 mt-2">
                  외 {Object.keys(registrationDataStats.company_distribution).length - 10}개 회사...
                </div>
              )}
            </div>
          )}
          
          {/* 직책별 분포 */}
          {Object.keys(registrationDataStats.job_title_distribution).length > 0 && (
            <div>
              <h4 className="text-md font-semibold mb-3">직책별 분포</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(registrationDataStats.job_title_distribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([jobTitle, count]) => ({ name: jobTitle, count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" name="등록수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 문항별 통계 */}
      {questionStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">문항별 통계</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questionStats.map((stat, index) => (
              <div key={stat.questionId} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">문항 {stat.orderNo}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {stat.questionType === 'single' ? '단일 선택' : stat.questionType === 'multiple' ? '다중 선택' : '텍스트'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{stat.questionBody}</h4>
                  <div className="text-xs text-gray-500">총 {stat.totalAnswers}명 응답</div>
                </div>

                {stat.questionType === 'text' ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {stat.textAnswers.length > 0 ? (
                      stat.textAnswers.slice(0, 5).map((answer, idx) => (
                        <div key={idx} className="text-xs text-gray-700 bg-white p-2 rounded border">
                          {answer}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400">답변 없음</div>
                    )}
                    {stat.textAnswers.length > 5 && (
                      <div className="text-xs text-gray-400">외 {stat.textAnswers.length - 5}개 답변...</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stat.choiceDistribution).map(([key, value]) => {
                            const option = stat.options.find((opt: any) => {
                              const optId = typeof opt === 'string' ? opt : opt.id
                              return optId === key
                            })
                            const optionText = typeof option === 'string' ? option : option?.text || key
                            return {
                              name: optionText,
                              value,
                            }
                          })}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(stat.choiceDistribution).map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {questionStats.length === 0 && stats && (!isRegistration || !registrationDataStats || registrationDataStats.total_registrations === 0) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8 text-gray-500">
            <p>아직 {isRegistration ? '등록' : '설문 응답'}이 없습니다.</p>
          </div>
        </div>
      )}
    </div>
  )
}
