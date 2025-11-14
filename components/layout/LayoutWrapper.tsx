'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isWebinarPage = pathname.startsWith('/webinar/')
  const isAdminPage = pathname.startsWith('/admin')
  
  if (isPublicPage || isWebinarPage || isAdminPage) {
    return <>{children}</>
  }
  
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  )
}

