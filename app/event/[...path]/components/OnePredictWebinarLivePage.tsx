'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import YouTubePlayer from '@/components/webinar/YouTubePlayer'
import Chat from '@/components/webinar/Chat'
import QA from '@/components/webinar/QA'
import PresenceBar from '@/components/webinar/PresenceBar'

interface OnePredictWebinarLivePageProps {
  campaign?: any
  baseUrl?: string
}

export default function OnePredictWebinarLivePage({ campaign, baseUrl = '' }: OnePredictWebinarLivePageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'chat' | 'qa' | 'participants'>('chat')
  const [webinarId, setWebinarId] = useState<string | null>(null)
  const [webinarExists, setWebinarExists] = useState(false)
  const [isCheckingWebinar, setIsCheckingWebinar] = useState(true) // 웨비나 확인 중인지 추적
  const [youtubeUrl, setYoutubeUrl] = useState<string>('') // 웨비나에서 가져온 YouTube URL
  
  // 초기값은 campaign에서 가져오되, 웨비나 데이터가 로드되면 웨비나의 youtube_url을 우선 사용
  useEffect(() => {
    if (campaign?.youtube_url) {
      setYoutubeUrl(campaign.youtube_url)
    }
  }, [campaign])

  useEffect(() => {
    let cancelled = false
    
    // 426307을 slug로 웨비나 찾기
    const findWebinar = async () => {
      setIsCheckingWebinar(true)
      
      try {
        // 426307을 slug로 웨비나 조회
        const response = await fetch(`/api/webinars/426307`)
        if (cancelled) return
        
        // 응답이 성공적이지 않으면 웨비나가 없는 것으로 처리
        if (!response.ok) {
          console.warn('웨비나 조회 실패:', response.status)
          setWebinarExists(false)
          setWebinarId(null)
          setIsCheckingWebinar(false)
          return
        }
        
        const data = await response.json()
        if (cancelled) return
        
        // 웨비나가 존재하고 유효한 id가 있는지 엄격하게 확인
        if (!data || !data.webinar) {
          console.warn('웨비나 데이터가 없습니다')
          setWebinarExists(false)
          setWebinarId(null)
          setIsCheckingWebinar(false)
          return
        }
        
        const webinar = data.webinar
        
        // id와 slug 모두 확인
        if (!webinar.id && !webinar.slug) {
          console.warn('웨비나 ID를 찾을 수 없습니다')
          setWebinarExists(false)
          setWebinarId(null)
          setIsCheckingWebinar(false)
          return
        }
        
        // 웨비나의 실제 UUID를 사용해야 함 (Chat/QA API는 UUID를 요구함)
        // slug가 아닌 실제 id를 사용
        const actualWebinarId = webinar.id
        
        // 웨비나 ID가 유효한지 확인 (UUID 형식이어야 함)
        if (!actualWebinarId || (typeof actualWebinarId === 'string' && actualWebinarId.trim() === '')) {
          console.warn('웨비나 ID가 유효하지 않습니다:', actualWebinarId)
          setWebinarExists(false)
          setWebinarId(null)
          setIsCheckingWebinar(false)
          return
        }
        
        // UUID 형식인지 확인
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(String(actualWebinarId))) {
          console.warn('웨비나 ID가 UUID 형식이 아닙니다:', actualWebinarId)
          setWebinarExists(false)
          setWebinarId(null)
          setIsCheckingWebinar(false)
          return
        }
        
        // 웨비나의 YouTube URL이 있으면 사용 (콘솔에서 설정한 값)
        // 웨비나 콘솔에서 설정한 YouTube URL이 우선적으로 적용됨
        if (webinar.youtube_url) {
          setYoutubeUrl(webinar.youtube_url)
          console.log('[OnePredictWebinarLivePage] 웨비나 콘솔에서 설정한 YouTube URL 적용:', webinar.youtube_url)
        } else {
          console.warn('[OnePredictWebinarLivePage] 웨비나에 YouTube URL이 설정되지 않았습니다')
        }
        
        // 웨비나 데이터 전체 로깅 (디버깅용)
        console.log('[OnePredictWebinarLivePage] 웨비나 데이터:', {
          id: webinar.id,
          slug: webinar.slug,
          title: webinar.title,
          description: webinar.description,
          youtube_url: webinar.youtube_url,
          start_time: webinar.start_time,
          end_time: webinar.end_time,
        })
        
        // 모든 검증을 통과했을 때만 웨비나 존재로 설정 (실제 UUID 사용)
        setWebinarId(String(actualWebinarId))
        setWebinarExists(true)
        setIsCheckingWebinar(false)
        console.log('[OnePredictWebinarLivePage] 웨비나 찾음 (UUID):', actualWebinarId, 'slug:', webinar.slug)
      } catch (error) {
        if (cancelled) return
        console.warn('웨비나 확인 실패:', error)
        setWebinarExists(false)
        setWebinarId(null)
        setIsCheckingWebinar(false)
      }
    }
    
    findWebinar()
    
    return () => {
      cancelled = true
    }
  }, [])

  // 웨비나가 실제로 존재하고 유효한 ID가 있는지 확인하는 플래그
  const canRenderChatQA = !isCheckingWebinar && webinarExists && webinarId && typeof webinarId === 'string' && webinarId.trim() !== ''
  
  // Chat 컴포넌트를 한 번만 렌더링하여 중복 구독 방지 (웨비나가 존재하고 유효한 ID가 있을 때만)
  const chatComponent = useMemo(() => {
    // 웨비나 확인이 완료되고, webinarExists가 true이고, webinarId가 유효한 문자열일 때만 렌더링
    if (!canRenderChatQA || !webinarId) {
      return null
    }
    return (
      <Chat
        key={`chat-${webinarId}`}
        webinarId={webinarId}
        canSend={true}
        maxMessages={50}
        isAdminMode={false}
      />
    )
  }, [canRenderChatQA, webinarId])
  
  // QA 컴포넌트를 한 번만 렌더링하여 중복 구독 방지 (웨비나가 존재하고 유효한 ID가 있을 때만)
  const qaComponent = useMemo(() => {
    // 웨비나 확인이 완료되고, webinarExists가 true이고, webinarId가 유효한 문자열일 때만 렌더링
    if (!canRenderChatQA || !webinarId) {
      return null
    }
    return (
      <QA
        key={`qa-${webinarId}`}
        webinarId={webinarId}
        canAsk={true}
        showOnlyMine={false}
        isAdminMode={false}
      />
    )
  }, [canRenderChatQA, webinarId])

  return (
    <>
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
      <div className="min-h-screen w-full overflow-x-hidden bg-white">
        {/* 헤더 */}
        <header className="border-b sticky top-0 z-40 w-full bg-white/60 backdrop-blur-[2px] border-gray-200/50">
          <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center cursor-pointer" onClick={() => router.push('/webinar/426307')}>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/onepredict/be6b22396f779.png"
                    alt="원프레딕트 로고"
                    className="h-6 sm:h-8 lg:h-10 w-auto"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">LIVE</span>
                </div>
                <button
                  onClick={() => router.push('/webinar/426307')}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-[#2936E7] transition-colors whitespace-nowrap"
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-6 w-full">
            {/* 메인 영역 - YouTube 플레이어 */}
            <div className="lg:col-span-2 space-y-2 sm:space-y-3 lg:space-y-4">
              {/* YouTube 플레이어 */}
              <div className="bg-white overflow-hidden w-full relative group rounded-lg">
                <div className="relative w-full pb-[56.25%] bg-black">
                  <div className="absolute top-0 left-0 w-full h-full">
                    {youtubeUrl ? (
                      <YouTubePlayer
                        url={youtubeUrl}
                        width="100%"
                        height="100%"
                        autoplay={true}
                        muted={true}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white">
                          <div className="mb-4">
                            <i className="fas fa-video text-6xl text-gray-600"></i>
                          </div>
                          <h2 className="text-2xl font-bold mb-2">웨비나 영상</h2>
                          <p className="text-gray-400">웨비나가 곧 시작됩니다</p>
                          <div className="mt-6 flex items-center justify-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm">LIVE</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 세션 소개 */}
              <div className="bg-white p-4 sm:p-4 lg:p-6 rounded-lg border border-gray-200">
                <h3 className="text-base sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-3 lg:mb-4">세션 소개</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-xs sm:text-sm lg:text-base text-gray-700 whitespace-pre-wrap leading-relaxed">
                    산업 AI의 미래, 원프레딕트가 제안하는 가동 효율의 극대화<br />
                    GuardiOne®을 통한 설비 관리 혁신과 디지털 트랜스포메이션 성공 전략을 공개합니다.
                  </p>
                </div>
              </div>
            
              {/* 모바일 채팅/Q&A - 영상 아래 순서대로 */}
              {canRenderChatQA && chatComponent && qaComponent && (
                <div className="lg:hidden">
                  <div className="bg-white overflow-hidden h-[50vh] min-h-[300px] sm:min-h-[350px] max-h-[500px] flex flex-col rounded-lg border border-gray-200">
                    {/* 탭 */}
                    <div className="border-b border-gray-200 flex flex-shrink-0">
                      <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                          activeTab === 'chat'
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600'
                        }`}
                      >
                        💬 채팅
                      </button>
                      <button
                        onClick={() => setActiveTab('qa')}
                        className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                          activeTab === 'qa'
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600'
                        }`}
                      >
                        ❓ Q&A
                      </button>
                    </div>
                    
                    {/* 탭 컨텐츠 - 모바일 전용 */}
                    <div className="flex-1 overflow-hidden">
                      {canRenderChatQA && activeTab === 'chat' ? chatComponent : canRenderChatQA && activeTab === 'qa' ? qaComponent : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 사이드바 - 채팅/Q&A (데스크톱) */}
            {canRenderChatQA && chatComponent && qaComponent && (
              <div className="hidden lg:block lg:col-span-1">
                <div className="bg-white overflow-hidden h-[calc(100vh-200px)] flex flex-col w-full max-w-[400px] rounded-lg border border-gray-200">
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
                  </div>
                  
                  {/* 탭 컨텐츠 - 데스크톱 전용 */}
                  <div className="flex-1 overflow-hidden">
                    {canRenderChatQA && activeTab === 'chat' ? chatComponent : canRenderChatQA && activeTab === 'qa' ? qaComponent : (
                      canRenderChatQA && webinarId ? (
                        <div className="h-full overflow-y-auto p-4">
                          <PresenceBar
                            webinarId={webinarId}
                            showTyping={true}
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        <div className="h-full overflow-y-auto p-4 text-center text-gray-400">
                          접속자 정보를 불러올 수 없습니다.
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
