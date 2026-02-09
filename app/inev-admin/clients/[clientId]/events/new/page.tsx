'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function InevAdminNewEventPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  const [code, setCode] = useState('')
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [campaign_start_date, setCampaignStartDate] = useState('')
  const [campaign_end_date, setCampaignEndDate] = useState('')
  const [event_date_type, setEventDateType] = useState<'single' | 'range'>('single')
  const [event_date, setEventDate] = useState('')
  const [event_start_date, setEventStartDate] = useState('')
  const [event_end_date, setEventEndDate] = useState('')
  const [module_registration, setModuleRegistration] = useState(true)
  const [module_survey, setModuleSurvey] = useState(false)
  const [module_webinar, setModuleWebinar] = useState(false)
  const [module_email, setModuleEmail] = useState(false)
  const [module_utm, setModuleUtm] = useState(false)
  const [module_ondemand, setModuleOndemand] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/inev/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          code: code.trim() || undefined,
          slug: slug.trim() || undefined,
          title: title.trim() || undefined,
          campaign_start_date: campaign_start_date || undefined,
          campaign_end_date: campaign_end_date || undefined,
          event_date_type,
          event_date: event_date_type === 'single' ? event_date || undefined : undefined,
          event_start_date: event_date_type === 'range' ? event_start_date || undefined : undefined,
          event_end_date: event_date_type === 'range' ? event_end_date || undefined : undefined,
          module_registration,
          module_survey,
          module_webinar,
          module_email,
          module_utm,
          module_ondemand,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')
      router.push(`/inev-admin/clients/${clientId}/events`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <Link href={`/inev-admin/clients/${clientId}/events`} className="text-sm text-gray-500 hover:text-gray-700">← 이벤트 목록</Link>
      <h1 className="text-xl font-semibold text-gray-900">이벤트 추가</h1>
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">코드 (6자리 권장, 비워두면 자동 생성)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="비워두면 자동 생성됩니다"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">슬러그 (비워두면 코드로 자동 채워짐)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="비워두면 코드로 자동 채워집니다"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">이벤트 제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="이벤트 제목을 입력하세요"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          
          {/* 캠페인 기간 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">캠페인 기간 *</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">시작일</label>
                <input
                  type="date"
                  value={campaign_start_date}
                  onChange={(e) => setCampaignStartDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">종료일</label>
                <input
                  type="date"
                  value={campaign_end_date}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* 이벤트 날짜 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">이벤트 날짜 *</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="event_date_type"
                  value="single"
                  checked={event_date_type === 'single'}
                  onChange={(e) => setEventDateType('single')}
                />
                <span className="text-sm text-gray-700">단일 날짜</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="event_date_type"
                  value="range"
                  checked={event_date_type === 'range'}
                  onChange={(e) => setEventDateType('range')}
                />
                <span className="text-sm text-gray-700">기간</span>
              </label>
            </div>
            {event_date_type === 'single' ? (
              <input
                type="date"
                value={event_date}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">시작일</label>
                  <input
                    type="date"
                    value={event_start_date}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">종료일</label>
                  <input
                    type="date"
                    value={event_end_date}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_registration} onChange={(e) => setModuleRegistration(e.target.checked)} />
              <span className="text-sm text-gray-700">등록</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_survey} onChange={(e) => setModuleSurvey(e.target.checked)} />
              <span className="text-sm text-gray-700">설문</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_webinar} onChange={(e) => setModuleWebinar(e.target.checked)} />
              <span className="text-sm text-gray-700">웨비나</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_email} onChange={(e) => setModuleEmail(e.target.checked)} />
              <span className="text-sm text-gray-700">이메일</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_utm} onChange={(e) => setModuleUtm(e.target.checked)} />
              <span className="text-sm text-gray-700">UTM</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_ondemand} onChange={(e) => setModuleOndemand(e.target.checked)} />
              <span className="text-sm text-gray-700">온디맨드</span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? '생성 중...' : '생성'}
          </button>
          <Link
            href={`/inev-admin/clients/${clientId}/events`}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
