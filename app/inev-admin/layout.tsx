import { createAdminSupabase } from '@/lib/supabase/admin'
import InevAdminHeader from './components/InevAdminHeader'

export default async function InevAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <InevAdminHeader />
      <main className="p-4">{children}</main>
    </div>
  )
}
