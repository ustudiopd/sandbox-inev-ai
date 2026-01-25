import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getWebinarQuery } from '@/lib/utils/webinar'
import ConsoleView from './components/ConsoleView'

export default async function ConsolePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminSupabase()
  const { user, supabase } = await requireAuth()
  
  // UUID 또는 slug로 웨비나 조회
  const query = getWebinarQuery(id)
  
  // 웨비나 정보 조회 (RLS 우회)
  let queryBuilder = admin
    .from('webinars')
    .select(`
      *,
      clients:client_id (
        id,
        name,
        logo_url,
        brand_config
      )
    `)
  
  if (query.column === 'slug') {
    // slug는 문자열로 비교 (숫자로 저장되어 있어도 문자열로 변환)
    queryBuilder = queryBuilder.eq('slug', String(query.value))
  } else {
    queryBuilder = queryBuilder.eq(query.column, query.value)
  }
  
  // 149404 slug인 경우 등록 캠페인에서 데이터 가져오기
  const is149404 = query.column === 'slug' && query.value === '149404'
  
  const { data: webinar, error } = await queryBuilder.single()
  
  let finalWebinar = webinar
  
  // 웨비나가 없고 149404인 경우 등록 캠페인에서 데이터 가져오기
  if ((error || !webinar) && is149404) {
    console.log('[Console] 149404 웨비나가 없음 - /149403 등록 캠페인에서 데이터 가져오기')
    
    // /149403 등록 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, description, client_id, agency_id, public_path, type')
      .eq('public_path', '/149403')
      .eq('type', 'registration')
      .maybeSingle()
    
    if (campaignError || !campaign) {
      console.error('[Console] /149403 등록 캠페인 조회 실패:', campaignError)
      redirect(`/webinar/${id}`)
    }
    
    // 등록 캠페인 정보로 웨비나 데이터 구성
    finalWebinar = {
      id: '00000000-0000-0000-0000-000000000000', // 임시 UUID
      slug: '149404',
      title: campaign.title || 'AI 특허리서치 실무 활용 웨비나',
      description: campaign.description || '실제 고객사례로 알아보는 AI 특허리서치 실무 활용 웨비나',
      youtube_url: '',
      start_time: '2026-02-06T14:00:00Z',
      end_time: '2026-02-06T15:30:00Z',
      access_policy: 'name_email_auth',
      client_id: campaign.client_id,
      agency_id: campaign.agency_id,
      registration_campaign_id: campaign.id,
      is_public: true,
      max_participants: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clients: null,
    } as any
    
    console.log('[Console] 등록 캠페인에서 웨비나 데이터 구성 완료:', {
      title: finalWebinar.title,
      registration_campaign_id: finalWebinar.registration_campaign_id,
    })
  } else if (error || !webinar) {
    // 웨비나를 찾을 수 없으면 입장 페이지로 리다이렉트
    redirect(`/webinar/${id}`)
  }
  
  // slug가 있으면 slug를 사용하고, 없으면 id를 사용 (리다이렉트용)
  const webinarId = finalWebinar.slug || finalWebinar.id
  
  // 권한 확인 (클라이언트 멤버 또는 에이전시 owner/admin)
  // JWT app_metadata에서 슈퍼어드민 권한 확인 (RLS 재귀 방지)
  const isSuperAdmin = !!user?.app_metadata?.is_super_admin
  
  let hasPermission = false
  let userRole = 'viewer'
  
  // 슈퍼 어드민은 항상 접근 가능
  if (isSuperAdmin) {
    hasPermission = true
    userRole = 'super_admin'
  } else {
    // 클라이언트 멤버십 확인 (Admin Supabase로 RLS 우회)
    const { data: clientMember, error: clientMemberError } = await admin
      .from('client_members')
      .select('role')
      .eq('client_id', finalWebinar.client_id)
      .eq('user_id', user.id)
      .maybeSingle()
    
    // 디버깅 로그
    console.log('[Console] 권한 체크:', {
      userId: user.id,
      webinarClientId: finalWebinar.client_id,
      webinarAgencyId: finalWebinar.agency_id,
      clientMember,
      clientMemberError,
    })
    
    // 클라이언트 멤버는 모든 역할에서 콘솔 접근 가능
    if (clientMember && ['owner', 'admin', 'operator', 'member'].includes(clientMember.role)) {
      hasPermission = true
      userRole = clientMember.role
    } else {
      // 클라이언트 멤버가 없으면 에이전시 멤버십 확인
      // 클라이언트가 속한 에이전시의 멤버인지 확인 (requireClientMember와 동일한 로직)
      if (finalWebinar.agency_id) {
        const { data: agencyMember } = await admin
          .from('agency_members')
          .select('role')
          .eq('agency_id', finalWebinar.agency_id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        console.log('[Console] 에이전시 멤버십 확인:', {
          agencyId: finalWebinar.agency_id,
          agencyMember,
        })
        
        // 에이전시 멤버는 owner/admin만 운영 콘솔 접근 가능
        if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
          hasPermission = true
          userRole = agencyMember.role
        } else {
          // UStudio 계정 특별 처리: 에이전시 멤버가 없으면 자동으로 추가
          const isUStudioAccount = user.email?.endsWith('@ustudio.co.kr') || user.email?.endsWith('@ustudio.com')
          if (isUStudioAccount && !agencyMember) {
            // UStudio 계정을 해당 에이전시에 owner 역할로 자동 추가
            const { error: insertError } = await admin
              .from('agency_members')
              .insert({
                agency_id: finalWebinar.agency_id,
                user_id: user.id,
                role: 'owner'
              })

            if (!insertError) {
              console.log(`[Console] UStudio 계정 ${user.email}을 에이전시 ${finalWebinar.agency_id}에 멤버로 추가했습니다.`)
              hasPermission = true
              userRole = 'owner'
            } else {
              console.error(`[Console] UStudio 계정 멤버 추가 실패:`, insertError)
            }
          }
        }
      }
    }
  }
  
  // 권한이 없으면 입장 페이지로 리다이렉트
  if (!hasPermission) {
    console.log('[Console] 권한 없음 - 입장 페이지로 리다이렉트:', {
      userId: user.id,
      webinarId: id,
      webinarClientId: finalWebinar.client_id,
    })
    redirect(`/webinar/${webinarId}`)
  }
  
  return <ConsoleView webinar={finalWebinar} userRole={userRole} />
}






