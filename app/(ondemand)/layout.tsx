import { ReactNode } from 'react'

/**
 * 온디맨드 라우트 그룹 레이아웃
 * Phase 1: 기본 레이아웃 (라이브 레이아웃과 완전 분리)
 */
export default function OnDemandLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
