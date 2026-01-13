import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarStatus } from '@/lib/webinar/utils'

export const runtime = 'nodejs'

/**
 * 진행중인 웨비나 목록 조회 (공개 API)
 * 인증 없이 접근 가능
 */
export async function GET() {
  try {
    const admin = createAdminSupabase()
    const now = new Date().toISOString()
    
    // 공개 웨비나 중에서 시작 시간이 지난 웨비나 조회
    const { data: webinars, error } = await admin
      .from('webinars')
      .select('id, slug, title, start_time, end_time, is_public, access_policy')
      .eq('is_public', true)
      .lte('start_time', now)
      .order('start_time', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('진행중인 웨비나 조회 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    // 상태 확인하여 live인 웨비나만 필터링 (종료 시간이 지나지 않은 것)
    const liveWebinars = (webinars || []).filter(webinar => {
      const status = getWebinarStatus(webinar)
      return status === 'live'
    })
    
    return NextResponse.json({ webinars: liveWebinars.slice(0, 10) })
  } catch (error: any) {
    console.error('진행중인 웨비나 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

