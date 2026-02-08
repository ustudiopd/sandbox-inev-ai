'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type EventDetail = {
  id: string
  client_id: string
  code: string
  slug: string
  module_registration: boolean
  module_survey: boolean
  module_webinar: boolean
  module_email: boolean
  module_utm: boolean
  module_ondemand: boolean
  created_at: string
  updated_at: string
}

export default function InevAdminEventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  const eventId = params.eventId as string
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [slug, setSlug] = useState('')
  const [module_registration, setModuleRegistration] = useState(true)
  const [module_survey, setModuleSurvey] = useState(false)
  const [module_webinar, setModuleWebinar] = useState(false)
  const [module_email, setModuleEmail] = useState(false)
  const [module_utm, setModuleUtm] = useState(false)
  const [module_ondemand, setModuleOndemand] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'settings' | 'leads' | 'survey' | 'visits' | 'email'>('settings')

  useEffect(() => {
    if (!eventId) return
    fetch(`/api/inev/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else if (data.id) {
          setEvent(data)
          setSlug(data.slug)
          setModuleRegistration(data.module_registration ?? true)
          setModuleSurvey(data.module_survey ?? false)
          setModuleWebinar(data.module_webinar ?? false)
          setModuleEmail(data.module_email ?? false)
          setModuleUtm(data.module_utm ?? false)
          setModuleOndemand(data.module_ondemand ?? false)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [eventId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/inev/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          module_registration,
          module_survey,
          module_webinar,
          module_email,
          module_utm,
          module_ondemand,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setEvent((prev) => (prev ? { ...prev, ...data } : null))
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500">로딩 중...</div>
  if (error && !event) return <div className="text-red-600">오류: {error}</div>
  if (!event) return null

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/inev-admin/clients/${clientId}/events`} className="text-sm text-gray-500 hover:text-gray-700">← 이벤트 목록</Link>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">{event.slug}</h1>
        <p className="text-sm text-gray-500">코드: {event.code}</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === 'settings' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          설정
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === 'leads' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          등록자
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('survey')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === 'survey' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          설문 응답
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('visits')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === 'visits' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          UTM/Visit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === 'email' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          이메일
        </button>
      </div>

      {activeTab === 'settings' && (
        <form onSubmit={handleSave} className="max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">코드</label>
              <input type="text" value={event.code} readOnly className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500" />
              <p className="mt-0.5 text-xs text-gray-400">코드는 생성 후 변경할 수 없습니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">슬러그</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="seminar1"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700">모듈</span>
              <div className="mt-2 flex flex-wrap gap-4">
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
              <p className="mt-1 text-xs text-gray-500">OFF인 모듈은 공개 페이지에 메뉴/라우트가 노출되지 않습니다.</p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <Link
              href={`/event/${event.slug}`}
              target="_blank"
              rel="noopener"
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              공개 페이지 보기
            </Link>
          </div>
        </form>
      )}

      {activeTab === 'leads' && (
        <LeadsTab eventId={eventId} />
      )}

      {activeTab === 'survey' && (
        <SurveyResponsesTab eventId={eventId} />
      )}

      {activeTab === 'visits' && (
        <VisitsTab eventId={eventId} />
      )}

      {activeTab === 'email' && (
        <EmailTab eventId={eventId} />
      )}
    </div>
  )
}

