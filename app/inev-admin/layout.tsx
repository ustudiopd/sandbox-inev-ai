import { createAdminSupabase } from '@/lib/supabase/admin'

export default async function InevAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-4">{children}</main>
    </div>
  )
}
