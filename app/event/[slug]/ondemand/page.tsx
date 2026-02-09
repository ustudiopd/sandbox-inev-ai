'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import YouTubePlayer from '@/components/media/YouTubePlayer'
import VimeoPlayer from '@/components/media/VimeoPlayer'
import { VisitLogger } from '../VisitLogger'
import { getOrCreateSessionId } from '@/lib/utils/session'

// Supabase Storage URL
const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbkivxdlebdtfudexbga.supabase.co';
const WERT_IMAGE_BASE = `${SUPABASE_STORAGE_URL}/storage/v1/object/public/webinar-thumbnails/wert`;

// 세션 데이터 (185044 이벤트용)
const sessions = [
  {
    label: "SESSION 1",
    duration: "약 15분",
    title: "키워트 인사이트 소개",
    titleMobile: "키워트 인사이트 소개",
    bullets: [
      "AI 특허리서치 '키워트 인사이트' 특징",
      "특허 특화 AI '플루토LM'의 차별점",
    ],
    speaker: {
      name: "조경식 이사",
      role: "워트인텔리전스\n그로스실",
      avatar: `${WERT_IMAGE_BASE}/jo2.png`,
    },
  },
  {
    label: "SESSION 2",
    duration: "약 30분",
    title: "고객사례로 알아보는 AI 특허리서치 활용법",
    titleMobile: "고객사례로 알아보는\nAI 특허리서치 활용법",
    bullets: [
      "IP·R&D·특허사무소별 키워트 인사이트 활용사례",
      "조직 간 커뮤니케이션 및 의사결정 개선 사례",
    ],
    speaker: {
      name: "조은비 책임",
      role: "워트인텔리전스\n그로스실",
      avatar: `${WERT_IMAGE_BASE}/jo.png`,
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
];

/**
 * 이벤트 기반 온디맨드 시청 페이지
 * 149402 웨비나 시청 페이지 레이아웃과 동일
 * 플레이어 위, 세션 소개 카드 아래, 채팅/QnA 없음
 */
export default function EventOnDemandPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoType, setVideoType] = useState<'youtube' | 'vimeo' | null>(null)
  const [vimeoVideoId, setVimeoVideoId] = useState<string | null>(null)
  const [vimeoHash, setVimeoHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSessionIntroExpanded, setIsSessionIntroExpanded] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [playbackSessionId, setPlaybackSessionId] = useState<string | null>(null)
  
  // Heartbeat 관련 상태
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastHeartbeatTimeRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const playerRef = useRef<any>(null)  // YouTube/Vimeo 플레이어 인스턴스
  const videoTypeRef = useRef<'youtube' | 'vimeo' | null>(null)

  // Vimeo URL 파싱 함수
  const parseVimeoUrl = (url: string): { videoId: string; hash: string | null } | null => {
    // https://vimeo.com/1163120176/455cc52d70 형식
    const vimeoRegex = /vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/
    const match = url.match(vimeoRegex)
    if (match) {
      return {
        videoId: match[1],
        hash: match[2] || null
      }
    }
    return null
  }

  useEffect(() => {
    // 이벤트 정보 조회하여 비디오 URL 가져오기
    const loadEvent = async () => {
      try {
        const response = await fetch(`/api/inev/events/by-slug?slug=${slug}`)
        if (!response.ok) {
          throw new Error('이벤트를 찾을 수 없습니다')
        }
        const event = await response.json()
        setEventId(event.id)
        
        // 이벤트 설정에서 비디오 URL 가져오기 (Vimeo 우선)
        const vimeoUrl = event.settings?.ondemand?.vimeo_url
        const youtubeUrl = event.settings?.ondemand?.youtube_url
        
        if (vimeoUrl) {
          // Vimeo URL 파싱
          const vimeoData = parseVimeoUrl(vimeoUrl)
          if (vimeoData) {
            setVideoType('vimeo')
            videoTypeRef.current = 'vimeo'
            setVimeoVideoId(vimeoData.videoId)
            setVimeoHash(vimeoData.hash)
          }
        } else if (youtubeUrl && !youtubeUrl.includes('YOUR_VIDEO_ID_HERE')) {
          // YouTube URL (유효한 URL인 경우만)
          setVideoType('youtube')
          videoTypeRef.current = 'youtube'
          setVideoUrl(youtubeUrl)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('이벤트 로드 오류:', error)
        setLoading(false)
      }
    }

    if (slug) {
      loadEvent()
    }
  }, [slug])

  // 세션 시작 및 Heartbeat 관리
  useEffect(() => {
    if (!eventId || loading) return

    const sessionId = getOrCreateSessionId('ef_session_id', 30 * 24 * 60)  // D-OD-10: 30일 TTL

    // 세션 시작
    const startSession = async () => {
      try {
        const response = await fetch(`/api/inev/events/${eventId}/ondemand/sessions/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setPlaybackSessionId(data.playback_session_id)
        }
      } catch (error) {
        console.error('[OnDemandSession] Start error:', error)
      }
    }

    startSession()

    // Heartbeat 설정 (D-OD-4, D-OD-7)
    const HEARTBEAT_INTERVAL = 45 * 1000  // 45초
    const HEARTBEAT_CAP = 120 * 1000  // 120초 cap
    const HEARTBEAT_THROTTLE = 30 * 1000  // 30초 throttle

    const sendHeartbeat = async () => {
      // Visibility 체크: hidden이면 스킵
      if (document.visibilityState === 'hidden') {
        return
      }

      // Throttle 체크
      const now = Date.now()
      if (now - lastHeartbeatTimeRef.current < HEARTBEAT_THROTTLE) {
        return
      }

      // 재생 상태 확인 (D-OD-4)
      // 플레이어 API를 통해 정확한 재생 상태 확인 시도
      let isPlaying = isPlayingRef.current
      
      // 플레이어 API가 있으면 실제 상태 확인
      if (playerRef.current) {
        try {
          if (videoTypeRef.current === 'youtube' && window.YT && typeof playerRef.current.getPlayerState === 'function') {
            // YouTube 플레이어 상태 확인
            const playerState = playerRef.current.getPlayerState()
            if (playerState !== undefined) {
              isPlaying = playerState === window.YT.PlayerState.PLAYING
            }
          } else if (videoTypeRef.current === 'vimeo' && window.Vimeo && typeof playerRef.current.getPaused === 'function') {
            // Vimeo 플레이어 상태 확인 (비동기)
            try {
              const paused = await playerRef.current.getPaused()
              isPlaying = !paused
            } catch (e) {
              // 비동기 호출 실패 시 ref 값 사용
            }
          }
        } catch (e) {
          // API 호출 실패 시 ref 값 사용
        }
      }

      const deltaTime = now - lastHeartbeatTimeRef.current
      const cappedDelta = Math.min(deltaTime, HEARTBEAT_CAP)

      try {
        await fetch(`/api/inev/events/${eventId}/ondemand/sessions/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            delta_seconds: Math.floor(cappedDelta / 1000),
            is_playing: isPlaying,  // D-OD-4
          }),
        })
      } catch (error) {
        // 실패해도 무시 (graceful failure)
      }

      lastHeartbeatTimeRef.current = now
    }

    // 첫 heartbeat는 즉시 전송
    sendHeartbeat()

    // 이후 주기적으로 전송
    heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)

    // 페이지 종료 시 세션 종료 (best-effort)
    const handleBeforeUnload = () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }

      // navigator.sendBeacon 사용
      navigator.sendBeacon(
        `/api/inev/events/${eventId}/ondemand/sessions/end`,
        JSON.stringify({ session_id: sessionId })
      )
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
    }
  }, [eventId, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!videoType || (videoType === 'youtube' && !videoUrl) || (videoType === 'vimeo' && !vimeoVideoId)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-lg">영상을 찾을 수 없습니다.</div>
      </div>
    )
  }

  // UTM 파라미터 추출
  const utmSource = searchParams?.get('utm_source') || undefined
  const utmMedium = searchParams?.get('utm_medium') || undefined
  const utmCampaign = searchParams?.get('utm_campaign') || undefined
  const utmTerm = searchParams?.get('utm_term') || undefined
  const utmContent = searchParams?.get('utm_content') || undefined

  return (
    <div className="min-h-screen bg-white">
      {/* Visit 수집 */}
      {slug && (
        <VisitLogger
          slug={slug}
          path={`/event/${slug}/ondemand`}
          utm_source={utmSource}
          utm_medium={utmMedium}
          utm_campaign={utmCampaign}
          utm_term={utmTerm}
          utm_content={utmContent}
        />
      )}
      {/* 헤더 - 워트인텔리전스 로고 */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4">
          <div className="flex items-center">
            <Image
              src={`${WERT_IMAGE_BASE}/kewert_logo.png`}
              alt="keywert Insight"
              width={200}
              height={25}
              className="h-6 sm:h-8 lg:h-10 w-auto"
              priority
            />
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-6">
        <div className="w-full">
          {/* 메인 영역 - YouTube 플레이어 및 세션 소개 */}
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            {/* 비디오 플레이어 */}
            <div className="bg-white overflow-hidden w-full relative group rounded-lg">
              <div className="relative w-full pb-[56.25%] bg-black">
                <div className="absolute top-0 left-0 w-full h-full">
                  {videoType === 'vimeo' && vimeoVideoId ? (
                    <VimeoPlayer
                      videoId={vimeoVideoId}
                      hash={vimeoHash || undefined}
                      width="100%"
                      height="100%"
                      autoplay={false}
                      muted={false}
                      className="w-full h-full"
                      playerRef={playerRef}
                      onPlayingStateChange={(isPlaying) => {
                        isPlayingRef.current = isPlaying
                      }}
                    />
                  ) : (
                    <YouTubePlayer
                      url={videoUrl || ''}
                      width="100%"
                      height="100%"
                      autoplay={false}
                      muted={false}
                      className="w-full h-full"
                      playerRef={playerRef}
                      onPlayingStateChange={(isPlaying) => {
                        isPlayingRef.current = isPlaying
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* 세션 소개 */}
            <div className="bg-white p-4 sm:p-4 lg:p-6 rounded-lg border border-gray-200 w-full">
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
                <h3 className="text-base sm:text-base font-semibold text-gray-900">세션 소개</h3>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isSessionIntroExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* PC: 제목 표시 */}
              <div className="hidden lg:flex lg:items-center lg:justify-center lg:mb-3 lg:mb-4">
                <h3 className="text-base sm:text-base lg:text-lg font-semibold text-gray-900">세션 소개</h3>
              </div>
              
              {/* PC: 반응형 그리드 - 중간 화면에서는 2개, 큰 화면에서는 4개 표시 */}
              <div className="hidden lg:flex lg:flex-row xl:flex-row lg:justify-center xl:justify-center gap-3 xl:gap-4 mb-4">
                {sessions.map((session, index) => {
                  const isExpanded = expandedSession === session.label
                  return (
                    <button
                      key={session.label}
                      onClick={() => setExpandedSession(isExpanded ? null : session.label)}
                      className={`p-3 xl:p-4 bg-gray-50 rounded-lg border ${
                        isExpanded 
                          ? 'border-teal-500 shadow-md' 
                          : 'border-gray-200 hover:border-teal-500 hover:shadow-md'
                      } transition-all text-left flex flex-col items-start overflow-hidden ${
                        isExpanded 
                          ? ['SESSION 1', 'SESSION 2'].includes(session.label)
                            ? 'lg:flex-[3] xl:flex-[3]'
                            : 'lg:flex-[2] xl:flex-[2]'
                          : 'lg:flex-1 xl:flex-1'
                      }`}
                      style={{ 
                        fontFamily: 'Noto Sans KR, sans-serif',
                        height: '200px',
                        minHeight: '200px',
                        maxHeight: '200px'
                      }}
                    >
                      <div className="flex items-center gap-1.5 xl:gap-2 mb-2 flex-wrap w-full">
                        <div className="px-2 py-1 bg-teal-500 rounded-lg flex-shrink-0">
                          <span className="text-white font-bold text-xs">{session.label}</span>
                        </div>
                        <div className="px-2 py-1 bg-teal-500/10 rounded-lg flex-shrink-0">
                          <span className="text-teal-500 font-bold text-xs">{session.duration}</span>
                        </div>
                      </div>
                      <h4 className={`text-xs xl:text-sm font-bold text-gray-900 mb-2 ${isExpanded ? '' : 'line-clamp-2'} leading-tight w-full`}>
                        {session.title}
                      </h4>
                      
                      {/* 확장된 상태일 때 상세 내용 표시 - 가로 레이아웃: 사진 | 이름 소속 | 세션 설명 */}
                      {isExpanded ? (
                        <div className="w-full mt-3 flex-1 flex flex-row gap-1 items-start overflow-hidden">
                          {/* 사진 */}
                          {session.speaker && (
                            <div className="flex-shrink-0">
                              <Image
                                src={session.speaker.avatar}
                                alt={session.speaker.name}
                                width={80}
                                height={80}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                            </div>
                          )}
                          
                          {/* 이름 소속 */}
                          {session.speaker && (
                            <div className="flex-shrink-0 flex flex-col justify-start min-w-[120px]">
                              <div className="text-xs font-semibold text-gray-900 mb-1">{session.speaker.name}</div>
                              <div className="text-xs text-gray-600 whitespace-pre-line">{session.speaker.role}</div>
                            </div>
                          )}
                          
                          {/* 세션 설명 */}
                          <div className={`flex-1 overflow-y-auto ${session.speaker ? 'min-w-0 -ml-1' : 'min-w-0'} pl-1`}>
                            <ul className="space-y-2">
                              {session.bullets.map((bullet, bulletIndex) => (
                                <li key={bulletIndex} className="flex items-start gap-2">
                                  <Image
                                    src={`${WERT_IMAGE_BASE}/check_icon.png`}
                                    alt="check"
                                    width={16}
                                    height={16}
                                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                                  />
                                  <div className="text-sm text-gray-700 flex-1">{bullet}</div>
                                </li>
                              ))}
                            </ul>
                            {session.note && (
                              <p className="text-xs text-gray-500 mt-2">{session.note}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 축소된 상태일 때만 스피커 정보 표시 (하단) */}
                          {session.speaker && (
                            <div className="mt-auto pt-3 border-t border-gray-200 w-full">
                              <div className="text-xs font-semibold text-gray-900 truncate">{session.speaker.name}</div>
                              <div className="text-xs text-gray-600 mt-1 line-clamp-1">{session.speaker.role.split('\n')[0]}</div>
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* 모바일: 기존 세로 배치 - 접기/펼치기 적용 */}
              {isSessionIntroExpanded && (
                <div className="lg:hidden space-y-4">
                  {sessions.map((session, index) => (
                    <div 
                      key={session.label}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      style={{ fontFamily: 'Noto Sans KR, sans-serif' }}
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
                        {session.bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="flex items-start gap-2">
                            <Image
                              src={`${WERT_IMAGE_BASE}/check_icon.png`}
                              alt="check"
                              width={20}
                              height={20}
                              className="w-5 h-5 flex-shrink-0 mt-0.5"
                            />
                            <div className="flex-1 text-sm sm:text-base text-gray-700">{bullet}</div>
                          </li>
                        ))}
                      </ul>
                      {session.note && (
                        <p className="text-xs text-gray-500 mt-2">{session.note}</p>
                      )}
                      {session.speaker && (
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
                          <Image
                            src={session.speaker.avatar}
                            alt={session.speaker.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{session.speaker.name}</div>
                            <div className="text-xs text-gray-600 whitespace-pre-line">{session.speaker.role}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
