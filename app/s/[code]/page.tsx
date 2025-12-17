import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ code: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
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

  // 웨비나 정보 조회 (slug 포함, 에러 처리)
  // slug 필드가 없을 수 있으므로 먼저 기본 필드만 조회
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, title, description')
    .eq('id', shortLink.webinar_id)
    .single()

  if (webinarError || !webinar) {
    return {
      title: '웨비나를 찾을 수 없습니다',
    }
  }
  
  // slug 필드가 있는 경우 추가 조회 (에러 무시)
  try {
    const { data: webinarWithSlug } = await admin
      .from('webinars')
      .select('slug')
      .eq('id', shortLink.webinar_id)
      .single()
    
    if (webinarWithSlug) {
      (webinar as any).slug = webinarWithSlug.slug
    }
  } catch (err) {
    // slug 필드가 없으면 무시
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

export default async function ShortLinkRedirectPage({ 
  params,
  searchParams 
}: PageProps) {
  const { code } = await params
  const searchParamsData = await searchParams
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

  // 웨비나 정보 조회 (slug 포함, 에러 처리)
  // slug 필드가 없을 수 있으므로 먼저 id만 조회 시도
  let webinar: { id: string; slug?: string | null } | null = null
  
  // slug 필드가 있는지 확인하기 위해 먼저 id만 조회
  const { data: webinarData, error: webinarError } = await admin
    .from('webinars')
    .select('id')
    .eq('id', shortLink.webinar_id)
    .single()

  if (webinarError || !webinarData) {
    console.error('웨비나 조회 실패:', webinarError)
    redirect('/')
  }

  // slug 필드가 있는 경우 추가 조회
  try {
    const { data: webinarWithSlug } = await admin
      .from('webinars')
      .select('id, slug')
      .eq('id', shortLink.webinar_id)
      .single()
    
    webinar = webinarWithSlug || webinarData
  } catch (err) {
    // slug 필드가 없으면 id만 사용
    webinar = webinarData
  }

  if (!webinar) {
    redirect('/')
  }

  // slug가 있으면 slug를 사용하고, 없으면 id를 사용
  const webinarSlug = (webinar as any).slug || webinar.id

  // URL 파라미터 유지 (이메일 등)
  const queryParams = new URLSearchParams()
  if (searchParamsData?.email) {
    const emailValue = Array.isArray(searchParamsData.email) 
      ? searchParamsData.email[0] 
      : searchParamsData.email
    if (emailValue) {
      queryParams.set('email', emailValue)
    }
  }
  // 다른 파라미터도 유지
  Object.keys(searchParamsData).forEach(key => {
    if (key !== 'email' && searchParamsData[key]) {
      const value = Array.isArray(searchParamsData[key])
        ? searchParamsData[key][0]
        : searchParamsData[key]
      if (value) {
        queryParams.set(key, value)
      }
    }
  })

  const queryString = queryParams.toString()
  const redirectUrl = queryString 
    ? `/webinar/${webinarSlug}?${queryString}`
    : `/webinar/${webinarSlug}`

  // slug로 리다이렉트 (파라미터 포함)
  redirect(redirectUrl)
}

