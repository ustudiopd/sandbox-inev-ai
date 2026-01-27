import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWebinarQuery } from '@/lib/utils/webinar'
import WebinarView from '../components/WebinarView'

export default async function WebinarLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const searchParamsData = await searchParams
  let isAdminMode = searchParamsData?.admin === 'true'
  
  // 콘솔에서 온 경우 (콘솔 페이지는 이미 권한 체크를 했으므로 예외 처리)
  const fromConsole = searchParamsData?.from === 'console'
  // 콘솔에서 온 경우 관리자 모드 강제 활성화
  if (fromConsole) {
    isAdminMode = true
  }
  
  const admin = createAdminSupabase()
  const supabase = await createServerSupabase()
  
  // UUID 또는 slug로 웨비나 조회
  const query = getWebinarQuery(id)
  
  // 웨비나 정보 조회 (RLS 우회하여 접근 가능하도록)
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
    // slug 필드 명시적으로 포함
  
  if (query.column === 'slug') {
    // slug는 문자열로 비교 (숫자로 저장되어 있어도 문자열로 변환)
    queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
  } else {
    queryBuilder = queryBuilder.eq(query.column, query.value)
  }
  
  // 149402 또는 426307 slug인 경우 등록 캠페인에서 데이터 가져오기
  const is149402 = query.column === 'slug' && query.value === '149402'
  const is426307 = query.column === 'slug' && String(query.value) === '426307'
  const isWertSlug = is149402 || is426307
  
  // 426307은 OnePredictWebinarLivePage를 표시
  if (is426307) {
    console.log('[WebinarLivePage] 426307 slug 감지 → OnePredictWebinarLivePage 표시')
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    
    // 웨비나 데이터 조회 시도 (없어도 페이지는 표시)
    let campaignData = null
    
    try {
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
      console.log('[WebinarLivePage] 웨비나 조회 에러:', error)
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
    
    const { default: OnePredictWebinarLivePage } = await import('@/app/event/[...path]/components/OnePredictWebinarLivePage')
    const { Suspense } = await import('react')
    
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2936E7] mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }>
        <OnePredictWebinarLivePage campaign={campaignData} baseUrl={baseUrl} />
      </Suspense>
    )
  }
  
  const { data: webinar, error } = await queryBuilder.single()
  
  let finalWebinar = webinar
  
  // 웨비나가 없고 149402인 경우 등록 캠페인에서 데이터 가져오기
  if ((error || !webinar) && isWertSlug) {
    // 149402는 /149403 등록 캠페인에서 데이터 가져오기
    const campaignPath = '/149403'
    const slugValue = '149402'
    console.log(`[WebinarLivePage] ${slugValue} 웨비나가 없음 - ${campaignPath} 등록 캠페인에서 데이터 가져오기`)
    
    // 등록 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, description, client_id, agency_id, public_path, type')
      .eq('public_path', campaignPath)
      .eq('type', 'registration')
      .maybeSingle()
    
    if (campaignError || !campaign) {
      console.error(`[WebinarLivePage] ${campaignPath} 등록 캠페인 조회 실패:`, campaignError)
      redirect(`/webinar/${id}`)
    }
    
    // 등록 캠페인 정보로 웨비나 데이터 구성
    finalWebinar = {
      id: '00000000-0000-0000-0000-000000000000', // 임시 UUID
      slug: slugValue,
      title: campaign.title || '웨비나',
      description: campaign.description || '',
      youtube_url: '',
      start_time: '2026-02-06T14:00:00Z',
      end_time: '2026-02-06T15:30:00Z',
      access_policy: 'name_email_auth',
      client_id: campaign.client_id,
      agency_id: campaign.agency_id,
      registration_campaign_id: campaign.id,
      is_public: true,
      clients: null,
    } as any
    
    console.log('[WebinarLivePage] 등록 캠페인에서 웨비나 데이터 구성 완료')
  } else if (error || !webinar) {
    // 웨비나를 찾을 수 없으면 입장 페이지로 리다이렉트
    redirect(`/webinar/${id}`)
  } else {
    finalWebinar = webinar
  }
  
  // slug가 있으면 slug를 사용하고, 없으면 id를 사용 (리다이렉트용)
  const webinarId = finalWebinar.slug || finalWebinar.id
  
  // 사용자 정보 조회
  const { data: { user } } = await supabase.auth.getUser()
  
  // 콘솔에서 온 경우 로그인 체크만 하고 나머지 권한 체크는 모두 건너뛰기
  if (fromConsole) {
    if (!user) {
      // 관리자 모드는 로그인 필요
      redirect(`/webinar/${webinarId}`)
    }
    // 콘솔에서 온 경우는 모든 권한 체크를 건너뛰고 바로 관리자 모드로 접근 허용
    return <WebinarView webinar={webinar} isAdminMode={true} />
  }
  
  // 이메일 파라미터가 있고 로그인되지 않은 경우, 입장 페이지로 리다이렉트하여 자동 로그인 처리
  const emailParam = searchParamsData?.email as string | undefined
  if (emailParam && !user && webinar.access_policy === 'email_auth') {
    redirect(`/webinar/${webinarId}?email=${encodeURIComponent(emailParam)}`)
  }
  
  // 특정 이메일로 접속 시 자동 관리자 모드 활성화
  const isAutoAdminEmail = user && user.email === 'pd@ustudio.co.kr'
  if (isAutoAdminEmail) {
    isAdminMode = true
  }
  
  // 사용자가 있으면 해당 웨비나에 등록되어 있는지 확인 (관리자 모드가 아닐 때만 필수)
  // 먼저 관리자 권한이 있는지 확인하여 자동 관리자 모드 활성화 여부 결정
  let hasAdminPermission = false
  if (user) {
      // JWT app_metadata에서 슈퍼어드민 권한 확인
      const isSuperAdmin = !!user?.app_metadata?.is_super_admin
      
      if (isSuperAdmin) {
      hasAdminPermission = true
      } else {
        // 클라이언트 멤버십 확인 (Admin Supabase로 RLS 우회)
        const { data: clientMember } = await admin
          .from('client_members')
          .select('role')
          .eq('client_id', finalWebinar.client_id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        // 클라이언트 멤버는 모든 역할에서 운영 권한 부여 (owner, admin, operator, member)
        if (clientMember && ['owner', 'admin', 'operator', 'member'].includes(clientMember.role)) {
        hasAdminPermission = true
        } else {
          // 에이전시 멤버십 확인 (owner, admin만 운영 권한 부여)
          const { data: agencyMember } = await admin
            .from('agency_members')
            .select('role')
            .eq('agency_id', finalWebinar.agency_id)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
          hasAdminPermission = true
        }
      }
    }
    
    // URL 파라미터로 명시적으로 admin=true인 경우 관리자 모드 강제 활성화
    // 또는 관리자 권한이 있고 admin=false가 아닌 경우 자동 관리자 모드 활성화
    if (searchParamsData?.admin === 'true' || (hasAdminPermission && searchParamsData?.admin !== 'false')) {
            isAdminMode = true
          }
    
    // 관리자 모드가 아닐 때만 등록 확인
    if (!isAdminMode) {
      const { data: registration } = await admin
        .from('registrations')
        .select('webinar_id, user_id')
        .eq('webinar_id', finalWebinar.id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      // 등록되어 있지 않으면 입장 페이지로 리다이렉트 (웨비나별 독립 등록 필수)
      if (!registration) {
        redirect(`/webinar/${webinarId}`)
      }
    }
  }
  
  // 관리자 모드인 경우 권한 확인
  if (isAdminMode) {
    if (!user) {
      // 관리자 모드는 로그인 필요
      redirect(`/webinar/${webinarId}`)
    }
    
    // admin=true 파라미터가 명시적으로 있는 경우 권한 체크 완화
    // (대시보드나 콘솔에서 접근한 경우 이미 권한 체크를 완료했으므로)
    const explicitAdmin = searchParamsData?.admin === 'true'
    
    // 특정 이메일은 권한 확인 건너뛰기
    // admin=true가 명시적으로 있으면 권한 확인 완화 (대시보드/콘솔에서 온 경우)
    if (!isAutoAdminEmail && !explicitAdmin && !hasAdminPermission) {
        // 권한이 없으면 일반 입장 페이지로 리다이렉트
      redirect(`/webinar/${webinarId}`)
    }
  } else {
    // 일반 모드: 접근 정책 확인
    if (finalWebinar.access_policy === 'auth' && !user) {
      redirect(`/webinar/${webinarId}`)
    }
    
    // email_auth 정책: 등록된 이메일인지 확인
    if (finalWebinar.access_policy === 'email_auth' && user) {
      const { data: allowedEmail } = await admin
        .from('webinar_allowed_emails')
        .select('email')
        .eq('webinar_id', finalWebinar.id)
        .ilike('email', user.email?.toLowerCase() || '')
        .maybeSingle()
      
      if (!allowedEmail) {
        // 등록되지 않은 이메일이면 입장 페이지로 리다이렉트
        redirect(`/webinar/${webinarId}`)
      }
    }
    
    // name_email_auth 정책: 등록 페이지 캠페인에서 등록 확인 (이름+이메일)
    if (finalWebinar.access_policy === 'name_email_auth' && user && finalWebinar.registration_campaign_id) {
      // 등록 페이지 캠페인에 등록된 사용자인지 확인은 WebinarEntry에서 이미 처리됨
      // 여기서는 추가 검증이 필요하면 구현
    }
  }
  
  return <WebinarView webinar={finalWebinar} isAdminMode={isAdminMode} />
}

