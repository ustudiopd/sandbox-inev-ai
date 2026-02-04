import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * GET /api/client/emails/policy
 * 클라이언트 이메일 정책 조회
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId가 필요합니다' },
        { status: 400 }
      )
    }

    // 권한 확인
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer'])

    const admin = createAdminSupabase()

    // 클라이언트 이메일 정책 조회
    const { data: policy, error } = await admin
      .from('client_email_policies')
      .select('reply_to_default, from_name_default')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error) {
      console.error('이메일 정책 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: policy || null,
    })
  } catch (error: any) {
    console.error('이메일 정책 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
