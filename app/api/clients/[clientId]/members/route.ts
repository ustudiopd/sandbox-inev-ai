import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { email, password, displayName, nickname, role = 'member' } = await req.json()
    
    if (!email) {
      return NextResponse.json(
        { error: '이메일은 필수입니다' },
        { status: 400 }
      )
    }
    
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다' },
        { status: 400 }
      )
    }
    
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
    
    const emailLower = email.toLowerCase().trim()
    
    // 기존 사용자 확인
    let userId: string | null = null
    let isNewUser = false
    
    // 이메일로 사용자 찾기
    const { data: usersData } = await admin.auth.admin.listUsers()
    const existingUser = usersData?.users.find(
      u => u.email?.toLowerCase() === emailLower
    )
    
    if (existingUser) {
      userId = existingUser.id
      console.log('기존 사용자 발견:', userId)
      
      // 기존 사용자의 비밀번호 업데이트
      const { error: updatePasswordError } = await admin.auth.admin.updateUserById(
        userId,
        { password: password }
      )
      
      if (updatePasswordError) {
        console.error('비밀번호 업데이트 오류:', updatePasswordError)
        // 비밀번호 업데이트 실패해도 계속 진행 (이미 멤버로 추가할 수 있음)
      } else {
        console.log('기존 사용자 비밀번호 업데이트 완료')
      }
    } else {
      // 새 사용자 생성
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: emailLower,
        password: password,
        email_confirm: true, // 이메일 인증 없이 바로 활성화
        user_metadata: {
          display_name: displayName || emailLower.split('@')[0],
          nickname: nickname || null,
          role: 'client',
        }
      })
      
      if (createError) {
        return NextResponse.json(
          { error: `사용자 생성 실패: ${createError.message}` },
          { status: 500 }
        )
      }
      
      if (!newUser.user) {
        return NextResponse.json(
          { error: '사용자 생성 실패' },
          { status: 500 }
        )
      }
      
      userId = newUser.user.id
      isNewUser = true
      console.log('새 사용자 생성:', userId)
    }
    
    // 프로필 확인 및 생성/업데이트
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    
    if (!existingProfile) {
      // 프로필 생성
      const { error: profileError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: emailLower,
          display_name: displayName || emailLower.split('@')[0],
          nickname: nickname || null,
        })
      
      if (profileError) {
        console.error('프로필 생성 오류:', profileError)
        // 프로필 생성 실패해도 계속 진행 (트리거가 생성할 수 있음)
      }
    } else {
      // 프로필 업데이트
      const updateData: any = { email: emailLower }
      if (displayName) updateData.display_name = displayName
      if (nickname) updateData.nickname = nickname
      
      await admin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
    }
    
    // 클라이언트 멤버 추가
    const { data: member, error: memberError } = await admin
      .from('client_members')
      .insert({
        client_id: clientId,
        user_id: userId,
        role: role,
      })
      .select()
      .single()
    
    if (memberError) {
      // 이미 멤버인 경우
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: '이미 클라이언트 멤버입니다' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 }
      )
    }
    
    // 감사 로그
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        agency_id: client.agency_id,
        client_id: clientId,
        action: 'CLIENT_MEMBER_ADD_DIRECT',
        payload: { email: emailLower, userId, isNewUser, role }
      })
    
    return NextResponse.json({ 
      success: true, 
      member,
      isNewUser,
      message: isNewUser 
        ? '새 사용자 계정을 생성하고 클라이언트 멤버로 추가했습니다' 
        : '기존 사용자를 클라이언트 멤버로 추가했습니다'
    })
  } catch (error: any) {
    console.error('멤버 추가 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
