import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 설문조사 참여 확인 API (공개)
 * POST /api/public/event-survey/[campaignId]/lookup
 * body: { name, phone }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const { name, phone } = await req.json()
    
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'name and phone are required' },
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
    
    // 전화번호 정규화 (숫자만 추출)
    const phoneNorm = phone.replace(/\D/g, '')
    
    if (!phoneNorm) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }
    
    // 참여 정보 조회 (이름과 전화번호 모두 일치해야 함)
    const { data: entry, error: entryError } = await admin
      .from('event_survey_entries')
      .select('survey_no, code6, name, verified_at, prize_label')
      .eq('campaign_id', campaignId)
      .eq('phone_norm', phoneNorm)
      .ilike('name', name.trim()) // 대소문자 구분 없이 이름 비교
      .maybeSingle()
    
    if (entryError) {
      console.error('참여 정보 조회 오류:', entryError)
      return NextResponse.json(
        { error: entryError.message },
        { status: 500 }
      )
    }
    
    if (!entry) {
      return NextResponse.json({
        completed: false,
        message: '참여 정보를 찾을 수 없습니다. 이름과 전화번호를 확인해주세요.',
      })
    }
    
    return NextResponse.json({
      completed: true,
      survey_no: entry.survey_no,
      code6: entry.code6,
      verified: !!entry.verified_at,
      prize_label: entry.prize_label || null,
    })
  } catch (error: any) {
    console.error('참여 확인 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

