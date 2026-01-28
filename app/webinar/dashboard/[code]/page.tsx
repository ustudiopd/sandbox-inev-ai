import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createAdminSupabase } from '@/lib/supabase/admin'
import PublicDashboardClient from './PublicDashboardClient'

/**
 * 웨비나 공개 대시보드 페이지
 * /webinar/dashboard/{code}
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  
  if (!code || code.length !== 6) {
    return {
      title: '웨비나 대시보드',
    }
  }
  
  const admin = createAdminSupabase()
  
  // dashboard_code로 웨비나 조회
  const { data: webinar } = await admin
    .from('webinars')
    .select('title, slug')
    .eq('dashboard_code', code.toUpperCase())
    .maybeSingle()
  
  if (!webinar) {
    return {
      title: '웨비나 대시보드',
    }
  }
  
  const title = `${webinar.title} 대시보드`
  const description = `${webinar.title} 참여자 관리 대시보드`
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function WebinarPublicDashboardPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  
  if (!code || code.length !== 6) {
    notFound()
  }
  
  const admin = createAdminSupabase()
  
  // dashboard_code로 웨비나 조회
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('*')
    .eq('dashboard_code', code.toUpperCase())
    .maybeSingle()
  
  if (webinarError || !webinar) {
    notFound()
  }
  
  // 통계 정보 조회 (등록자 수)
  const { count: registrantCount } = await admin
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('webinar_id', webinar.id)
  
  const webinarWithStats = {
    ...webinar,
    stats: {
      total_registrants: registrantCount || 0,
    },
  }
  
  return <PublicDashboardClient webinar={webinarWithStats} />
}
