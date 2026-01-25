'use client'

import Link from 'next/link'

interface MenuItem {
  name: string
  href: string
  icon: string
  active?: boolean
}

interface TopNavMenuProps {
  item: MenuItem
}

export default function TopNavMenu({ item }: TopNavMenuProps) {
  return (
    <Link
      href={item.href}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
        ${item.active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
    >
      <span className="text-lg">{item.icon}</span>
      <span className="font-medium">{item.name}</span>
    </Link>
  )
}
