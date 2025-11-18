import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: 'token is required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 초대 토큰으로 클라이언트 정보 조회
    const { data: invite } = await admin
      .from('client_invitations')
      .select(`
        client_id,
        expires_at,
        clients (
          id,
          name
        )
      `)
      .eq('token', token)
      .eq('used', false)
      .maybeSingle()
    
    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      )
    }
    
    // 만료 확인
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation token has expired' },
        { status: 400 }
      )
    }
    
    // clients는 관계로 인해 배열일 수 있으므로 처리
    const client = Array.isArray(invite.clients) ? invite.clients[0] : invite.clients
    
    return NextResponse.json({
      clientId: invite.client_id,
      clientName: (client as any)?.name || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

