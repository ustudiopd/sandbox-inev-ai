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

    // 배치 업데이트 RPC 함수 호출 (최적화: 한 번의 쿼리로 모든 stale 세션 종료)
    const { data: result, error: rpcError } = await admin.rpc('batch_close_stale_sessions', {
      p_stale_timeout: staleTimeout,
    })

    if (rpcError) {
      console.error('[Cron Session Sweeper] 배치 업데이트 오류:', rpcError)
      return NextResponse.json(
        { success: false, error: '세션 종료 실패', details: rpcError },
        { status: 500 }
      )
    }

    const closedCount = result?.closed_count || 0

    if (closedCount === 0) {
      console.log('[Cron Session Sweeper] 종료할 세션이 없습니다.')
    } else {
      console.log(`[Cron Session Sweeper] ${closedCount}개의 세션을 배치로 종료 처리했습니다.`)
    }

    return NextResponse.json({
      success: true,
      closedCount,
      message: closedCount === 0 ? '종료할 세션이 없습니다.' : `${closedCount}개의 세션을 종료했습니다.`,
    })
  } catch (error: any) {
    console.error('[Cron Session Sweeper] 예상치 못한 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류' },
      { status: 500 }
    )
  }
}
