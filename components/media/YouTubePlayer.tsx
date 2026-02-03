'use client'

import { useEffect, useRef } from 'react'

interface YouTubePlayerProps {
  url: string
  width?: string | number
  height?: string | number
  autoplay?: boolean
  muted?: boolean
  className?: string
  onReady?: () => void
  onError?: (error: Error) => void
  onProgress?: (progress: number) => void // 0-100
  onPlayStart?: () => void
  onComplete?: () => void
}

/**
 * YouTube 비디오 플레이어 컴포넌트 (중립 위치)
 * 온디맨드 및 기타 용도로 재사용 가능
 * 
 * 기존 components/webinar/YouTubePlayer.tsx와 분리하여
 * 라이브 의존성 없이 사용 가능하도록 구성
 */
export default function YouTubePlayer({
  url,
  width = '100%',
  height = '100%',
  autoplay = false,
  muted = false,
  className = '',
  onReady,
  onError,
  onProgress,
  onPlayStart,
  onComplete,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasPlayedRef = useRef(false)
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // YouTube URL에서 video ID 추출
    const getVideoId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/,
      ]
      
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1] || match[0]
      }
      return null
    }
    
    const videoId = getVideoId(url)
    
    if (!videoId) {
      onError?.(new Error('Invalid YouTube URL'))
      return
    }
    
    // 기존 iframe 제거
    const existingIframe = containerRef.current.querySelector('iframe')
    if (existingIframe) {
      existingIframe.remove()
    }
    
    // YouTube 임베드 URL 생성
    const params = new URLSearchParams()
    
    const shouldAutoplay = autoplay
    const shouldMute = muted || autoplay
    
    if (shouldAutoplay) {
      params.append('autoplay', '1')
    }
    if (shouldMute) {
      params.append('mute', '1')
    }
    
    params.append('modestbranding', '1')
    params.append('enablejsapi', '1')
    params.append('origin', window.location.origin)
    params.append('playsinline', '1')
    params.append('rel', '0')
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`
    
    // iframe 생성
    const iframe = document.createElement('iframe')
    iframe.src = embedUrl
    iframe.width = typeof width === 'number' ? width.toString() : width
    iframe.height = typeof height === 'number' ? height.toString() : height
    iframe.frameBorder = '0'
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    iframe.allowFullscreen = true
    iframe.className = 'w-full h-full rounded-lg'
    
    // YouTube IFrame API 로드 (진행률 추적용)
    if (onProgress || onPlayStart || onComplete) {
      if (!window.YT) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      }
      
      // YouTube API 준비 대기
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT)
          
          // Player 인스턴스 생성
          playerRef.current = new window.YT.Player(iframe, {
            events: {
              onReady: (event: any) => {
                onReady?.()
                
                // 진행률 추적 시작 (1-2초 간격)
                if (onProgress) {
                  progressIntervalRef.current = setInterval(() => {
                    try {
                      const currentTime = event.target.getCurrentTime()
                      const duration = event.target.getDuration()
                      if (duration > 0) {
                        const progress = Math.floor((currentTime / duration) * 100)
                        onProgress(progress)
                      }
                    } catch (e) {
                      // 조용히 무시 (플레이어가 준비되지 않았을 수 있음)
                    }
                  }, 2000) // 2초 간격
                }
              },
              onStateChange: (event: any) => {
                // 재생 시작 감지
                if (event.data === window.YT.PlayerState.PLAYING && !hasPlayedRef.current) {
                  hasPlayedRef.current = true
                  onPlayStart?.()
                }
                
                // 완료 감지
                if (event.data === window.YT.PlayerState.ENDED) {
                  onComplete?.()
                }
              },
            },
          })
        }
      }, 100)
    }
    
    iframe.onload = () => {
      if (!onProgress && !onPlayStart && !onComplete) {
        onReady?.()
      }
    }
    
    iframe.onerror = () => {
      onError?.(new Error('Failed to load YouTube player'))
    }
    
    containerRef.current.appendChild(iframe)
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (containerRef.current) {
        const iframe = containerRef.current.querySelector('iframe')
        iframe?.remove()
      }
    }
  }, [url, autoplay, muted, width, height, onReady, onError, onProgress, onPlayStart, onComplete])
  
  return (
    <div 
      ref={containerRef}
      className={`youtube-player-container ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        aspectRatio: '16/9',
      }}
    />
  )
}

// TypeScript를 위한 YouTube API 타입 선언
declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, config: any) => any
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
  }
}