function EmailTab({ eventId }: { eventId: string }) {
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [fromName, setFromName] = useState('Inev.ai')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/inev/events/${eventId}/email`)
      .then((r) => r.json())
      .then((data) => {
        if (data.subject != null) setSubject(data.subject)
        if (data.body_html != null) setBodyHtml(data.body_html)
        if (data.from_name != null) setFromName(data.from_name)
      })
      .finally(() => setLoading(false))
  }, [eventId])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/inev/events/${eventId}/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body_html: bodyHtml, from_name: fromName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setMessage('저장되었습니다.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '오류')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(bodyHtml || '<p>본문 없음</p>')
      w.document.close()
    }
  }

  const handleTestSend = async () => {
    if (!testTo.trim()) { setMessage('테스트 수신 이메일을 입력하세요.'); return }
    setTestSending(true)
    setMessage('')
    try {
      const res = await fetch(`/api/inev/events/${eventId}/email/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '발송 실패')
      setMessage(`테스트 발송 완료: ${testTo}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '발송 실패')
    } finally {
      setTestSending(false)
    }
  }

  if (loading) return <div className="text-gray-500">로딩 중...</div>

  return (
    <div className="max-w-2xl space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-gray-900">이메일 초안</h2>
      {message && <p className="text-sm text-gray-600">{message}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700">발신명</label>
        <input
          type="text"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">제목</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
          placeholder="이메일 제목"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">본문 (HTML)</label>
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          rows={12}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
          placeholder="<p>안녕하세요...</p>"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          미리보기
        </button>
      </div>
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700">테스트 발송</label>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-gray-900"
          />
          <button
            type="button"
            onClick={handleTestSend}
            disabled={testSending}
            className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
          >
            {testSending ? '발송 중...' : '테스트 발송'}
          </button>
        </div>
      </div>
    </div>
  )
}

type VisitAggregate = { total: number; by_utm_source: Record<string, number>; by_utm_medium: Record<string, number>; by_utm_campaign: Record<string, number> }

function VisitsTab({ eventId }: { eventId: string }) {
  const [agg, setAgg] = useState<VisitAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/inev/events/${eventId}/visits?aggregate=true`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setAgg(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) return <div className="text-gray-500">로딩 중...</div>
  if (error) return <div className="text-red-600">오류: {error}</div>
  if (!agg) return null

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-gray-900">Visit / UTM 집계</h2>
      <p className="text-2xl font-semibold text-gray-900">총 Visit {agg.total}건</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-gray-500">utm_source</p>
          <ul className="mt-1 text-sm">
            {Object.entries(agg.by_utm_source || {}).map(([k, v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
            {Object.keys(agg.by_utm_source || {}).length === 0 && <li className="text-gray-400">없음</li>}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">utm_medium</p>
          <ul className="mt-1 text-sm">
            {Object.entries(agg.by_utm_medium || {}).map(([k, v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
            {Object.keys(agg.by_utm_medium || {}).length === 0 && <li className="text-gray-400">없음</li>}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">utm_campaign</p>
          <ul className="mt-1 text-sm">
            {Object.entries(agg.by_utm_campaign || {}).map(([k, v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
            {Object.keys(agg.by_utm_campaign || {}).length === 0 && <li className="text-gray-400">없음</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

type SurveyRow = { id: string; lead_id: string | null; email: string | null; response: Record<string, unknown>; created_at: string }

function SurveyResponsesTab({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<SurveyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/inev/events/${eventId}/survey-responses`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setRows(Array.isArray(data) ? data : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) return <div className="text-gray-500">로딩 중...</div>
  if (error) return <div className="text-red-600">오류: {error}</div>

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-medium text-gray-900">설문 응답 ({rows.length}건)</h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">설문 응답이 없습니다.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{r.email ?? '(이메일 없음)'}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('ko-KR')}</span>
              </div>
              {r.response && typeof r.response === 'object' && Object.keys(r.response).length > 0 && (
                <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700">
                  {JSON.stringify(r.response, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LeadsTab({ eventId }: { eventId: string }) {
  const [leads, setLeads] = useState<{ id: string; email: string; name: string | null; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/inev/events/${eventId}/leads`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setLeads(Array.isArray(data) ? data : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [eventId])

  const downloadCsv = () => {
    const headers = ['이메일', '이름', '등록일시']
    const rows = leads.map((l) => [l.email, l.name ?? '', l.created_at])
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${eventId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-gray-500">로딩 중...</div>
  if (error) return <div className="text-red-600">오류: {error}</div>

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-medium text-gray-900">등록자 ({leads.length}명)</h2>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={leads.length === 0}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          CSV 내보내기
        </button>
      </div>
      {leads.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">등록자가 없습니다.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {leads.map((l) => (
            <li key={l.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium text-gray-900">{l.email}</span>
                {l.name && <span className="ml-2 text-sm text-gray-500">{l.name}</span>}
              </div>
              <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString('ko-KR')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
