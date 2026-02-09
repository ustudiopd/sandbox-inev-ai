'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  BarChart3, 
  UserPlus, 
  Megaphone, 
  FileText, 
  Mail, 
  Video, 
  Settings,
  ExternalLink,
  Download,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import EventUTMLinksTab from './components/EventUTMLinksTab'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'registration' | 'marketing' | 'survey' | 'email' | 'webinar' | 'settings'>('overview')

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
    <div className="bg-white min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-4">
          <div className="mb-6">
        <Link
          href={`/inev-admin/clients/${clientId}/events`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          이벤트 목록
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{event.slug}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">코드: {event.code}</p>
          </div>
          <Link
            href={`/event/${event.slug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            공개 페이지 보기
          </Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('registration')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'registration' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Registration
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('marketing')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'marketing' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Marketing
        </button>
        {module_survey && (
          <button
            type="button"
            onClick={() => setActiveTab('survey')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'survey' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Survey
          </button>
        )}
        {module_email && (
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'email' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        )}
        {module_webinar && (
          <button
            type="button"
            onClick={() => setActiveTab('webinar')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'webinar' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Video className="w-4 h-4" />
            Webinar
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          설정
        </button>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab eventId={eventId} />
      )}

      {activeTab === 'registration' && (
        <RegistrationTab eventId={eventId} activeTab={activeTab} />
      )}

      {activeTab === 'marketing' && (
        <MarketingTab eventId={eventId} activeTab={activeTab} />
      )}

      {activeTab === 'survey' && (
        <SurveyResponsesTab eventId={eventId} activeTab={activeTab} />
      )}

      {activeTab === 'email' && (
        <EmailTab eventId={eventId} />
      )}

      {activeTab === 'webinar' && (
        <WebinarTab eventId={eventId} clientId={clientId} event={event} />
      )}

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
        </div>
      </div>
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


type SurveyRow = { id: string; lead_id: string | null; email: string | null; response: Record<string, unknown>; created_at: string }

// Phase 10: Survey Tab (탭 클릭 시에만 API 호출)
function SurveyResponsesTab({ eventId, activeTab }: { eventId: string; activeTab: string }) {
  const [rows, setRows] = useState<SurveyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/inev/events/${eventId}/survey-responses`)
      const result = await response.json()
      if (result.error) setError(result.error)
      else setRows(Array.isArray(result) ? result : [])
      setHasLoaded(true)
    } catch (e: any) {
      setError(e.message || '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  // 탭이 활성화되면 자동으로 로드 (탭 클릭 시에만)
  useEffect(() => {
    if (activeTab === 'survey' && !hasLoaded) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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

// Phase 10: Overview Tab (가벼운 KPI)
function OverviewTab({ eventId }: { eventId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    fetch(`/api/inev/events/${eventId}/statistics/overview`)
      .then((r) => r.json())
      .then((result) => {
        if (result.error) setError(result.error)
        else setData(result)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) return <div className="text-gray-500">로딩 중...</div>
  if (error) return <div className="text-red-600">오류: {error}</div>
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-green-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">등록자</div>
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UserPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {data.leads.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            고유: {data.leads.unique_emails.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Visit</div>
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {data.visits.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">ShortLink 클릭</div>
            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Megaphone className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {data.shortlink_clicks.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-teal-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">설문 응답</div>
            <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
            {data.survey_responses.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">참여자</div>
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {data.participations.total.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Phase 10: Registration Tab (탭 클릭 시에만 API 호출)
function RegistrationTab({ eventId, activeTab }: { eventId: string; activeTab: string }) {
  const [data, setData] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      // 통계와 리스트를 병렬로 조회
      const [stats, leadsList] = await Promise.all([
        fetch(`/api/inev/events/${eventId}/statistics/registration`).then(r => r.json()),
        fetch(`/api/inev/events/${eventId}/leads`).then(r => r.json()),
      ])
      
      if (stats.error) setError(stats.error)
      else setData(stats)
      
      if (Array.isArray(leadsList)) {
        setLeads(leadsList)
      } else if (leadsList.error) {
        console.error('Leads 조회 오류:', leadsList.error)
      }
      
      setHasLoaded(true)
    } catch (e: any) {
      setError(e.message || '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  // 탭이 활성화되면 자동으로 로드 (탭 클릭 시에만)
  useEffect(() => {
    if (activeTab === 'registration' && !hasLoaded) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-green-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">등록자 수</div>
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {data.leads.total.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              고유 이메일: {data.leads.unique_emails.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">참여자 수</div>
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {data.participations.total.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">전환율</div>
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {(data.conversion_rate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}
      
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-medium text-gray-900">등록자 목록 ({leads.length}명)</h2>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={leads.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
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
                <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Phase 10: Marketing Tab (탭 클릭 시에만 API 호출)
function MarketingTab({ eventId, activeTab }: { eventId: string; activeTab: string }) {
  const [subTab, setSubTab] = useState<'stats' | 'links'>('links')
  const [groupBy, setGroupBy] = useState<'utm_source' | 'utm_medium' | 'utm_campaign'>('utm_source')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/inev/events/${eventId}/statistics/marketing?groupBy=${groupBy}`)
      const result = await response.json()
      if (result.error) setError(result.error)
      else setData(result)
      setHasLoaded(true)
    } catch (e: any) {
      setError(e.message || '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  // 탭이 활성화되면 자동으로 로드 (탭 클릭 시에만)
  useEffect(() => {
    if (activeTab === 'marketing' && !hasLoaded && subTab === 'stats') {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, subTab])

  // groupBy 변경 시 재로드
  useEffect(() => {
    if (hasLoaded && groupBy && subTab === 'stats') {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, subTab])

  return (
    <div className="space-y-4">
      {/* 서브 탭 메뉴 */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setSubTab('links')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            subTab === 'links'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          UTM 링크 관리
        </button>
        <button
          type="button"
          onClick={() => setSubTab('stats')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            subTab === 'stats'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Marketing 통계
        </button>
      </div>

      {/* UTM 링크 관리 탭 */}
      {subTab === 'links' && (
        <EventUTMLinksTab eventId={eventId} />
      )}

      {/* Marketing 통계 탭 */}
      {subTab === 'stats' && (
        <>
          {loading && <div className="text-gray-500">로딩 중...</div>}
          {error && <div className="text-red-600">오류: {error}</div>}
          {!loading && !error && data && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">집계 기준:</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="utm_source">UTM Source</option>
                  <option value="utm_medium">UTM Medium</option>
                  <option value="utm_campaign">UTM Campaign</option>
                </select>
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  새로고침
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-medium text-gray-900">Marketing 통계 ({groupBy})</h2>
                </div>
                {data.breakdown && data.breakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">키</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Visits</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Leads</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">전환율</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.breakdown.map((item: any) => (
                          <tr key={item.key}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.key}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.visits.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.leads.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{(item.conversions * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">데이터가 없습니다.</div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// Phase 10: Webinar Tab (요약 + 링크만)
function WebinarTab({ eventId, clientId, event }: { eventId: string; clientId: string; event: EventDetail }) {
  // Phase 10 원칙: Webinar 탭은 "요약 + 링크"만 제공, 상세 통계는 별도 페이지
  // 웨비나 ID 조회 (event_id로 연결된 webinar, 있으면 요약 KPI 표시)
  const [webinar, setWebinar] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    // event_id로 연결된 webinar 조회 (Phase 6에서 webinars.event_id 추가됨)
    fetch(`/api/inev/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        // webinar 조회는 별도로 처리 (현재는 링크만 제공)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [eventId])

  if (loading) return <div className="text-gray-500">로딩 중...</div>

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          웨비나 상세 통계는 별도 페이지에서 조회합니다. 아래 링크를 사용하세요.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={`/webinar/${event.slug}/console`}
          target="_blank"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🎛️ 운영 콘솔 열기</h3>
          <p className="text-sm text-gray-600">웨비나 실시간 운영 콘솔로 이동합니다.</p>
        </Link>
        
        <Link
          href={`/webinar/${event.slug}/stats`}
          target="_blank"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 웨비나 통계 보기</h3>
          <p className="text-sm text-gray-600">웨비나 상세 통계 페이지로 이동합니다.</p>
        </Link>
      </div>
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
