'use client'

import { usePathname } from 'next/navigation'
import TopNav from './TopNav'
import { SidebarProvider } from './SidebarContext'

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 공개 페이지 판별: 명세서와 1:1로 일치하도록 구성
  const isPublicPage = 
    pathname === '/' || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/signup') || 
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/unsubscribe') ||
    pathname.startsWith('/event/')
  
  // /admin 페이지는 네비게이션 없음
  const isAdminPage = pathname.startsWith('/admin')
  
  // 테스트 페이지는 네비게이션 없음
  const isTestPage = pathname.startsWith('/test')
  
  // 관리 웨비나 페이지 (콘솔, 등록자, 통계) 판별
  const decodedPathname = decodeURIComponent(pathname)
  const isConsolePage = pathname.endsWith('/console') || decodedPathname.endsWith('/console')
  const isRegistrantsPage = pathname.endsWith('/registrants') || decodedPathname.endsWith('/registrants')
  const isStatsPage = pathname.endsWith('/stats') || decodedPathname.endsWith('/stats')
  
  // 클라이언트 웨비나 상세 페이지도 ConsoleView를 사용하므로 WebinarHeader가 표시됨
  const isClientWebinarDetailPage = /^\/client\/[^/]+\/webinars\/[^/]+$/.test(pathname)
  
  const isAdminWebinarPage = (isConsolePage || isRegistrantsPage || isStatsPage) && 
                             (pathname.startsWith('/webinar/') || decodedPathname.startsWith('/webinar/')) ||
                             isClientWebinarDetailPage
  
  // 공개 웨비나 페이지 (시청 페이지, 라이브 페이지)는 네비게이션 없음
  const isPublicWebinarPage = (pathname.startsWith('/webinar/') || decodedPathname.startsWith('/webinar/')) && 
                               !isAdminWebinarPage &&
                               (pathname.includes('/live') || decodedPathname.includes('/live') || 
                                (!isConsolePage && !isRegistrantsPage && !isStatsPage))
  
  // 공개 페이지는 네비게이션 없음
  if (isPublicPage || isPublicWebinarPage || isAdminPage || isTestPage) {
    return <>{children}</>
  }
  
  // TopNav 사용 (사이드바 제거됨)
  // 웨비나 관리 페이지는 WebinarHeader가 추가로 표시되므로 추가 패딩 필요
  // TopNav(64px) + WebinarHeader(약 144px) = 총 208px
  const isWebinarAdminPage = isAdminWebinarPage
  const mainPaddingTop = isWebinarAdminPage ? 'pt-[208px]' : 'pt-16'
  
  return (
    <>
      <TopNav />
      <main 
        className={`${mainPaddingTop} min-h-screen w-full bg-gradient-to-br from-gray-50 to-blue-50`}
      >
        {children}
      </main>
    </>
  )
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}

