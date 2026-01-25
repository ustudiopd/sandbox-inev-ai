import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * /event/149403에 등록된 사용자인지 확인하는 API
 * POST /api/webinars/149404/check-registration
 * body: { email, name }
 */
export async function POST(req: Request) {
  try {
    const { email, name } = await req.json()
    
    if (!email || !name) {
      return NextResponse.json(
        { error: 'email and name are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // /event/149403 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id')
      .eq('public_path', '/149403')
      .eq('type', 'registration')
      .maybeSingle()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    const emailLower = email.trim().toLowerCase()
    const nameTrimmed = name.trim()
    
    // 등록 정보 조회 (이메일과 이름 모두 일치해야 함)
    const { data: entries, error: entryError } = await admin
      .from('event_survey_entries')
      .select('id, name, registration_data')
      .eq('campaign_id', campaign.id)
      .eq('registration_data->>email', emailLower)
    
    if (entryError) {
      console.error('등록 정보 조회 오류:', entryError)
      return NextResponse.json(
        { error: entryError.message },
        { status: 500 }
      )
    }
    
    if (!entries || entries.length === 0) {
      return NextResponse.json({
        registered: false,
        message: '등록 정보를 찾을 수 없습니다. /event/149403에서 먼저 등록해주세요.',
      })
    }
    
    // 이름으로 필터링 (여러 형식 지원)
    let foundEntry = null
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
      // 디버깅 정보 추가
      console.log('[check-registration] 이름 매칭 실패:', {
        requestedName: nameTrimmed,
        requestedEmail: emailLower,
        entriesFound: entries.length,
        entryNames: entries.map((e: any) => ({
          name: e.name,
          firstName: e.registration_data?.firstName,
          lastName: e.registration_data?.lastName,
        })),
      })
      
      return NextResponse.json({
        registered: false,
        message: '등록 정보를 찾을 수 없습니다. 이름을 확인해주세요.',
      })
    }
    
    return NextResponse.json({
      registered: true,
      entry: {
        id: foundEntry.id,
        name: foundEntry.name,
      },
    })
  } catch (error: any) {
    console.error('등록 확인 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
