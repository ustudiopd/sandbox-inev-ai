'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

export default function ConditionalFooter() {
  const pathname = usePathname()
  
  // 메인 페이지(/)에서만 푸터 표시
  if (pathname !== '/') {
    return null
  }
  
  return <Footer />
}
