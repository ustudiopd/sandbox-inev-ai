'use client'

import { useEffect, useRef } from 'react'

interface VimeoPlayerProps {
  videoId: string
  hash?: string // Vimeo 비공개 비디오 해시
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
  onPlayingStateChange?: (isPlaying: boolean) => void  // 재생 상태 변경 콜백
  playerRef?: React.MutableRefObject<any>  // 플레이어 인스턴스 ref (옵션)
}

/**
 * Vimeo 비디오 플레이어 컴포넌트
 * 온디맨드 및 기타 용도로 재사용 가능
 */
export default function VimeoPlayer({
  videoId,
  hash,
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
  onPlayingStateChange,
  playerRef: externalPlayerRef,
}: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasPlayedRef = useRef(false)
  
  useEffect(() => {
    if (!containerRef.current || !videoId) return
    
    // 기존 iframe 제거
    const existingIframe = containerRef.current.querySelector('iframe')
    if (existingIframe) {
      existingIframe.remove()
    }
    
    // Vimeo 임베드 URL 생성
    const params = new URLSearchParams()
    
    if (autoplay) {
      params.append('autoplay', '1')
    }
    if (muted || autoplay) {
      params.append('muted', '1')
    }
    
    params.append('title', '0')
    params.append('byline', '0')
    params.append('portrait', '0')
    params.append('badge', '0')
    params.append('autopause', '0')
    
    // 비공개 비디오인 경우 해시 추가
    if (hash) {
      params.append('h', hash)
    }
    
    const embedUrl = `https://player.vimeo.com/video/${videoId}?${params.toString()}`
    
    // iframe 생성
    const iframe = document.createElement('iframe')
    iframe.src = embedUrl
    iframe.width = typeof width === 'number' ? width.toString() : width
    iframe.height = typeof height === 'number' ? height.toString() : height
    iframe.frameBorder = '0'
    iframe.allow = 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share'
    iframe.allowFullscreen = true
    iframe.className = 'w-full h-full rounded-lg'
    iframe.style.position = 'absolute'
    iframe.style.top = '0'
    iframe.style.left = '0'
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    
    // Vimeo Player API 로드 (진행률 추적용)
    if (onProgress || onPlayStart || onComplete) {
      if (!window.Vimeo) {
        const tag = document.createElement('script')
        tag.src = 'https://player.vimeo.com/api/player.js'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      }
      
      // Vimeo API 준비 대기
      const checkVimeo = setInterval(() => {
        if (window.Vimeo && window.Vimeo.Player) {
          clearInterval(checkVimeo)
          
          // Player 인스턴스 생성
          playerRef.current = new window.Vimeo.Player(iframe, {
            id: parseInt(videoId),
            autoplay: autoplay,
            muted: muted || autoplay,
          })
          
          // 이벤트 리스너 등록
          playerRef.current.ready().then(() => {
            onReady?.()
            
            // 진행률 추적 시작 (1-2초 간격)
            if (onProgress) {
              progressIntervalRef.current = setInterval(async () => {
                try {
                  const currentTime = await playerRef.current.getCurrentTime()
                  const duration = await playerRef.current.getDuration()
                  if (duration > 0) {
                    const progress = Math.floor((currentTime / duration) * 100)
                    onProgress(progress)
                  }
                } catch (e) {
                  // 조용히 무시
                }
              }, 2000) // 2초 간격
            }
          })
          
          // 재생/일시정지 상태 추적
          if (onPlayingStateChange) {
            playerRef.current.on('play', () => {
              onPlayingStateChange(true)
              if (!hasPlayedRef.current) {
                hasPlayedRef.current = true
                onPlayStart?.()
              }
            })
            playerRef.current.on('pause', () => {
              onPlayingStateChange(false)
            })
            playerRef.current.on('ended', () => {
              onPlayingStateChange(false)
              onComplete?.()
            })
          } else {
            // onPlayingStateChange가 없으면 기존 로직 유지
            if (onPlayStart) {
              playerRef.current.on('play', () => {
                if (!hasPlayedRef.current) {
                  hasPlayedRef.current = true
                  onPlayStart()
                }
              })
            }
            
            // 완료 감지
            if (onComplete) {
              playerRef.current.on('ended', () => {
                onComplete()
              })
            }
          }
          
          // externalPlayerRef에도 할당
          if (externalPlayerRef) {
            externalPlayerRef.current = playerRef.current
          }
        }
      }, 100)
    }
    
    iframe.onload = () => {
      if (!onProgress && !onPlayStart && !onComplete) {
        onReady?.()
      }
    }
    
    iframe.onerror = () => {
      onError?.(new Error('Failed to load Vimeo player'))
    }
    
    // 컨테이너에 iframe 추가
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
  }, [videoId, hash, autoplay, muted, width, height, onReady, onError, onProgress, onPlayStart, onComplete, onPlayingStateChange, externalPlayerRef])
  
  return (
    <div 
      ref={containerRef}
      className={`vimeo-player-container ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        aspectRatio: '16/9',
        position: 'relative',
        paddingTop: '56.25%',
      }}
    />
  )
}

// TypeScript를 위한 Vimeo API 타입 선언
declare global {
  interface Window {
    Vimeo: {
      Player: new (element: HTMLElement, options: any) => {
        ready: () => Promise<void>
        getCurrentTime: () => Promise<number>
        getDuration: () => Promise<number>
        getPaused: () => Promise<boolean>
        on: (event: string, callback: () => void) => void
      }
    }
  }
}
