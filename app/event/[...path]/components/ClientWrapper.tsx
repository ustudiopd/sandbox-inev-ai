'use client'

import { Suspense, lazy, ComponentType } from 'react'
import { ClientErrorBoundary } from './ClientErrorBoundary'

interface ClientWrapperProps {
  clientName: string
  loader: () => Promise<{ default: ComponentType<any> }>
  props?: Record<string, any>
  fallback?: React.ReactNode
}

export default function ClientWrapper({ 
  clientName, 
  loader, 
  props = {},
  fallback 
}: ClientWrapperProps) {
  const LazyComponent = lazy(loader)

  const defaultFallback = (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{clientName} 페이지 로딩 중...</p>
      </div>
    </div>
  )

  return (
    <ClientErrorBoundary clientName={clientName}>
      <Suspense fallback={fallback || defaultFallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ClientErrorBoundary>
  )
}
