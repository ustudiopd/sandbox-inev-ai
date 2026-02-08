import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import ConditionalFooter from '@/components/layout/ConditionalFooter'
import LayoutWrapper from '@/components/layout/LayoutWrapper'

export const metadata: Metadata = {
  title: 'Inev.ai - Enterprise Edition',
  description: 'B2B2C 멀티테넌시 웨비나 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="flex flex-col min-h-screen font-noto-sans">
        <Header />
        <LayoutWrapper>
          <div className="flex-1">
            {children}
          </div>
        </LayoutWrapper>
        <ConditionalFooter />
      </body>
    </html>
  )
}

