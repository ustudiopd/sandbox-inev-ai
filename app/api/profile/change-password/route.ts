import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 사용자 비밀번호 변경 (자신의 비밀번호만 변경 가능)
 */
export async function POST(req: Request) {
  try {
    const { user } = await requireAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await req.json()

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 6자 이상이어야 합니다' },
        { status: 400 }
      )
    }

    // 현재 비밀번호 확인 (서버 Supabase로 인증 시도)
    const { createServerSupabase } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabase()
    
    // 현재 비밀번호로 로그인 시도하여 검증
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: '현재 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // Admin Supabase로 비밀번호 변경
    const admin = createAdminSupabase()
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('비밀번호 변경 오류:', updateError)
      return NextResponse.json(
        { error: updateError.message || '비밀번호 변경에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다',
    })
  } catch (error: any) {
    console.error('비밀번호 변경 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

