import { createAdminSupabase } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 크론: 웨비나 세션 자동 종료 (Sweeper)
 * 
 * Vercel Cron에서 10분마다 호출
 * 오래된 활성 세션(exited_at IS NULL)을 자동으로 종료 처리
 * 
 * GET /api/cron/webinar-session-sweeper?secret=CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 자동 인증 (권장)
    const authHeader = request.headers.get('authorization')
    
    // 로컬 테스트용: 쿼리 파라미터로 secret 확인
    const secretParam = request.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.CRON_SECRET

    // Vercel Cron 자동 인증 또는 수동 secret 검증
    const isAuthorized = 
      authHeader === `Bearer ${process.env.CRON_SECRET}` || // Vercel Cron 자동 인증
      (secretParam && expectedSecret && secretParam === expectedSecret) // 로컬 테스트용

    if (!isAuthorized) {
      console.error('[Cron Session Sweeper] 인증 실패')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const admin = createAdminSupabase()

    // stale timeout: 5분 (heartbeat가 5분 이상 없으면 종료)
    const staleTimeout = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // 오래된 활성 세션 찾기
    const { data: staleSessions, error: findError } = await admin
      .from('webinar_user_sessions')
      .select('id, last_heartbeat_at, entered_at')
      .is('exited_at', null)
      .or(`last_heartbeat_at.lt.${staleTimeout},and(last_heartbeat_at.is.null,entered_at.lt.${staleTimeout})`)

    if (findError) {
      console.error('[Cron Session Sweeper] 세션 조회 오류:', findError)
      return NextResponse.json(
        { success: false, error: '세션 조회 실패' },
        { status: 500 }
      )
    }

    if (!staleSessions || staleSessions.length === 0) {
      console.log('[Cron Session Sweeper] 종료할 세션이 없습니다.')
      return NextResponse.json({
        success: true,
        closedCount: 0,
        message: '종료할 세션이 없습니다.',
      })
    }

    // 각 세션을 종료 처리 (last_heartbeat_at 또는 entered_at을 exited_at으로 사용)
    let closedCount = 0
    const errors: any[] = []

    for (const session of staleSessions) {
      const exitedAt = session.last_heartbeat_at || session.entered_at
      
      const { error: updateError } = await admin
        .from('webinar_user_sessions')
        .update({
          exited_at: exitedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      if (updateError) {
        console.error(`[Cron Session Sweeper] 세션 ${session.id} 종료 실패:`, updateError)
        errors.push({ sessionId: session.id, error: updateError })
      } else {
        closedCount++
      }
    }

    console.log(`[Cron Session Sweeper] ${closedCount}개의 세션을 종료 처리했습니다.`)

    if (errors.length > 0) {
      console.error(`[Cron Session Sweeper] ${errors.length}개의 세션 종료 실패`)
    }

    return NextResponse.json({
      success: true,
      closedCount,
      totalFound: staleSessions.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[Cron Session Sweeper] 예상치 못한 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류' },
      { status: 500 }
    )
  }
}
