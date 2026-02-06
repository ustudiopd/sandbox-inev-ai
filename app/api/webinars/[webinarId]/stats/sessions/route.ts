import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'
import { parseStatsParams } from '@/lib/stats/utils'

/**
 * 세션/시청시간 통계 API
 * GET /api/webinars/[webinarId]/stats/sessions?from=&to=
 * 
 * webinar_user_sessions 테이블 기반 시청시간 집계
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const { searchParams } = new URL(request.url)

    // 권한 확인
    const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
    if (!hasPermission || !webinar) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const admin = createAdminSupabase()
    const actualWebinarId = webinar.id

    // 웨비나 정보 조회 (시작/종료 시간)
    const { data: webinarInfo } = await admin
      .from('webinars')
      .select('start_time, webinar_start_time, end_time')
      .eq('id', actualWebinarId)
      .single()

    const webinarStartTime = webinarInfo?.webinar_start_time || webinarInfo?.start_time
    const webinarEndTime = webinarInfo?.end_time

    // 파라미터 파싱
    const { from, to } = parseStatsParams(searchParams, webinarStartTime, webinarEndTime)

    // 모든 세션 조회 (완료된 세션만)
    const { data: sessions, error: sessionsError } = await admin
      .from('webinar_user_sessions')
      .select('id, user_id, entered_at, exited_at, duration_seconds, watched_seconds_raw')
      .eq('webinar_id', actualWebinarId)
      .not('exited_at', 'is', null)
      .gte('entered_at', from.toISOString())
      .lte('entered_at', to.toISOString())

    if (sessionsError) {
      console.error('[Stats Sessions] 세션 조회 오류:', sessionsError)
      return NextResponse.json(
        { success: false, error: '세션 조회 실패' },
        { status: 500 }
      )
    }

    const sessionsList = sessions || []

    // 1. 개인별 시청시간 집계
    const userStatsMap = new Map<string, {
      userId: string
      visitCount: number
      totalWatchSeconds: number
      totalWatchedSecondsRaw: number
      firstEnteredAt: string | null
      lastExitedAt: string | null
    }>()

    sessionsList.forEach((session) => {
      if (!session.user_id) return // 게스트 제외

      const existing = userStatsMap.get(session.user_id) || {
        userId: session.user_id,
        visitCount: 0,
        totalWatchSeconds: 0,
        totalWatchedSecondsRaw: 0,
        firstEnteredAt: null,
        lastExitedAt: null,
      }

      existing.visitCount += 1
      existing.totalWatchSeconds += session.duration_seconds || 0
      existing.totalWatchedSecondsRaw += session.watched_seconds_raw || 0

      if (!existing.firstEnteredAt || session.entered_at < existing.firstEnteredAt) {
        existing.firstEnteredAt = session.entered_at
      }
      if (!existing.lastExitedAt || session.exited_at! > existing.lastExitedAt) {
        existing.lastExitedAt = session.exited_at!
      }

      userStatsMap.set(session.user_id, existing)
    })

    const userStats = Array.from(userStatsMap.values())

    // 프로필 정보 조회 (닉네임, 이메일)
    const userIds = userStats.map((u) => u.userId)
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, email, nickname')
      .in('id', userIds)

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    // 등록 정보 조회 (닉네임)
    const { data: registrations } = await admin
      .from('registrations')
      .select('user_id, nickname')
      .eq('webinar_id', actualWebinarId)
      .in('user_id', userIds)

    const registrationsMap = new Map(registrations?.map((r) => [r.user_id, r]) || [])

    // 개인별 통계에 프로필 정보 추가
    const userStatsWithProfile = userStats.map((stat) => {
      const profile = profilesMap.get(stat.userId)
      const registration = registrationsMap.get(stat.userId)
      const displayName = registration?.nickname || profile?.nickname || profile?.display_name || profile?.email || '익명'

      return {
        ...stat,
        displayName,
        email: profile?.email || null,
        avgWatchSeconds: stat.visitCount > 0 ? Math.round(stat.totalWatchSeconds / stat.visitCount) : 0,
        avgWatchedSecondsRaw: stat.visitCount > 0 ? Math.round(stat.totalWatchedSecondsRaw / stat.visitCount) : 0,
      }
    })

    // 2. 웨비나 전체 통계
    const totalSessions = sessionsList.length
    const uniqueUsers = userStats.length
    const totalWatchSeconds = sessionsList.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
    const totalWatchedSecondsRaw = sessionsList.reduce((sum, s) => sum + (s.watched_seconds_raw || 0), 0)
    const avgWatchSeconds = totalSessions > 0 ? Math.round(totalWatchSeconds / totalSessions) : 0
    const avgWatchedSecondsRaw = totalSessions > 0 ? Math.round(totalWatchedSecondsRaw / totalSessions) : 0

    // 3. 재입장 통계
    const returningUsers = userStats.filter((u) => u.visitCount >= 2).length
    const returningRate = uniqueUsers > 0 ? Math.round((returningUsers / uniqueUsers) * 100) : 0
    const avgVisitsPerUser = uniqueUsers > 0 ? Math.round((totalSessions / uniqueUsers) * 100) / 100 : 0

    // 4. 시청시간 분포
    const watchTimeDistribution = [
      { range: '5분 미만', min: 0, max: 300 },
      { range: '5-10분', min: 300, max: 600 },
      { range: '10-30분', min: 600, max: 1800 },
      { range: '30분-1시간', min: 1800, max: 3600 },
      { range: '1시간 이상', min: 3600, max: Infinity },
    ].map((range) => {
      const count = sessionsList.filter((s) => {
        const seconds = s.watched_seconds_raw || s.duration_seconds || 0
        return seconds >= range.min && seconds < range.max
      }).length
      return {
        range: range.range,
        count,
        percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
      }
    })

    // 5. 시청 완료율 (웨비나 길이가 있을 때만)
    let completionRate = null
    if (webinarStartTime && webinarEndTime) {
      const contentDurationSeconds = Math.floor(
        (new Date(webinarEndTime).getTime() - new Date(webinarStartTime).getTime()) / 1000
      )
      if (contentDurationSeconds > 0) {
        const avgCompletionRate = uniqueUsers > 0
          ? userStats.reduce((sum, u) => {
              const userRate = Math.min(1, u.totalWatchedSecondsRaw / contentDurationSeconds)
              return sum + userRate
            }, 0) / uniqueUsers
          : 0
        completionRate = Math.round(avgCompletionRate * 100)
      }
    }

    // 6. 시간대별 입장 분포 (타임라인)
    const timelineMap = new Map<string, number>()
    sessionsList.forEach((session) => {
      const enteredDate = new Date(session.entered_at)
      // 5분 단위로 버킷팅
      const bucketMinutes = Math.floor(enteredDate.getMinutes() / 5) * 5
      const bucketTime = new Date(enteredDate)
      bucketTime.setMinutes(bucketMinutes, 0, 0)
      const timeKey = bucketTime.toISOString()

      timelineMap.set(timeKey, (timelineMap.get(timeKey) || 0) + 1)
    })

    const timeline = Array.from(timelineMap.entries())
      .map(([time, count]) => ({ time, entryCount: count }))
      .sort((a, b) => a.time.localeCompare(b.time))

    return NextResponse.json({
      success: true,
      data: {
        // 전체 통계
        totalSessions,
        uniqueUsers,
        totalWatchSeconds,
        totalWatchedSecondsRaw,
        avgWatchSeconds,
        avgWatchedSecondsRaw,
        avgWatchMinutes: Math.round(avgWatchSeconds / 60),
        avgWatchedMinutesRaw: Math.round(avgWatchedSecondsRaw / 60),

        // 재입장 통계
        returningUsers,
        returningRate,
        avgVisitsPerUser,

        // 시청시간 분포
        watchTimeDistribution,

        // 시청 완료율
        completionRate,

        // 시간대별 입장 분포
        timeline,

        // 개인별 통계 (상위 20명)
        topUsers: userStatsWithProfile
          .sort((a, b) => b.totalWatchedSecondsRaw - a.totalWatchedSecondsRaw)
          .slice(0, 20)
          .map((u) => ({
            userId: u.userId,
            displayName: u.displayName,
            email: u.email,
            visitCount: u.visitCount,
            totalWatchMinutes: Math.round(u.totalWatchSeconds / 60),
            totalWatchedMinutesRaw: Math.round(u.totalWatchedSecondsRaw / 60),
            avgWatchMinutes: Math.round(u.avgWatchSeconds / 60),
            avgWatchedMinutesRaw: Math.round(u.avgWatchedSecondsRaw / 60),
            firstEnteredAt: u.firstEnteredAt,
            lastExitedAt: u.lastExitedAt,
          })),
      },
    })
  } catch (error: any) {
    console.error('[Stats Sessions] 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || '통계 조회 실패' },
      { status: 500 }
    )
  }
}
