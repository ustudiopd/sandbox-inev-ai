import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const admin = createAdminSupabase()

  // 짧은 링크로 웨비나 ID 조회
  const { data: shortLink } = await admin
    .from('short_links')
    .select('webinar_id')
    .eq('code', code)
    .single()

  if (!shortLink) {
    return {
      title: '웨비나를 찾을 수 없습니다',
    }
  }

  // 웨비나 정보 조회
  const { data: webinar } = await admin
    .from('webinars')
    .select('id, title, description')
    .eq('id', shortLink.webinar_id)
    .single()

  if (!webinar) {
    return {
      title: '웨비나를 찾을 수 없습니다',
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://must.ai.kr'
  const shortUrl = `${appUrl}/s/${code}`

  return {
    title: webinar.title || '웨비나',
    description: webinar.description || 'EventLive 웨비나에 참여하세요',
    openGraph: {
      title: webinar.title || '웨비나',
      description: webinar.description || 'EventLive 웨비나에 참여하세요',
      url: shortUrl,
      siteName: 'EventLive',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: webinar.title || '웨비나',
      description: webinar.description || 'EventLive 웨비나에 참여하세요',
    },
  }
}

export default async function ShortLinkRedirectPage({ params }: PageProps) {
  const { code } = await params
  const admin = createAdminSupabase()

  // 짧은 링크로 웨비나 ID 조회
  const { data: shortLink, error } = await admin
    .from('short_links')
    .select('webinar_id, expires_at')
    .eq('code', code)
    .single()

  if (error || !shortLink) {
    redirect('/')
  }

  // 만료 시간 확인
  if (shortLink.expires_at) {
    const expiresAt = new Date(shortLink.expires_at)
    if (expiresAt < new Date()) {
      redirect('/')
    }
  }

  // 원본 웨비나 페이지로 리다이렉트
  redirect(`/webinar/${shortLink.webinar_id}`)
}

