export default function InevAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-4">
          <a href="/inev-admin" className="font-semibold text-gray-900">inev.ai Admin</a>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">← 앱 홈</a>
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  )
}
