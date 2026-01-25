'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { JSONContent } from 'novel'

interface UseAutoSaveOptions {
  docId: string
  debounceMs?: number
  onSave?: (content: JSONContent, title?: string) => Promise<void>
}

type SaveStatus = 'saved' | 'saving' | 'error' | 'offline'

export function useAutoSave({
  docId,
  debounceMs = 2000,
  onSave,
}: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isOnlineRef = useRef(navigator.onLine)

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true
      setSaveStatus((prev) => (prev === 'offline' ? 'saved' : prev))
    }

    const handleOffline = () => {
      isOnlineRef.current = false
      setSaveStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 로컬 스토리지에 백업
  const saveToLocal = useCallback(
    (content: JSONContent, title?: string) => {
      try {
        const key = `editor-backup-${docId}`
        const data = {
          content,
          title,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem(key, JSON.stringify(data))
      } catch (error) {
        console.error('Local storage save error:', error)
      }
    },
    [docId]
  )

  // 로컬 스토리지에서 복원
  const restoreFromLocal = useCallback(() => {
    try {
      const key = `editor-backup-${docId}`
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        return {
          content: parsed.content as JSONContent,
          title: parsed.title as string | null,
        }
      }
    } catch (error) {
      console.error('Local storage restore error:', error)
    }
    return { content: null, title: null }
  }, [docId])

  // 저장 실행
  const performSave = useCallback(
    async (content: JSONContent, title?: string) => {
      if (!isOnlineRef.current) {
        saveToLocal(content, title)
        setSaveStatus('offline')
        return
      }

      setSaveStatus('saving')
      saveToLocal(content, title)

      try {
        if (onSave) {
          await onSave(content, title)
        }
        setSaveStatus('saved')
        setLastSaved(new Date())
      } catch (error) {
        console.error('Save error:', error)
        setSaveStatus('error')
      }
    },
    [onSave, saveToLocal]
  )

  // Debounce된 저장 트리거
  const triggerSave = useCallback(
    (content: JSONContent, title?: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        performSave(content, title)
      }, debounceMs)
    },
    [debounceMs, performSave]
  )

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    saveStatus,
    lastSaved,
    triggerSave,
    restoreFromLocal,
    performSave,
  }
}
