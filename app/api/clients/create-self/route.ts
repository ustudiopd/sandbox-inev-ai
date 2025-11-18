import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { name, userId, inviteToken, displayName, email } = await req.json()
    
    if (!name || !userId || !inviteToken) {
      return NextResponse.json(
        { error: 'name, userId, and inviteToken are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 프로필 확인 및 생성 (트리거가 늦게 실행될 수 있으므로 직접 생성)
    let { data: profile } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .eq('id', userId)
      .maybeSingle()
    
    if (!profile) {
      // 프로필이 없으면 생성 (최대 2초 대기 후 재시도)
      for (let i = 0; i < 20; i++) {
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id, email, display_name')
          .eq('id', userId)
          .maybeSingle()
        
        if (existingProfile) {
          profile = existingProfile
          break
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // 여전히 프로필이 없으면 직접 생성
      if (!profile) {
        // auth.users에서 이메일 가져오기
        const { data: authUser } = await admin.auth.admin.getUserById(userId)
        
        const { error: createError } = await admin
          .from('profiles')
          .insert({
            id: userId,
            email: authUser?.user?.email || null,
            display_name: authUser?.user?.user_metadata?.display_name || null,
          })
        
        if (createError) {
          // 이미 존재하는 경우 무시 (race condition)
          if (createError.code !== '23505') {
            return NextResponse.json(
              { error: `프로필 생성 실패: ${createError.message}` },
              { status: 500 }
            )
          }
        }
        
        // 생성 후 다시 조회
        const { data: newProfile } = await admin
          .from('profiles')
          .select('id, email, display_name')
          .eq('id', userId)
          .single()
        
        if (!newProfile) {
          return NextResponse.json(
            { error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
          )
        }
        
        profile = newProfile
      }
    }
    
    // 프로필 업데이트 (display_name, email)
    // 클라이언트에서 전달받은 정보 우선, 없으면 auth.users에서 가져오기
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const updateData: { display_name?: string | null; email?: string | null } = {}
    
    if (displayName) {
      updateData.display_name = displayName
    } else if (authUser?.user?.user_metadata?.display_name) {
      updateData.display_name = authUser.user.user_metadata.display_name
    }
    
    if (email) {
      updateData.email = email
    } else if (authUser?.user?.email) {
      updateData.email = authUser.user.email
    }
    
    if (Object.keys(updateData).length > 0) {
      await admin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
    }
    
    // 초대 토큰 검증
    const { data: invite } = await admin
      .from('client_invitations')
      .select('agency_id, client_id, expires_at')
      .eq('token', inviteToken)
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
    
    const agencyId = invite.agency_id
    const existingClientId = invite.client_id
    
    // client_id가 있는 경우 (기존 클라이언트에 멤버 추가)
    if (existingClientId) {
      // 클라이언트 존재 확인
      const { data: existingClient } = await admin
        .from('clients')
        .select('id, name')
        .eq('id', existingClientId)
        .single()
      
      if (!existingClient) {
        return NextResponse.json(
          { error: 'Invalid client' },
          { status: 400 }
        )
      }
      
      // 초대 토큰 사용 처리
      await admin
        .from('client_invitations')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', inviteToken)
      
      // 클라이언트 멤버 추가
      const { data: member, error: memberError } = await admin
        .from('client_members')
        .insert({
          client_id: existingClientId,
          user_id: userId,
          role: 'member',
        })
        .select()
        .single()
      
      if (memberError) {
        // 이미 멤버인 경우 무시
        if (memberError.code !== '23505') {
          return NextResponse.json(
            { error: memberError.message },
            { status: 500 }
          )
        }
      }
      
      // 감사 로그
      await admin
        .from('audit_logs')
        .insert({
          actor_user_id: userId,
          agency_id: agencyId,
          client_id: existingClientId,
          action: 'CLIENT_MEMBER_ADD',
          payload: { inviteToken }
        })
      
      return NextResponse.json({
        success: true,
        client: existingClient,
        isNewClient: false,
      })
    }
    
    // client_id가 없는 경우 (새 클라이언트 생성)
    // 초대 토큰 사용 처리
    await admin
      .from('client_invitations')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', inviteToken)
    
    // 에이전시 존재 확인
    const { data: agency } = await admin
      .from('agencies')
      .select('id')
      .eq('id', agencyId)
      .single()
    
    if (!agency) {
      return NextResponse.json(
        { error: 'Invalid agency' },
        { status: 400 }
      )
    }
    
    // 클라이언트 생성
    const { data: client, error: clientError } = await admin
      .from('clients')
      .insert({
        agency_id: agencyId,
        name
      })
      .select()
      .single()
    
    if (clientError) {
      return NextResponse.json(
        { error: clientError.message },
        { status: 500 }
      )
    }
    
    // 클라이언트 멤버십 생성 (owner 역할)
    const { error: memberError } = await admin
      .from('client_members')
      .insert({
        client_id: client.id,
        user_id: userId,
        role: 'owner'
      })
    
    if (memberError) {
      // 클라이언트 롤백
      await admin.from('clients').delete().eq('id', client.id)
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 }
      )
    }
    
    // 감사 로그
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: userId,
        agency_id: agencyId,
        client_id: client.id,
        action: 'CLIENT_SELF_CREATE',
        payload: { name, inviteToken }
      })
    
    return NextResponse.json({ success: true, client, isNewClient: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

