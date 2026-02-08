'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 text-gray-500 text-sm">
          <p>2025 Inev.ai. Operated by U-Studio Inc.</p>
          <span className="hidden md:inline">|</span>
          <Link href="/privacy" className="hover:text-gray-700 transition-colors">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </footer>
  )
}
