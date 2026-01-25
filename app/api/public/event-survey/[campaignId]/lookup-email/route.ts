import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 이메일과 이름으로 등록 정보 조회 API (공개)
 * POST /api/public/event-survey/[campaignId]/lookup-email
 * body: { email, name }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const { email, name } = await req.json()
    
    if (!email || !name) {
      return NextResponse.json(
        { error: 'email and name are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    const emailLower = email.trim().toLowerCase()
    const nameTrimmed = name.trim()
    
    // 등록 정보 조회 (이메일과 이름 모두 일치해야 함)
    // registration_data JSONB 필드에서 이메일로 먼저 필터링
    const { data: entries, error: entryError } = await admin
      .from('event_survey_entries')
      .select('survey_no, code6, name, registration_data')
      .eq('campaign_id', campaignId)
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
        found: false,
        message: '등록 정보를 찾을 수 없습니다. 이메일과 이름을 확인해주세요.',
      })
    }
    
    // 이름으로 필터링
    let foundEntry = null
    for (const entry of entries) {
      const regData = (entry as any).registration_data as any
      if (!regData) continue
      
      // 이름 비교: firstName + lastName 또는 name 필드
      let regName = ''
      if (regData.firstName && regData.lastName) {
        regName = `${regData.lastName}${regData.firstName}`.trim()
      } else if (regData.firstName) {
        regName = regData.firstName.trim()
      } else if (regData.lastName) {
        regName = regData.lastName.trim()
      } else if ((entry as any).name) {
        regName = (entry as any).name.trim()
      }
      
      // 이름 일치 확인 (포함 관계로 유연하게 비교)
      if (regName) {
        const regNameLower = regName.toLowerCase()
        const nameTrimmedLower = nameTrimmed.toLowerCase()
        
        // 정확히 일치하거나 서로 포함 관계인 경우
        if (regNameLower === nameTrimmedLower || 
            regNameLower.includes(nameTrimmedLower) || 
            nameTrimmedLower.includes(regNameLower)) {
          foundEntry = entry
          break
        }
      }
    }
    
    if (!foundEntry) {
      return NextResponse.json({
        found: false,
        message: '등록 정보를 찾을 수 없습니다. 이메일과 이름을 확인해주세요.',
      })
    }
    
    return NextResponse.json({
      found: true,
      survey_no: (foundEntry as any).survey_no,
      code6: (foundEntry as any).code6,
    })
  } catch (error: any) {
    console.error('등록 확인 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
