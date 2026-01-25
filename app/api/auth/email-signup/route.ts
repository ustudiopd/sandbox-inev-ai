import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 이메일 인증 가입 (비밀번호 없이 Magic Link 방식)
 * 등록된 이메일만 가입 가능
 */
export async function POST(req: Request) {
  try {
    const { email, nickname, webinarId } = await req.json()
    
    if (!email || !webinarId) {
      return NextResponse.json(
        { error: 'email and webinarId are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 웨비나 정보 확인
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, access_policy')
      .eq('id', webinarId)
      .single()
    
    if (webinarError || !webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // email_auth 또는 name_email_auth 정책인지 확인
    if (webinar.access_policy !== 'email_auth' && webinar.access_policy !== 'name_email_auth') {
      return NextResponse.json(
        { error: 'This webinar does not use email authentication' },
        { status: 400 }
      )
    }
    
    // 등록된 이메일인지 확인 (소문자로 비교)
    const emailLower = email.trim().toLowerCase()
    
    // 관리자 계정은 이메일 인증으로 접속 불가
    const adminEmails = ['pd@ustudio.co.kr']
    if (adminEmails.includes(emailLower)) {
      return NextResponse.json(
        { error: '관리자 계정은 이메일 인증으로 접속할 수 없습니다. 일반 로그인을 사용해주세요.' },
        { status: 403 }
      )
    }
    
    const { data: allowedEmail, error: emailCheckError } = await admin
      .from('webinar_allowed_emails')
      .select('email')
      .eq('webinar_id', webinarId)
      .eq('email', emailLower)
      .maybeSingle()
    
    if (emailCheckError) {
      return NextResponse.json(
        { error: 'Failed to check allowed emails' },
        { status: 500 }
      )
    }
    
    if (!allowedEmail) {
      return NextResponse.json(
        { error: '이 이메일 주소는 이 웨비나에 등록되지 않았습니다.' },
        { status: 403 }
      )
    }
    
    // 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    let userId: string
    
    // 먼저 사용자 생성 시도 (더 효율적)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true, // 이메일 인증 없이 바로 활성화
      user_metadata: {
        display_name: nickname?.trim() || email.trim().split('@')[0],
        nickname: nickname?.trim() || null,
        role: 'participant',
        webinar_id: webinarId,
      }
    })
    
    if (createError) {
      // 이미 등록된 이메일인 경우
      if (createError.message.includes('already been registered') || createError.message.includes('User already registered')) {
        // 페이지네이션을 고려하여 사용자 찾기
        let foundUser = null
        let page = 1
        const perPage = 1000
        
        while (!foundUser && page <= 10) { // 최대 10페이지까지 검색
          const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
            page,
            perPage,
          })
          
          if (listError) {
            console.error('사용자 목록 조회 실패:', listError)
            break
          }
          
          foundUser = usersData?.users.find(u => u.email?.toLowerCase() === emailLower)
          
          if (foundUser) {
            break
          }
          
          // 더 이상 사용자가 없으면 중단
          if (!usersData?.users || usersData.users.length < perPage) {
            break
          }
          
          page++
        }
        
        if (!foundUser) {
          return NextResponse.json(
            { error: '이미 등록된 이메일이지만 사용자 계정을 찾을 수 없습니다' },
            { status: 500 }
          )
        }
        
        userId = foundUser.id
        
        // 비밀번호 재설정
        const { error: updateError } = await admin.auth.admin.updateUserById(
          userId,
          {
            password: tempPassword,
            email_confirm: true,
          }
        )
        
        if (updateError) {
          console.error('기존 사용자 비밀번호 재설정 실패:', updateError)
          return NextResponse.json(
            { error: updateError.message || '비밀번호 재설정에 실패했습니다' },
            { status: 500 }
          )
        }
        
        // 프로필 업데이트 (닉네임이 제공된 경우)
        if (nickname?.trim()) {
          await admin
            .from('profiles')
            .update({
              nickname: nickname.trim(),
            })
            .eq('id', userId)
        }
      } else {
        return NextResponse.json(
          { error: createError.message || '사용자 생성에 실패했습니다' },
          { status: 500 }
        )
      }
    } else if (!newUser.user) {
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다' },
        { status: 500 }
      )
    } else {
      // 새 사용자 생성 성공
      userId = newUser.user.id
      
      // 프로필 생성
      const finalDisplayName = nickname?.trim() || email.trim().split('@')[0]
      await admin
        .from('profiles')
        .upsert({
          id: userId,
          email: email.trim(),
          display_name: finalDisplayName,
          nickname: nickname?.trim() || null,
        }, {
          onConflict: 'id'
        })
    }
    
    // 비밀번호로 바로 로그인할 수 있도록 이메일과 비밀번호 반환
    return NextResponse.json({ 
      success: true,
      email: email.trim(),
      password: tempPassword
    })
  } catch (error: any) {
    console.error('이메일 인증 가입 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

