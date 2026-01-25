import { requireSuperAdmin } from '@/lib/auth/guards'

export default async function SuperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 서버에서 확정적으로 권한 확인
  await requireSuperAdmin()

  // TopNav는 LayoutWrapper에서 처리되므로 여기서는 레이아웃만 조정
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full">{children}</main>
    </div>
  )
}

