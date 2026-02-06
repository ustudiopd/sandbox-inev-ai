import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 여러 사용자의 프로필 정보를 한 번에 조회 (배치 조회)
 * 성능 최적화: 개별 API 호출 대신 IN 쿼리로 한 번에 조회
 */
export async function POST(req: Request) {
  try {
    const { userIds } = await req.json()
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array' },
        { status: 400 }
      )
    }
    
    // 최대 1000개까지만 조회 (성능 보호)
    if (userIds.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 userIds allowed per request' },
        { status: 400 }
      )
    }
    
    await requireAuth() // 인증 확인
    const admin = createAdminSupabase()
    
    // IN 쿼리로 한 번에 조회
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, display_name, email, nickname')
      .in('id', userIds)
    
    if (error) {
      console.error('[Batch Profiles API] 조회 오류:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      )
    }
    
    // 배열로 반환 (JSON 직렬화 가능)
    // 클라이언트에서 Map으로 변환하여 사용
    return NextResponse.json({ 
      profiles: profiles || [],
      count: profiles?.length || 0
    })
  } catch (error: any) {
    console.error('[Batch Profiles API] 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
