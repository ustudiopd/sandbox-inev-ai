import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import ConditionalFooter from '@/components/layout/ConditionalFooter'
import LayoutWrapper from '@/components/layout/LayoutWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EventFlow - Enterprise Edition',
  description: 'B2B2C 멀티테넌시 웨비나 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
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

