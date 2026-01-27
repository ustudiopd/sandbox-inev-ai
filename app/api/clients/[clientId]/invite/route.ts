import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { email, expiresInDays = 7 } = await req.json()
    
    // 권한 확인 (클라이언트 owner/admin만)
    const { user } = await requireClientMember(clientId, ['owner', 'admin'])
    
    const admin = createAdminSupabase()
    
    // 클라이언트 정보 조회
    const { data: client } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', clientId)
      .single()
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    
    // 초대 토큰 생성
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    
    // client_invitations 테이블에 저장
    const { data: invitation, error: inviteError } = await admin
      .from('client_invitations')
      .insert({
        agency_id: client.agency_id,
        client_id: clientId,
        token,
        email: email || null,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single()
    
    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 500 }
      )
    }
    
    // 초대 링크 생성
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    
    if (!baseUrl) {
      const protocol = req.headers.get('x-forwarded-proto') || 
                      (req.url.startsWith('https://') ? 'https' : 'http')
      const host = req.headers.get('host') || 'localhost:3000'
      baseUrl = `${protocol}://${host}`
    }
    
    const inviteLink = `${baseUrl}/signup/client?token=${token}`
    
    // 감사 로그
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        agency_id: client.agency_id,
        client_id: clientId,
        action: 'CLIENT_MEMBER_INVITE',
        payload: { email, token }
      })
    
    return NextResponse.json({ 
      success: true, 
      invitation,
      inviteLink 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
