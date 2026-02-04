import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarQuery } from '@/lib/utils/webinar'

/**
 * 웨비나 자동입장 API
 * POST /api/webinars/[webinarId]/enter
 * body: { email, name }
 * 
 * 등록 확인 후 입장 세션 생성 및 리다이렉트 URL 반환
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const { email, name } = await req.json()
    
    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'email and name are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // UUID 또는 slug로 웨비나 조회
    const query = getWebinarQuery(webinarId)
    
    // 웨비나 조회 (registration_campaign_id 포함)
    let queryBuilder = admin
      .from('webinars')
      .select('id, slug, registration_campaign_id')
    
    if (query.column === 'slug') {
      queryBuilder = queryBuilder.eq('slug', String(query.value))
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    const { data: webinar, error: webinarError } = await queryBuilder.maybeSingle()
    
    if (webinarError) {
      console.error('웨비나 조회 오류:', webinarError)
      return NextResponse.json(
        { success: false, error: webinarError.message },
        { status: 500 }
      )
    }
    
    if (!webinar) {
      return NextResponse.json(
        { success: false, error: 'Webinar not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    
    // email과 name 정규화
    const emailLower = email.trim().toLowerCase()
    const nameTrimmed = name.trim()
    
    // 등록 확인 (registration_campaign_id가 있는 경우)
    let foundEntry: { id: string; name: string | null } | null = null
    
    if (webinar.registration_campaign_id) {
      // 등록 페이지 캠페인 조회
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, client_id, public_path')
        .eq('id', webinar.registration_campaign_id)
        .maybeSingle()
      
      if (campaignError || !campaign) {
        return NextResponse.json(
          { success: false, error: 'Registration campaign not found', code: 'CAMPAIGN_NOT_FOUND' },
          { status: 404 }
        )
      }
      
      // 등록 정보 조회 (이메일과 이름 모두 일치해야 함)
      const { data: entries, error: entryError } = await admin
        .from('event_survey_entries')
        .select('id, name, registration_data')
        .eq('campaign_id', campaign.id)
        .eq('registration_data->>email', emailLower)
      
      if (entryError) {
        console.error('등록 정보 조회 오류:', entryError)
        return NextResponse.json(
          { success: false, error: entryError.message },
          { status: 500 }
        )
      }
      
      if (!entries || entries.length === 0) {
        return NextResponse.json({
          success: false,
          error: '등록 정보를 찾을 수 없습니다.',
          code: 'NOT_REGISTERED',
        })
      }
      
      // 이름으로 필터링 (여러 형식 지원)
      const nameLower = nameTrimmed.toLowerCase()
      
      for (const entry of entries) {
        const regData = (entry as any).registration_data
        
        // 1. entry.name 직접 비교 (가장 정확)
        if (entry.name && entry.name.trim().toLowerCase() === nameLower) {
          foundEntry = entry
          break
        }
        
        // 2. registration_data.name 비교 (새로운 형식)
        if (regData?.name && String(regData.name).trim().toLowerCase() === nameLower) {
          foundEntry = entry
          break
        }
        
        // 3. registration_data에서 이름 조합 비교 (기존 형식 호환)
        if (regData?.firstName && regData?.lastName) {
          const firstName = String(regData.firstName).trim()
          const lastName = String(regData.lastName).trim()
          
          // 여러 조합 시도
          const nameVariations = [
            `${lastName}${firstName}`,      // "양승철" (등록 시 저장 형식)
            `${firstName}${lastName}`,     // "승철양"
            `${lastName} ${firstName}`,      // "양 승철"
            `${firstName} ${lastName}`,     // "승철 양"
            firstName,                       // "승철"
            lastName,                        // "양"
          ]
          
          for (const variation of nameVariations) {
            if (variation.toLowerCase() === nameLower) {
              foundEntry = entry
              break
            }
          }
          
          if (foundEntry) break
        }
      }
      
      if (!foundEntry) {
        return NextResponse.json({
          success: false,
          error: '등록 정보를 찾을 수 없습니다. 성함을 확인해주세요.',
          code: 'NOT_REGISTERED',
        })
      }
    } else {
      // registration_campaign_id가 없는 경우, registrations 테이블에서 확인
      // 이 경우는 일반적인 웨비나 등록 방식
      // 여기서는 등록 페이지 연동 웨비나만 지원하므로 에러 반환
      return NextResponse.json({
        success: false,
        error: '이 웨비나는 등록 페이지와 연동되어 있지 않습니다.',
        code: 'NO_REGISTRATION_CAMPAIGN',
      })
    }
    
    // 입장 세션 생성 (쿠키/세션 설정)
    // 현재 시스템에서는 입장 로그를 기록하는 것으로 세션을 대체
    // 실제 세션 관리는 클라이언트에서 처리
    
    // foundEntry가 없으면 에러 (이론적으로는 도달 불가능하지만 타입 안전성을 위해)
    if (!foundEntry) {
      return NextResponse.json({
        success: false,
        error: '등록 정보를 찾을 수 없습니다.',
        code: 'NOT_REGISTERED',
      })
    }
    
    // 리다이렉트 URL 생성
    const webinarSlug = webinar.slug || webinar.id
    const redirectTo = `/webinar/${webinarSlug}/live`
    
    return NextResponse.json({
      success: true,
      redirectTo,
      entry: {
        id: foundEntry.id,
        name: foundEntry.name,
      },
    })
  } catch (error: any) {
    console.error('자동입장 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
