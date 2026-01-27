import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarQuery } from '@/lib/utils/webinar'
import OnePredictEnterPage from '@/app/event/[...path]/components/OnePredictEnterPage'

export default async function WebinarEnterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminSupabase()
  const query = getWebinarQuery(id)
  
  // 426307 slug인 경우 OnePredictEnterPage를 표시
  const is426307 = query.column === 'slug' && String(query.value) === '426307'
  
  if (is426307) {
    console.log('[WebinarEnterPage] 426307 slug 감지 → OnePredictEnterPage 표시')
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    
    // 웨비나 데이터 조회 시도 (없어도 페이지는 표시)
    let campaignData = null
    
    try {
      let queryBuilder = admin
        .from('webinars')
        .select('*')
      
      if (query.column === 'slug') {
        queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
      } else {
        queryBuilder = queryBuilder.eq(query.column, query.value)
      }
      
      const { data: webinar, error: webinarError } = await queryBuilder.maybeSingle()
      
      // 웨비나가 있으면 사용
      if (webinar && !webinarError) {
        campaignData = webinar
      } else {
        // 웨비나가 없으면 등록 캠페인에서 데이터 가져오기
        const { data: campaign } = await admin
          .from('event_survey_campaigns')
          .select('id, title, description, client_id, agency_id, public_path, type')
          .eq('public_path', '/426307')
          .eq('type', 'registration')
          .maybeSingle()
        
        if (campaign) {
          campaignData = campaign
        }
      }
    } catch (error) {
      // 에러 발생 시에도 등록 캠페인에서 데이터 가져오기 시도
      console.log('[WebinarEnterPage] 웨비나 조회 에러:', error)
      const { data: campaign } = await admin
        .from('event_survey_campaigns')
        .select('id, title, description, client_id, agency_id, public_path, type')
        .eq('public_path', '/426307')
        .eq('type', 'registration')
        .maybeSingle()
      
      if (campaign) {
        campaignData = campaign
      }
    }
    
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2936E7] mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }>
        <OnePredictEnterPage campaign={campaignData} baseUrl={baseUrl} />
      </Suspense>
    )
  }
  
  // 426307이 아니면 404
  notFound()
}
