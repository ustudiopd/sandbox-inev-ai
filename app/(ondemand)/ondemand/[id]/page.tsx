import { notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
import OnDemandLandingPage from './components/OnDemandLandingPage'
import type { Metadata } from 'next'

/**
 * 메타데이터 생성 함수
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminSupabase()
  
  try {
    // UUID 또는 slug로 온디맨드 조회
    const query = getOnDemandQuery(id)
    
    let queryBuilder = admin
      .from('webinars')
      .select('id, slug, title, description, meta_title, meta_description, meta_thumbnail_url, email_thumbnail_url')
      .eq('type', 'ondemand') // 온디맨드만 조회
    
    if (query.column === 'slug') {
      queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    const { data: ondemand } = await queryBuilder.maybeSingle()
    
    if (ondemand) {
      const metaTitle = ondemand.meta_title || ondemand.title || '온디맨드 웨비나'
      const metaDescription = ondemand.meta_description || ondemand.description || metaTitle
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
      const ondemandPath = ondemand.slug || ondemand.id
      const canonicalUrl = `${appUrl}/ondemand/${ondemandPath}`
      
      // 썸네일 우선순위: meta_thumbnail_url > email_thumbnail_url > 기본 이미지 (thumb_mo.png)
      const thumbnailUrl = ondemand.meta_thumbnail_url || ondemand.email_thumbnail_url || `${appUrl}/img/hpe/thumb_mo.png`
      
      return {
        title: `${metaTitle} | 온디맨드`,
        description: metaDescription,
        metadataBase: new URL(appUrl),
        openGraph: {
          title: metaTitle,
          description: metaDescription,
          type: 'website',
          url: canonicalUrl,
          images: [
            {
              url: thumbnailUrl,
              width: 1200,
              height: 630,
              alt: metaTitle,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title: metaTitle,
          description: metaDescription,
          images: [thumbnailUrl],
        },
        alternates: {
          canonical: canonicalUrl,
        },
      }
    }
    
    return {
      title: '온디맨드 웨비나',
      description: '온디맨드 웨비나를 시청하세요',
    }
  } catch (error) {
    console.error('[OnDemandPage] 메타데이터 생성 오류:', error)
    return {
      title: '온디맨드 웨비나',
      description: '온디맨드 웨비나를 시청하세요',
    }
  }
}

export default async function OnDemandPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminSupabase()
  
  // UUID 또는 slug로 온디맨드 조회
  const query = getOnDemandQuery(id)
  
  try {
    // 온디맨드 정보 조회 (type='ondemand'만)
    let queryBuilder = admin
      .from('webinars')
      .select('*')
      .eq('type', 'ondemand') // 온디맨드만 조회
    
    if (query.column === 'slug') {
      queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    const { data: ondemand, error: ondemandError } = await queryBuilder.maybeSingle()
    
    if (ondemandError) {
      console.error('[OnDemandPage] 온디맨드 조회 오류:', ondemandError)
      notFound()
    }
    
    if (!ondemand) {
      notFound()
    }
    
    // settings에서 세션 정보 추출
    const settings = ondemand.settings as any
    const sessions = settings?.ondemand?.sessions || []
    
    // 클라이언트 정보 조회
    let clientData = null
    if (ondemand.client_id) {
      const { data: client } = await admin
        .from('clients')
        .select('id, name, logo_url, brand_config')
        .eq('id', ondemand.client_id)
        .maybeSingle()
      
      clientData = client
    }
    
    const ondemandData = {
      ...ondemand,
      sessions,
      clients: clientData || undefined,
    }
    
    return <OnDemandLandingPage webinar={ondemandData} />
  } catch (error) {
    console.error('[OnDemandPage] 페이지 로드 오류:', error)
    notFound()
  }
}
