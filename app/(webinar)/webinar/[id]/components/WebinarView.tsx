'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClientSupabase } from '@/lib/supabase/client'
import YouTubePlayer from '@/components/webinar/YouTubePlayer'
import Chat from '@/components/webinar/Chat'
import QA from '@/components/webinar/QA'
import PresenceBar from '@/components/webinar/PresenceBar'
import FormWidget from '@/components/webinar/FormWidget'
import FileDownload from '@/components/webinar/FileDownload'
import GiveawayWidget from '@/components/webinar/GiveawayWidget'
import { usePresencePing } from '@/components/webinar/hooks/usePresencePing'
import { getOrCreateSessionId } from '@/lib/utils/session'
import { extractUTMParams } from '@/lib/utils/utm'
import type { BroadcastEnvelope } from '@/lib/webinar/realtime'
import { isValidBroadcastEnvelope } from '@/lib/webinar/realtime'

// 관리자 모드 접속자 리스트 컴포넌트
function AdminParticipantsList({ webinarId }: { webinarId: string }) {
  const [participants, setParticipants] = useState<Array<{
    userId: string
    displayName: string
    email: string | null
    role: string | null
    lastSeenAt: string
    joinedAt: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/webinars/${webinarId}/stats/access`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data?.currentParticipantList) {
            setParticipants(result.data.currentParticipantList)
          }
        }
      } catch (error) {
        console.error('접속자 목록 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchParticipants()
    // 5초마다 갱신
    const interval = setInterval(fetchParticipants, 5000)
    return () => clearInterval(interval)
  }, [webinarId])

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-center text-gray-500 py-8">접속 정보를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">현재 접속 중인 참여자</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">실시간</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-green-600">{participants.length}명</div>
      </div>
      
      {participants.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
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
              {participants.map((participant) => (
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
          현재 접속 중인 참여자가 없습니다.
        </div>
      )}
    </div>
  )
}

interface Webinar {
  id: string
  title: string
  slug?: string | null
  description?: string
  youtube_url: string
  start_time?: string
  end_time?: string
  is_public: boolean
  access_policy: string
  registration_campaign_id?: string | null
  clients?: {
    id: string
    name: string
    logo_url?: string
    brand_config?: any
  }
}

interface WebinarViewProps {
  webinar: Webinar
  isAdminMode?: boolean
}

/**
 * 웨비나 시청 페이지 메인 컴포넌트
 * 모듈화된 컴포넌트들을 조합하여 구성
 */
// 세션 데이터 (웨비나용)
const wertSessions = [
  {
    label: "SESSION 1",
    duration: "약 15분",
    title: "키워트 인사이트 소개",
    bullets: [
      "AI 특허리서치 '키워트 인사이트' 특징",
      "특허 특화 AI '플루토LM'의 차별점",
    ],
    speaker: {
      name: "조경식 이사",
      role: "워트인텔리전스\n그로스실",
      avatar: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/jo2.png",
    },
  },
  {
    label: "SESSION 2",
    duration: "약 30분",
    title: "고객사례로 알아보는 AI 특허리서치 활용법",
    bullets: [
      "IP·R&D·특허사무소별 키워트 인사이트 활용사례",
      "조직 간 커뮤니케이션 및 의사결정 개선 사례",
    ],
    speaker: {
      name: "조은비 책임",
      role: "워트인텔리전스\n그로스실",
      avatar: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/jo.png",
    },
  },
  {
    label: "SESSION 3",
    duration: "약 20분",
    title: "키워트 인사이트 바로 써보기",
    bullets: [
      "회원가입 및 기본 기능 안내",
      "실무에서 바로 쓰는 핵심 기능 소개",
    ],
    speaker: null,
  },
  {
    label: "SESSION 4",
    duration: "약 10분",
    title: "QnA",
    bullets: [
      "좋은 질문을 해주신 분들 중 추첨으로 선물을 드립니다.",
    ],
    note: "*아래 이벤트 항목 참고",
    speaker: null,
  },
]

export default function WebinarView({ webinar, isAdminMode = false }: WebinarViewProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'qa' | 'participants'>('chat')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [isSessionIntroExpanded, setIsSessionIntroExpanded] = useState(false) // 기본값: 접힘 (모바일만)
  const [isMobile, setIsMobile] = useState(false)
  
  // slug가 '149402'이거나 registration_campaign_id가 있으면 등록 페이지와 연동된 웨비나로 간주
  const isWertWebinar = webinar.slug === '149402' || !!webinar.registration_campaign_id
  const [openForms, setOpenForms] = useState<any[]>([])
  const [openGiveaways, setOpenGiveaways] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [popupContent, setPopupContent] = useState<{ type: 'form' | 'giveaway' | 'file'; id: string; title: string } | null>(null)
  const [shownPopups, setShownPopups] = useState<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)
  const previousItemsRef = useRef<{ forms: Map<string, string>; giveaways: Set<string>; files: Set<string> }>({
    forms: new Map(), // formId -> status 매핑으로 변경하여 상태 변경 추적
    giveaways: new Set(),
    files: new Set(),
  })
  const loadOpenItemsRef = useRef<(() => Promise<void>) | null>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const supabase = createClientSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 중복 로그인 방지: 세션 관리 (관리자 제외)
  const sessionKeyRef = useRef<string | null>(null)
  const sessionChannelRef = useRef<any>(null)
  const notifiedSessionsRef = useRef<Set<string>>(new Set()) // 이미 알림을 보낸 세션 추적
  
  // Chat 컴포넌트를 한 번만 렌더링하여 중복 구독 방지 (해결책.md 권장사항)
  const chatComponent = useMemo(() => (
    <Chat
      key={`chat-${webinar.id}`}
      webinarId={webinar.id}
      canSend={true}
      maxMessages={50}
      isAdminMode={isAdminMode}
    />
  ), [webinar.id, isAdminMode])
  
  // QA 컴포넌트를 한 번만 렌더링하여 중복 구독 방지
  const qaComponent = useMemo(() => (
    <QA
      key={`qa-${webinar.id}`}
      webinarId={webinar.id}
      canAsk={true}
      showOnlyMine={false}
      isAdminMode={isAdminMode}
    />
  ), [webinar.id, isAdminMode])
  
  useEffect(() => {
    setMounted(true)
    // 모바일 여부 확인
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Presence ping (접속 통계 수집)
  usePresencePing(webinar.id)
  
  // 세션 추적 (Live 페이지에서도 세션 ID 생성 및 추적)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const trackAccess = async () => {
      try {
        // 세션 ID 가져오기 또는 생성
        let sessionId = localStorage.getItem(`webinar_session_${webinar.id}`)
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
          localStorage.setItem(`webinar_session_${webinar.id}`, sessionId)
        }

        // 접속 기록 API 호출
        await fetch(`/api/webinars/${webinar.id}/access/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId }),
        })

        // 주기적으로 세션 갱신 (5분마다)
        intervalId = setInterval(async () => {
          try {
            await fetch(`/api/webinars/${webinar.id}/access/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ sessionId }),
            })
          } catch (error) {
            console.debug('[WebinarView] 세션 갱신 실패:', error)
          }
        }, 5 * 60 * 1000) // 5분
      } catch (error) {
        console.debug('[WebinarView] 접속 기록 실패:', error)
      }
    }

    trackAccess()

    // 퇴장 기록 함수
    const trackExit = async (sessionId: string) => {
      try {
        const exitData = JSON.stringify({ sessionId })
        const blob = new Blob([exitData], { type: 'application/json' })
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/webinars/${webinar.id}/access/exit`, blob)
        } else {
          await fetch(`/api/webinars/${webinar.id}/access/exit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: exitData,
            keepalive: true,
          })
        }
      } catch (error) {
        console.debug('[WebinarView] 퇴장 기록 실패:', error)
      }
    }

    // 페이지 언로드 시 퇴장 기록
    const handlePageHide = (e: PageTransitionEvent) => {
      // 페이지가 새로고침/탭 전환으로 숨겨질 때만 퇴장 기록
      // persisted가 true면 페이지가 bfcache에 저장된 것 (뒤로가기 등)
      if (!e.persisted) {
        const sessionId = localStorage.getItem(`webinar_session_${webinar.id}`)
        if (sessionId) {
          trackExit(sessionId)
        }
      }
    }

    window.addEventListener('pagehide', handlePageHide)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      window.removeEventListener('pagehide', handlePageHide)
      
      // 컴포넌트 언마운트 시 퇴장 기록
      const sessionId = localStorage.getItem(`webinar_session_${webinar.id}`)
      if (sessionId) {
        trackExit(sessionId)
      }
    }
  }, [webinar.id])
  
  // 중복 로그인 방지: 세션 관리 (관리자 제외)
  useEffect(() => {
    // 관리자는 중복 로그인 방지 제외
    if (isAdminMode) {
      return
    }
    
    let isActive = true
    let channel: any = null
    let checkInterval: NodeJS.Timeout | null = null
    
    const setupSessionManagement = async () => {
      try {
        // 현재 사용자 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          return
        }
        
        // 세션 키 생성 (페이지 진입 시 1회)
        if (!sessionKeyRef.current) {
          sessionKeyRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
        }
        const sessionKey = sessionKeyRef.current
        
        // 세션 관리 채널 생성 (presence 사용)
        const channelName = `session:webinar-${webinar.id}`
        channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: 'user',
            },
            broadcast: { self: false },
          },
        })
        
        // 다른 세션에서 충돌 알림을 받았을 때 처리
        channel.on('broadcast', { event: 'session_conflict' }, (payload: any) => {
          const { userId, newSessionKey } = payload.payload || payload
          
          // 자신의 user_id이고 자신의 세션이 아니면 충돌 (이전 세션)
          if (userId === user.id && newSessionKey !== sessionKey && isActive) {
            console.log('[WebinarView] 중복 로그인 감지: 다른 세션에서 접속했습니다.')
            
            // 이전 세션 종료 처리
            isActive = false
            
            // 사용자에게 알림
            alert('다른 기기 또는 브라우저에서 로그인하여 이 세션이 종료됩니다.')
            
            // 페이지 닫기 또는 로그아웃
            window.location.href = `/webinar/${webinar.slug || webinar.id}`
          }
        })
        
        // Presence sync 이벤트: 다른 세션 감지
        channel.on('presence', { event: 'sync' }, () => {
          if (!isActive) return
          
          checkForDuplicateSessions(user.id, sessionKey, channel)
        })
        
        // Presence join 이벤트: 새 세션 참가 감지
        channel.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
          if (!isActive) return
          
          // 잠시 후 체크 (presence state 업데이트 대기)
          setTimeout(() => {
            checkForDuplicateSessions(user.id, sessionKey, channel)
          }, 500)
        })
        
        // 구독 완료 후 현재 세션 등록
        channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED' && isActive) {
            // Presence track으로 현재 세션 등록
            await channel.track({
              userId: user.id,
              sessionKey: sessionKey,
              timestamp: Date.now(),
            })
            
            // 초기 체크 (다른 세션이 이미 있는지 확인)
            setTimeout(() => {
              checkForDuplicateSessions(user.id, sessionKey, channel)
            }, 1000)
            
            // 주기적으로 체크 (5초마다)
            checkInterval = setInterval(() => {
              if (isActive) {
                checkForDuplicateSessions(user.id, sessionKey, channel)
              }
            }, 5000)
          }
        })
        
        sessionChannelRef.current = channel
      } catch (error) {
        console.error('[WebinarView] 세션 관리 설정 오류:', error)
      }
    }
    
    // 중복 세션 체크 함수
    const checkForDuplicateSessions = (userId: string, currentSessionKey: string, ch: any) => {
      if (!isActive) return
      
      try {
        const presenceState = ch.presenceState()
        const allPresences = Object.values(presenceState).flat() as any[]
        
        // 같은 user_id의 다른 세션 찾기
        const otherSessions = allPresences.filter((presence: any) => {
          return presence.userId === userId && presence.sessionKey !== currentSessionKey
        })
        
        if (otherSessions.length > 0 && isActive) {
          // 아직 알림을 보내지 않은 새 세션만 필터링
          const newSessions = otherSessions.filter((otherSession: any) => {
            return !notifiedSessionsRef.current.has(otherSession.sessionKey)
          })
          
          if (newSessions.length > 0) {
            // 새로운 세션에만 종료 알림 전송
            console.log('[WebinarView] 다른 세션 발견, 이전 세션 종료 알림 전송:', newSessions.length, '개')
            
            newSessions.forEach((otherSession: any) => {
              // 알림 전송
              ch.send({
                type: 'broadcast',
                event: 'session_conflict',
                payload: {
                  userId: userId,
                  newSessionKey: currentSessionKey,
                  oldSessionKey: otherSession.sessionKey,
                  timestamp: Date.now(),
                },
              })
              
              // 알림 전송 기록
              notifiedSessionsRef.current.add(otherSession.sessionKey)
            })
          }
        }
      } catch (error) {
        console.error('[WebinarView] 중복 세션 체크 오류:', error)
      }
    }
    
    setupSessionManagement()
    
    // 정리 함수
    return () => {
      isActive = false
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      if (channel) {
        channel.untrack().then(() => {
          channel.unsubscribe()
          supabase.removeChannel(channel)
        }).catch((err: any) => {
          console.warn('[WebinarView] 세션 채널 정리 오류:', err)
        })
      }
    }
  }, [webinar.id, webinar.slug, isAdminMode, supabase])
  
  // Visit 수집 (웨비나 시청 페이지 진입 시 — 통계 시스템 연동)
  // Phase 0: Visit 커버리지 확보
  useEffect(() => {
    if (!webinar.id) return
    
    try {
      const sessionId = getOrCreateSessionId('ef_session_id', 30)
      
      // UTM 파라미터 추출
      const utmParams = extractUTMParams(searchParams)
      
      // 웨비나 ID 또는 registration_campaign_id로 Visit API 호출
      const campaignId = webinar.registration_campaign_id || webinar.id
      
      // cid 추출
      const cid = searchParams.get('cid')
      
      fetch(`/api/public/campaigns/${campaignId}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          utm_source: utmParams.utm_source ?? null,
          utm_medium: utmParams.utm_medium ?? null,
          utm_campaign: utmParams.utm_campaign ?? null,
          utm_term: utmParams.utm_term ?? null,
          utm_content: utmParams.utm_content ?? null,
          cid: cid ?? null,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      }).catch((error) => {
        // Visit 수집 실패는 무시 (graceful failure)
        console.warn('[WebinarView] Visit 수집 실패 (무시):', error)
      })
    } catch (error) {
      // Visit 수집 초기화 실패도 무시
      console.warn('[WebinarView] Visit 수집 초기화 실패 (무시):', error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 랜딩 1회 방문만 기록
  }, [webinar.id, webinar.registration_campaign_id])
  
  // 경품추첨 자동 참가 함수
  const autoEnterGiveaways = async (giveaways: any[]) => {
    const openGiveaways = giveaways.filter((g: any) => g.status === 'open')
    if (openGiveaways.length === 0) return

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 각 오픈된 추첨에 대해 자동 참가 시도
    for (const giveaway of openGiveaways) {
      try {
        const enterResponse = await fetch(
          `/api/webinars/${webinar.id}/giveaways/${giveaway.id}/enter`,
          {
            method: 'POST',
            credentials: 'include',
          }
        )
        
        if (enterResponse.ok) {
          console.log(`[WebinarView] 경품추첨 자동 참가 성공: ${giveaway.name || giveaway.id}`)
        } else if (enterResponse.status === 409) {
          // 이미 참가한 경우는 무시
          console.log(`[WebinarView] 경품추첨 이미 참가됨: ${giveaway.name || giveaway.id}`)
        } else {
          const errorResult = await enterResponse.json()
          console.warn(`[WebinarView] 경품추첨 자동 참가 실패: ${giveaway.name || giveaway.id}`, errorResult.error)
        }
      } catch (error) {
        console.warn(`[WebinarView] 경품추첨 자동 참가 오류: ${giveaway.name || giveaway.id}`, error)
      }
    }
  }

  // 오픈된 폼, 추첨, 파일 로드
  useEffect(() => {
    const loadOpenItems = async () => {
      try {
        // 오픈된 폼 조회
        let formsResponse: Response
        try {
          formsResponse = await fetch(
            `/api/webinars/${webinar.id}/forms?status=open`,
            {
              credentials: 'include', // 쿠키 포함
            }
          )
        } catch (fetchError: any) {
          // 네트워크 오류는 조용히 처리 (재시도될 예정)
          if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
            console.warn('네트워크 오류: 폼 조회 실패 (서버 연결 불가)')
            return
          }
          throw fetchError
        }
        
        const formsResult = await formsResponse.json()
        if (formsResponse.ok && formsResult.forms) {
          const loadedForms = formsResult.forms || []
          const currentFormsMap = new Map<string, string>(loadedForms.map((f: any) => [f.id, f.status]))
          
          // 삭제된 폼 찾기 (이전에 있었는데 지금은 없는 것)
          const deletedFormIds = Array.from(previousItemsRef.current.forms.keys())
            .filter((formId) => !currentFormsMap.has(formId))
          
          // 삭제된 폼을 previousItemsRef와 shownPopups에서 제거
          // 삭제된 폼이 다시 생성될 수 있으므로 shownPopups에서도 제거하여 팝업이 다시 뜨도록 함
          if (deletedFormIds.length > 0) {
            console.log('[WebinarView] 삭제된 폼 감지:', deletedFormIds)
            deletedFormIds.forEach((formId) => {
              previousItemsRef.current.forms.delete(formId)
            })
            setShownPopups((prev) => {
              const next = new Set(prev)
              deletedFormIds.forEach((formId) => {
                next.delete(`form-${formId}`)
              })
              return next
            })
          }
          
          // openForms 상태를 업데이트하여 UI가 즉시 반영되도록 함
          // 삭제된 폼은 loadedForms에 없으므로 자동으로 제거됨
          setOpenForms(loadedForms)
          console.log('[WebinarView] openForms 업데이트:', loadedForms.length, '개')
          
          // 새로 오픈된 폼 찾기 (이전에 없었거나 상태가 'open'으로 변경된 것)
          if (!isInitialLoadRef.current) {
            const newlyOpenedForms = loadedForms.filter((form: any) => {
              const previousStatus = previousItemsRef.current.forms.get(form.id)
              // 이전에 없었거나, 이전 상태가 'open'이 아니었는데 지금 'open'인 경우
              return form.status === 'open' && (
                !previousStatus || 
                (previousStatus !== 'open')
              )
            })
            
            if (newlyOpenedForms.length > 0) {
              console.log('[WebinarView] 새로 오픈된 폼 감지:', newlyOpenedForms.map((f: any) => ({ id: f.id, title: f.title || f.name })))
              // 모든 새로 오픈된 폼에 대해 팝업 표시 (마지막 것이 우선)
              // 여러 폼이 동시에 오픈되면 마지막 폼만 팝업으로 표시
              const newForm = newlyOpenedForms[newlyOpenedForms.length - 1]
              const popupKey = `form-${newForm.id}`
              
              // 설문이 오픈될 때마다 무조건 팝업 표시 (오픈-마감-다시 오픈 시에도 팝업이 뜨도록)
              const previousStatus = previousItemsRef.current.forms.get(newForm.id)
              const isNewForm = !previousStatus
              const wasReopened = previousStatus && previousStatus !== 'open'
              
              console.log('[WebinarView] 팝업 표시 조건:', { 
                popupKey, 
                isNewForm, 
                wasReopened, 
                previousStatus,
                formId: newForm.id 
              })
              
              // 설문이 오픈될 때마다 무조건 팝업 표시
              // shownPopups에 추가하고 팝업 표시
              setShownPopups((prev) => {
                const next = new Set(prev)
                next.add(popupKey)
                console.log('[WebinarView] shownPopups에 추가:', popupKey)
                return next
              })
              
              // 팝업 표시 (새 폼이거나 다시 오픈된 폼이면 무조건 팝업 표시)
              console.log('[WebinarView] 팝업 표시 실행:', { id: newForm.id, title: newForm.title || newForm.name })
              // 약간의 지연을 두어 상태 업데이트가 완료된 후 팝업 표시
              requestAnimationFrame(() => {
                setPopupContent({
                  type: 'form',
                  id: newForm.id,
                  title: newForm.title || newForm.name || '설문',
                })
              })
            }
            
            // 닫힌 폼은 shownPopups에서 제거하여 다시 오픈될 때 팝업이 뜨도록 함
            const closedForms = Array.from(previousItemsRef.current.forms.entries())
              .filter(([formId, status]) => {
                const currentForm = loadedForms.find((f: any) => f.id === formId)
                return status === 'open' && (!currentForm || currentForm.status !== 'open')
              })
            
            if (closedForms.length > 0) {
              console.log('[WebinarView] 닫힌 폼 감지:', closedForms.map(([formId]) => formId))
              setShownPopups((prev) => {
                const next = new Set(prev)
                closedForms.forEach(([formId]) => {
                  next.delete(`form-${formId}`)
                })
                return next
              })
            }
          }
          
          // previousItemsRef 업데이트 (openForms는 이미 위에서 업데이트됨)
          previousItemsRef.current.forms = currentFormsMap
        }

        // 오픈된 추첨 조회
        let giveawaysResponse: Response
        try {
          giveawaysResponse = await fetch(
            `/api/webinars/${webinar.id}/giveaways`,
            {
              credentials: 'include', // 쿠키 포함
            }
          )
        } catch (fetchError: any) {
          if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
            console.warn('네트워크 오류: 추첨 조회 실패 (서버 연결 불가)')
            return
          }
          throw fetchError
        }
        
        const giveawaysResult = await giveawaysResponse.json()
        if (giveawaysResponse.ok && giveawaysResult.giveaways) {
          const loadedGiveaways = giveawaysResult.giveaways.filter(
            (g: any) => g.status === 'open' || g.status === 'drawn'
          )
          const currentGiveawayIds = new Set<string>(loadedGiveaways.map((g: any) => g.id))
          
          // 오픈된 추첨(status === 'open')에 자동 참가
          await autoEnterGiveaways(loadedGiveaways)
          
          // 새로 오픈된 추첨 찾기 (이전에 없던 것)
          if (!isInitialLoadRef.current) {
            const newGiveaways = loadedGiveaways.filter((g: any) => !previousItemsRef.current.giveaways.has(g.id))
            if (newGiveaways.length > 0) {
              // 첫 번째 새 추첨만 팝업으로 표시
              const newGiveaway = newGiveaways[0]
              const popupKey = `giveaway-${newGiveaway.id}`
              setShownPopups((prev) => {
                const next = new Set(prev)
                next.add(popupKey)
                return next
              })
              setPopupContent({
                type: 'giveaway',
                id: newGiveaway.id,
                title: newGiveaway.name || newGiveaway.title,
              })
            }
          }
          
          setOpenGiveaways(loadedGiveaways)
          previousItemsRef.current.giveaways = currentGiveawayIds
        }

        // 파일 목록 조회
        let filesResponse: Response
        try {
          filesResponse = await fetch(
            `/api/webinars/${webinar.id}/files`,
            {
              credentials: 'include', // 쿠키 포함
            }
          )
        } catch (fetchError: any) {
          if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
            console.warn('네트워크 오류: 파일 조회 실패 (서버 연결 불가)')
            return
          }
          throw fetchError
        }
        
        const filesResult = await filesResponse.json()
        if (filesResponse.ok && filesResult.files) {
          const loadedFiles = filesResult.files
          const currentFileIds = new Set<string>(loadedFiles.map((f: any) => f.id))
          
          // 새로 업로드된 파일 찾기 (이전에 없던 것)
          if (!isInitialLoadRef.current) {
            const newFiles = loadedFiles.filter((file: any) => !previousItemsRef.current.files.has(file.id))
            if (newFiles.length > 0) {
              // 첫 번째 새 파일만 팝업으로 표시
              const newFile = newFiles[0]
              const popupKey = `file-${newFile.id}`
              setShownPopups((prev) => {
                const next = new Set(prev)
                next.add(popupKey)
                return next
              })
              setPopupContent({
                type: 'file',
                id: 'all',
                title: '발표자료',
              })
            }
          }
          
          setFiles(loadedFiles)
          previousItemsRef.current.files = currentFileIds
        }
        
        // 초기 로드 완료 표시
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false
        }
      } catch (error: any) {
        // 네트워크 오류가 아닌 다른 에러만 로깅
        if (!(error.name === 'TypeError' && error.message === 'Failed to fetch')) {
          console.error('오픈된 항목 로드 실패:', error)
        }
      }
    }

    // loadOpenItems 함수를 ref에 저장하여 다른 곳에서도 호출 가능하도록 함
    loadOpenItemsRef.current = loadOpenItems
    
    loadOpenItems()

    // 실시간 업데이트 구독
    const channel = supabase
      .channel(`webinar:${webinar.id}:participant-widgets`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms',
          filter: `webinar_id=eq.${webinar.id}`,
        },
        () => {
          loadOpenItems()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giveaways',
          filter: `webinar_id=eq.${webinar.id}`,
        },
        () => {
          loadOpenItems()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webinar_files',
          filter: `webinar_id=eq.${webinar.id}`,
        },
        () => {
          loadOpenItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [webinar.id, supabase])
  
  // Broadcast 이벤트 구독 (설문/퀴즈 오픈 시 팝업 표시)
  useEffect(() => {
    const broadcastChannel = supabase
      .channel(`webinar:${webinar.id}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'broadcast',
        { event: '*' },
        (payload: any) => {
          const env = (payload?.payload || payload) as BroadcastEnvelope | undefined
          
          if (!isValidBroadcastEnvelope(env)) {
            return
          }
          
          console.log('실시간 Broadcast 이벤트:', env.t, env)
          
          // 설문/퀴즈 오픈 이벤트 처리
          if (env.t === 'poll:open' || env.t === 'quiz:open') {
            const formData = env.payload as any
            if (formData && formData.id) {
              console.log('[WebinarView] 설문/퀴즈 오픈 이벤트 수신, 팝업 표시:', formData)
              const popupKey = `form-${formData.id}`
              
              // openForms 상태 즉시 업데이트 (버튼 활성화를 위해)
              setOpenForms((prev) => {
                // 이미 있는지 확인
                const exists = prev.find((f) => f.id === formData.id)
                if (exists) {
                  // 있으면 상태만 업데이트
                  return prev.map((f) => 
                    f.id === formData.id 
                      ? { ...f, status: 'open', ...formData }
                      : f
                  )
                } else {
                  // 없으면 추가
                  return [...prev, { ...formData, status: 'open' }]
                }
              })
              
              // previousItemsRef도 업데이트
              previousItemsRef.current.forms.set(formData.id, 'open')
              
              // shownPopups에 추가
              setShownPopups((prev) => {
                const next = new Set(prev)
                next.add(popupKey)
                return next
              })
              
              // 팝업 표시
              requestAnimationFrame(() => {
                setPopupContent({
                  type: 'form',
                  id: formData.id,
                  title: formData.title || formData.name || (env.t === 'quiz:open' ? '퀴즈' : '설문'),
                })
              })
              
              // openForms 상태도 업데이트 (loadOpenItems 호출로 전체 동기화)
              if (loadOpenItemsRef.current) {
                loadOpenItemsRef.current()
              }
            }
          }
          // 설문/퀴즈 마감 이벤트 처리
          else if (env.t === 'poll:close' || env.t === 'quiz:close') {
            const formData = env.payload as any
            if (formData && formData.id) {
              console.log('[WebinarView] 설문/퀴즈 마감 이벤트 수신:', formData)
              
              // openForms 상태 즉시 업데이트 (버튼 비활성화를 위해)
              setOpenForms((prev) => {
                return prev.filter((f) => f.id !== formData.id)
              })
              
              // previousItemsRef도 업데이트
              previousItemsRef.current.forms.set(formData.id, 'closed')
              
              // shownPopups에서 제거하여 다시 오픈될 때 팝업이 뜨도록 함
              setShownPopups((prev) => {
                const next = new Set(prev)
                next.delete(`form-${formData.id}`)
                return next
              })
              
              // 팝업이 열려있으면 닫기
              setPopupContent((prev) => {
                if (prev && prev.type === 'form' && prev.id === formData.id) {
                  return null
                }
                return prev
              })
              
              // 전체 동기화
              if (loadOpenItemsRef.current) {
                loadOpenItemsRef.current()
              }
            }
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(broadcastChannel)
    }
  }, [webinar.id, supabase])
  
  // 웨비나 등록 확인 및 자동 등록
  useEffect(() => {
    const registerForWebinar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        // 웨비나에 자동 등록
        try {
          const response = await fetch(`/api/webinars/${webinar.id}/register`, {
            method: 'POST',
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            // HTML 응답인 경우 (404 페이지 등) 간단히 로깅
            if (errorText.includes('<!DOCTYPE html>')) {
              console.warn('웨비나 등록 API 404:', `/api/webinars/${webinar.id}/register`)
            } else {
              console.error('웨비나 등록 실패:', response.status, errorText.substring(0, 200))
            }
          }
        } catch (fetchError) {
          console.error('웨비나 등록 요청 오류:', fetchError)
        }
      } catch (error) {
        console.error('웨비나 등록 오류:', error)
      }
    }
    
    registerForWebinar()
  }, [webinar.id, supabase])
  
  // 전체화면 진입
  const enterFullscreen = async () => {
    // 전체화면 요소를 먼저 표시
    setIsFullscreen(true)
    
    // 다음 프레임에서 전체화면 API 호출
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (!fullscreenRef.current) return
    
    try {
      if (fullscreenRef.current.requestFullscreen) {
        await fullscreenRef.current.requestFullscreen()
      } else if ((fullscreenRef.current as any).webkitRequestFullscreen) {
        await (fullscreenRef.current as any).webkitRequestFullscreen()
      } else if ((fullscreenRef.current as any).mozRequestFullScreen) {
        await (fullscreenRef.current as any).mozRequestFullScreen()
      } else if ((fullscreenRef.current as any).msRequestFullscreen) {
        await (fullscreenRef.current as any).msRequestFullscreen()
      }
    } catch (error) {
      console.error('전체화면 진입 실패:', error)
      // 폴백: 커스텀 전체화면은 이미 표시됨
    }
  }
  
  // 전체화면 종료
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
    } catch (error) {
      console.error('전체화면 종료 실패:', error)
    }
    setIsFullscreen(false)
  }
  
  // 전체화면 상태 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])
  
  // ESC 키로 전체화면 해제 및 팝업 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (popupContent) {
          setPopupContent(null)
        } else if (isFullscreen) {
          exitFullscreen()
        }
      }
    }
    
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFullscreen, popupContent])
  
  const fullscreenContent = isFullscreen && mounted ? (
    <div 
      ref={fullscreenRef}
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minWidth: '100vw',
        minHeight: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        backgroundColor: '#000',
        zIndex: 9999,
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* 닫기 버튼 */}
        <button
          onClick={exitFullscreen}
          className="absolute top-4 right-4 z-50 bg-black/70 hover:bg-black/90 text-white rounded-full p-3 transition-colors"
          aria-label="전체화면 종료"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* ESC 안내 */}
        <div className="absolute top-4 left-4 z-50 bg-black/70 text-white text-sm px-3 py-2 rounded-lg">
          ESC 키를 눌러 종료
        </div>
        
        {/* YouTube 플레이어 */}
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="relative w-full h-full" style={{ maxWidth: '100vw', maxHeight: '100vh', aspectRatio: '16/9' }}>
            <YouTubePlayer
              url={webinar.youtube_url}
              width="100%"
              height="100%"
              autoplay={false}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  ) : null
  
  return (
    <>
      {mounted && createPortal(fullscreenContent, document.body)}
      {/* 팝업 모달 */}
      {popupContent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // 배경 클릭 시 닫기
            if (e.target === e.currentTarget) {
              setPopupContent(null)
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 팝업 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{popupContent.title}</h3>
              <button
                onClick={() => setPopupContent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 팝업 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              {popupContent.type === 'form' && (
                <FormWidget
                  webinarId={webinar.id}
                  formId={popupContent.id}
                  onSubmitted={() => {
                    setPopupContent(null)
                    // 제출 후 목록에서 제거 (설문의 경우)
                    const form = openForms.find((f) => f.id === popupContent.id)
                    if (form?.kind === 'survey') {
                      setOpenForms((prev) => prev.filter((f) => f.id !== popupContent.id))
                    }
                  }}
                />
              )}
              {popupContent.type === 'giveaway' && (
                <GiveawayWidget
                  webinarId={webinar.id}
                  giveawayId={popupContent.id}
                />
              )}
              {popupContent.type === 'file' && (
                <FileDownload webinarId={webinar.id} canDelete={isAdminMode} />
              )}
            </div>
          </div>
        </div>
      )}
      {/* slug가 '149402'이거나 registration_campaign_id가 있으면 등록 페이지와 같은 톤앤매너 적용 */}
      {(isWertWebinar || webinar.slug === '149402') ? (
        <style jsx global>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
          
          html, body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            background-color: #fff !important;
            margin: 0;
            padding: 0;
          }
          
          #__next {
            background-color: #fff !important;
          }
        `}</style>
      ) : null}
      <div className={`min-h-screen w-full overflow-x-hidden ${
        isWertWebinar || webinar.slug === '149402'
          ? 'bg-white'
          : 'bg-gradient-to-br from-gray-50 to-blue-50'
      }`}>
      {/* 헤더 */}
      <header className={`border-b sticky top-0 z-40 w-full ${
        isWertWebinar
          ? 'bg-white/60 backdrop-blur-[2px] border-gray-200/50'
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              {/* registration_campaign_id가 있으면 로고 표시, 제목 숨김 */}
              {isWertWebinar ? (
                <div className="flex items-center">
                  <Image
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png"
                    alt="keywert Insight"
                    width={200}
                    height={25}
                    className="h-6 sm:h-8 lg:h-10 w-auto"
                    priority
                  />
                </div>
              ) : (
                <>
                  <h1 
                    onClick={() => router.push(`/webinar/${webinar.id}`)}
                    className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                    title="웨비나 입장 페이지로 이동"
                  >
                    {webinar.title}
                  </h1>
                  {webinar.description && (
                    <p className="text-xs lg:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-1">{webinar.description}</p>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4">
              {isAdminMode && (
                <Link
                  href={`/webinar/${webinar.id}/console`}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  운영 콘솔
                </Link>
              )}
              {webinar.clients?.logo_url && (
                <img 
                  src={webinar.clients.logo_url} 
                  alt={webinar.clients.name}
                  className="h-6 sm:h-8 lg:h-12 w-auto flex-shrink-0"
                />
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-6 w-full">
          {/* 메인 영역 - YouTube 플레이어 */}
          <div className="lg:col-span-2 space-y-2 sm:space-y-3 lg:space-y-4">
            {/* YouTube 플레이어 */}
            <div className={`bg-white overflow-hidden w-full relative group ${
              isWertWebinar 
                ? 'rounded-lg' 
                : 'rounded-lg sm:rounded-xl shadow-lg'
            }`}>
              <div className="relative w-full pb-[56.25%] bg-black">
                <div className="absolute top-0 left-0 w-full h-full">
                  <YouTubePlayer
                    url={webinar.youtube_url}
                    width="100%"
                    height="100%"
                    autoplay={true}
                    muted={true}
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              {/* 전체화면 버튼 (데스크톱만) */}
              <button
                onClick={enterFullscreen}
                className="hidden lg:flex absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white rounded-lg p-2 transition-all opacity-0 group-hover:opacity-100 z-10"
                aria-label="전체화면"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
            
            {/* 세션 소개 - 모바일에서도 표시 */}
            <div className={`bg-white p-4 sm:p-4 lg:p-6 ${
              isWertWebinar 
                ? 'rounded-lg border border-gray-200' 
                : 'rounded-lg sm:rounded-xl shadow-lg'
            }`}>
              <div
                onClick={() => setIsSessionIntroExpanded(!isSessionIntroExpanded)}
                className="w-full flex items-center justify-between mb-3 sm:mb-3 lg:mb-4 lg:hidden cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setIsSessionIntroExpanded(!isSessionIntroExpanded)
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-base font-semibold text-gray-900">세션 소개</h3>
                  {/* 설문 버튼 - 모바일 */}
                  {openForms.filter((f) => f.kind === 'survey' && f.status === 'open').length > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const survey = openForms.find((f) => f.kind === 'survey' && f.status === 'open')
                        if (survey) {
                          setPopupContent({
                            type: 'form',
                            id: survey.id,
                            title: survey.name || survey.title || '설문',
                          })
                        }
                      }}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      📝 설문
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-2 py-1 bg-gray-100 text-gray-400 rounded text-xs font-medium cursor-not-allowed"
                    >
                      📝 설문
                    </button>
                  )}
                  {/* 경품추첨 버튼 - 모바일 */}
                  {openGiveaways.filter((g) => g.status === 'open').length > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const giveaway = openGiveaways.find((g) => g.status === 'open')
                        if (giveaway) {
                          setPopupContent({
                            type: 'giveaway',
                            id: giveaway.id,
                            title: giveaway.name || giveaway.title || '경품추첨',
                          })
                        }
                      }}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors"
                    >
                      🎁 경품추첨
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-2 py-1 bg-gray-100 text-gray-400 rounded text-xs font-medium cursor-not-allowed"
                    >
                      🎁 경품추첨
                    </button>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isSessionIntroExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* PC: 제목과 설문/경품추첨 버튼 표시 */}
              <div className="hidden lg:flex lg:items-center lg:justify-between lg:mb-3 lg:mb-4">
                <h3 className="text-base sm:text-base lg:text-lg font-semibold text-gray-900">세션 소개</h3>
                <div className="flex items-center gap-2">
                  {/* 설문 버튼 - PC */}
                  {openForms.filter((f) => f.kind === 'survey' && f.status === 'open').length > 0 ? (
                    <button
                      onClick={() => {
                        const survey = openForms.find((f) => f.kind === 'survey' && f.status === 'open')
                        if (survey) {
                          setPopupContent({
                            type: 'form',
                            id: survey.id,
                            title: survey.name || survey.title || '설문',
                          })
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                      📝 설문
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      📝 설문
                    </button>
                  )}
                  {/* 경품추첨 버튼 - PC */}
                  {openGiveaways.filter((g) => g.status === 'open').length > 0 ? (
                    <button
                      onClick={() => {
                        const giveaway = openGiveaways.find((g) => g.status === 'open')
                        if (giveaway) {
                          setPopupContent({
                            type: 'giveaway',
                            id: giveaway.id,
                            title: giveaway.name || giveaway.title || '경품추첨',
                          })
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                    >
                      🎁 경품추첨
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      🎁 경품추첨
                    </button>
                  )}
                </div>
              </div>
              
              {/* registration_campaign_id가 있으면 세션 카드 표시 */}
              {isWertWebinar && (
                <>
                  {/* PC: 반응형 그리드 - 중간 화면에서는 2개, 큰 화면에서는 4개 표시 */}
                  <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4 mb-4">
                    {wertSessions.map((session, index) => (
                      <button
                        key={session.label}
                        onClick={() => setExpandedSession(expandedSession === session.label ? null : session.label)}
                        className="p-3 xl:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col items-start h-full"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      >
                        <div className="flex items-center gap-1.5 xl:gap-2 mb-2 flex-wrap">
                          <div className="px-2 py-1 bg-teal-500 rounded-lg flex-shrink-0">
                            <span className="text-white font-bold text-xs">{session.label}</span>
                          </div>
                          <div className="px-2 py-1 bg-teal-500/10 rounded-lg flex-shrink-0">
                            <span className="text-teal-500 font-bold text-xs">{session.duration}</span>
                          </div>
                        </div>
                        <h4 className="text-xs xl:text-sm font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">{session.title}</h4>
                        {/* SESSION 4일 때 스타벅스 기프티콘 정보 표시 - PC 카드 */}
                        {session.label === "SESSION 4" && (
                          <div className="mt-2 mb-2 w-full">
                            <div className="bg-teal-500 rounded-lg p-1.5 flex flex-row justify-start items-center gap-1.5 min-h-[2rem]">
                              <div className="text-white font-bold text-[10px] xl:text-xs leading-tight text-left flex-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                                스타벅스 기프티콘 증정
                              </div>
                              <Image
                                src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image_2.png"
                                alt="스타벅스 커피"
                                width={16}
                                height={16}
                                className="w-4 h-4 xl:w-5 xl:h-5 object-contain flex-shrink-0"
                              />
                            </div>
                          </div>
                        )}
                        {session.speaker && (
                          <div className="mt-auto pt-3 border-t border-gray-200 w-full">
                            <div className="text-xs font-semibold text-gray-900 truncate">{session.speaker.name}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-1">{session.speaker.role.split('\n')[0]}</div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 모바일: 기존 세로 배치 - 접기/펼치기 적용 */}
                  {(isSessionIntroExpanded || !isMobile) && (
                  <div className="lg:hidden space-y-4">
                    {wertSessions.map((session, index) => (
                      <div 
                        key={session.label}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="px-3 py-1 bg-teal-500 rounded-lg">
                            <span className="text-white font-bold text-sm">{session.label}</span>
                          </div>
                          <div className="px-3 py-1 bg-teal-500/10 rounded-lg">
                            <span className="text-teal-500 font-bold text-sm">{session.duration}</span>
                          </div>
                        </div>
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3">{session.title}</h4>
                        <ul className="space-y-2 mb-3">
                          {session.bullets.map((bullet, bulletIndex) => {
                            const isMultiLine = bullet.includes('\n')
                            const parts = bullet.split('\n')
                            return (
                              <li key={bulletIndex} className="flex items-start gap-2">
                                <Image
                                  src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/check_icon.png"
                                  alt="check"
                                  width={20}
                                  height={20}
                                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                                />
                                <div className="flex-1">
                                  {isMultiLine ? (
                                    parts.map((part, partIndex) => (
                                      <div key={partIndex} className="text-sm sm:text-base text-gray-700">
                                        {partIndex > 0 && <br />}
                                        {part}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm sm:text-base text-gray-700">{bullet}</div>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                        {session.note && (
                          <p className="text-xs text-gray-500 mt-2">{session.note}</p>
                        )}
                        {/* SESSION 4일 때 스타벅스 기프티콘 정보 표시 - 모바일 */}
                        {session.label === "SESSION 4" && (
                          <div className="mt-4">
                            <div className="bg-teal-500 rounded-lg p-2 sm:p-2.5 flex flex-row justify-start items-center gap-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
                              <div className="text-white font-bold text-xs sm:text-sm leading-tight text-left flex-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                                스타벅스 아메리카노 Tall 기프티콘 증정
                              </div>
                              <Image
                                src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image_2.png"
                                alt="스타벅스 커피"
                                width={24}
                                height={24}
                                className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                              />
                            </div>
                          </div>
                        )}
                        {session.speaker && (
                          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
                            <div className="w-16 h-16 relative flex-shrink-0">
                              <Image
                                src={session.speaker.avatar}
                                alt={session.speaker.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 whitespace-pre-line mb-1">{session.speaker.role}</div>
                              <div className="text-sm font-bold text-gray-900">{session.speaker.name}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )}

                  {/* PC: 세션 상세 모달 */}
                  {expandedSession && mounted && createPortal(
                    <div 
                      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                      onClick={() => setExpandedSession(null)}
                    >
                      <div 
                        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      >
                        {wertSessions.find(s => s.label === expandedSession) && (() => {
                          const session = wertSessions.find(s => s.label === expandedSession)!
                          return (
                            <>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="px-3 py-1 bg-teal-500 rounded-lg">
                                    <span className="text-white font-bold text-sm">{session.label}</span>
                                  </div>
                                  <div className="px-3 py-1 bg-teal-500/10 rounded-lg">
                                    <span className="text-teal-500 font-bold text-sm">{session.duration}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setExpandedSession(null)}
                                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                  ×
                                </button>
                              </div>
                              <h4 className="text-xl font-bold text-gray-900 mb-4">{session.title}</h4>
                              <ul className="space-y-3 mb-4">
                                {session.bullets.map((bullet, bulletIndex) => {
                                  const isMultiLine = bullet.includes('\n')
                                  const parts = bullet.split('\n')
                                  return (
                                    <li key={bulletIndex} className="flex items-start gap-2">
                                      <Image
                                        src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/check_icon.png"
                                        alt="check"
                                        width={20}
                                        height={20}
                                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        {isMultiLine ? (
                                          parts.map((part, partIndex) => (
                                            <div key={partIndex} className="text-base text-gray-700">
                                              {partIndex > 0 && <br />}
                                              {part}
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-base text-gray-700">{bullet}</div>
                                        )}
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                              {session.note && (
                                <p className="text-sm text-gray-500 mt-4">{session.note}</p>
                              )}
                              {/* SESSION 4일 때 스타벅스 기프티콘 정보 표시 */}
                              {session.label === "SESSION 4" && (
                                <div className="mt-4">
                                  <div className="bg-teal-500 rounded-lg p-2.5 sm:p-3 flex flex-row justify-start items-center gap-2.5 sm:gap-3 min-h-[3rem] sm:min-h-[3.5rem]">
                                    <div className="text-white font-bold text-sm sm:text-base leading-tight text-left flex-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                                      스타벅스 아메리카노 Tall 기프티콘 증정
                                    </div>
                                    <Image
                                      src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image_2.png"
                                      alt="스타벅스 커피"
                                      width={28}
                                      height={28}
                                      className="w-6 h-6 sm:w-7 sm:h-7 object-contain flex-shrink-0"
                                    />
                                  </div>
                                </div>
                              )}
                              {session.speaker && (
                                <div className="mt-6 pt-6 border-t border-gray-200 flex items-center gap-4">
                                  <div className="w-20 h-20 relative flex-shrink-0">
                                    <Image
                                      src={session.speaker.avatar}
                                      alt={session.speaker.name}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-600 whitespace-pre-line mb-1">{session.speaker.role}</div>
                                    <div className="text-base font-bold text-gray-900">{session.speaker.name}</div>
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>,
                    document.body
                  )}
                </>
              )}
              
              {/* isWertWebinar가 아닐 때 세션 소개 표시 */}
              {!isWertWebinar && (
                <>
                  {/* 모바일에서만 접기/펼치기 적용, PC는 항상 표시 */}
                  {(isSessionIntroExpanded || !isMobile) && (
                  <>
                  {webinar.description ? (
                    <div className="text-xs sm:text-sm text-gray-700 whitespace-pre-line">
                      {(() => {
                        const cleanDescription = webinar.description.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                        const urlRegex = /(https?:\/\/[^\s]+)/g
                        const parts: string[] = []
                        let lastIndex = 0
                        let match
                        
                        while ((match = urlRegex.exec(cleanDescription)) !== null) {
                          // URL 이전 텍스트 추가
                          if (match.index > lastIndex) {
                            parts.push(cleanDescription.substring(lastIndex, match.index))
                          }
                          // URL 추가
                          parts.push(`__URL__${match[0]}__URL__`)
                          lastIndex = match.index + match[0].length
                        }
                        
                        // 마지막 텍스트 추가
                        if (lastIndex < cleanDescription.length) {
                          parts.push(cleanDescription.substring(lastIndex))
                        }
                        
                        // URL이 없으면 원본 반환
                        if (parts.length === 0) {
                          parts.push(cleanDescription)
                        }
                        
                        return parts.map((part, index) => {
                          if (part.startsWith('__URL__') && part.endsWith('__URL__')) {
                            const url = part.replace(/^__URL__|__URL__$/g, '')
                            return (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                              >
                                {url}
                              </a>
                            )
                          }
                          return <span key={index}>{part}</span>
                        })
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 italic">세션 소개가 없습니다.</p>
                  )}
                  {webinar.start_time && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">시작: {new Date(webinar.start_time).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {webinar.end_time && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">종료: {new Date(webinar.end_time).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 설문/퀴즈/발표자료/추첨 버튼 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {openForms.filter((f) => f.kind === 'survey' && f.status === 'open').length > 0 && (
                        <button
                          onClick={() => {
                            const survey = openForms.find((f) => f.kind === 'survey' && f.status === 'open')
                            if (survey) {
                              setPopupContent({
                                type: 'form',
                                id: survey.id,
                                title: survey.name || survey.title || '설문',
                              })
                            }
                          }}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                        >
                          📝 설문
                          {openForms.filter((f) => f.kind === 'survey' && f.status === 'open').length > 1 && (
                            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {openForms.filter((f) => f.kind === 'survey' && f.status === 'open').length}
                            </span>
                          )}
                        </button>
                      )}
                      {openForms.filter((f) => f.kind === 'quiz' && f.status === 'open').length > 0 && (
                        <button
                          onClick={() => {
                            const quiz = openForms.find((f) => f.kind === 'quiz' && f.status === 'open')
                            if (quiz) {
                              setPopupContent({
                                type: 'form',
                                id: quiz.id,
                                title: quiz.name || quiz.title || '퀴즈',
                              })
                            }
                          }}
                          className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                        >
                          🎯 퀴즈
                          {openForms.filter((f) => f.kind === 'quiz' && f.status === 'open').length > 1 && (
                            <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {openForms.filter((f) => f.kind === 'quiz' && f.status === 'open').length}
                            </span>
                          )}
                        </button>
                      )}
                      {files.length > 0 && (
                        <button
                          onClick={() => {
                            const file = files[0]
                            if (file) {
                              setPopupContent({
                                type: 'file',
                                id: file.id,
                                title: file.name || file.title || '발표자료',
                              })
                            }
                          }}
                          className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                        >
                          📎 발표자료
                          {files.length > 1 && (
                            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {files.length}
                            </span>
                          )}
                        </button>
                      )}
                      {openGiveaways.length > 0 && (
                        <button
                          onClick={() => {
                            const giveaway = openGiveaways[0]
                            if (giveaway) {
                              setPopupContent({
                                type: 'giveaway',
                                id: giveaway.id,
                                title: giveaway.name || giveaway.title || '추첨',
                              })
                            }
                          }}
                          className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                        >
                          🎁 추첨
                          {openGiveaways.length > 1 && (
                            <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {openGiveaways.length}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  </>
                  )}
                </>
              )}
            </div>
            
            {/* Presence Bar - 관리자만 표시 */}
            {isAdminMode && (
              <PresenceBar
                webinarId={webinar.id}
                showTyping={true}
                className="text-xs sm:text-sm"
              />
            )}

            
            {/* 모바일 채팅/Q&A - 영상 아래 순서대로 */}
            <div className="lg:hidden">
              <div className={`bg-white overflow-hidden h-[50vh] min-h-[350px] max-h-[500px] flex flex-col ${
                isWertWebinar 
                  ? 'rounded-lg border border-gray-200' 
                  : 'rounded-lg sm:rounded-xl shadow-lg'
              }`}>
                {/* 탭 */}
                <div className="border-b border-gray-200 flex flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === 'chat'
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    💬 채팅
                  </button>
                  <button
                    onClick={() => setActiveTab('qa')}
                    className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === 'qa'
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    ❓ Q&A
                  </button>
                  {/* 관리자 모드일 때만 모바일에서도 접속중 탭 표시 */}
                  {isAdminMode && (
                    <button
                      onClick={() => setActiveTab('participants')}
                      className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                        activeTab === 'participants'
                          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600'
                      }`}
                    >
                      👥 접속중
                    </button>
                  )}
                </div>
                
                {/* 탭 컨텐츠 - 모바일 전용 (단일 인스턴스 사용) */}
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'chat' ? chatComponent : activeTab === 'qa' ? qaComponent : activeTab === 'participants' ? (
                    <AdminParticipantsList webinarId={webinar.id} />
                  ) : chatComponent}
                </div>
              </div>
            </div>
          </div>
          
          {/* 사이드바 - 채팅/Q&A (데스크톱) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className={`bg-white overflow-hidden h-[calc(100vh-200px)] flex flex-col w-full max-w-[400px] ${
              isWertWebinar 
                ? 'rounded-lg border border-gray-200' 
                : 'rounded-xl shadow-lg'
            }`}>
              {/* 탭 */}
              <div className="border-b border-gray-200 flex">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💬 채팅
                </button>
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'qa'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ❓ Q&A
                </button>
                {isAdminMode && (
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'participants'
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    👥 접속중
                  </button>
                )}
              </div>
              
              {/* 탭 컨텐츠 - 데스크톱 전용 (단일 인스턴스 사용) */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' ? chatComponent : activeTab === 'qa' ? qaComponent : activeTab === 'participants' ? (
                  <AdminParticipantsList webinarId={webinar.id} />
                ) : (
                  <div className="h-full overflow-y-auto p-4">
                    <PresenceBar
                      webinarId={webinar.id}
                      showTyping={true}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

