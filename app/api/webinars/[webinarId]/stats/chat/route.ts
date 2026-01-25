import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'
import { parseStatsParams } from '@/lib/stats/utils'

/**
 * 채팅 통계 API
 * GET /api/webinars/[webinarId]/stats/chat?from=&to=&interval=
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const { searchParams } = new URL(request.url)

    console.log('[Stats Chat] 시작:', { webinarId, searchParams: Object.fromEntries(searchParams) })

    // 권한 확인
    const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
    if (!hasPermission || !webinar) {
      console.error('[Stats Chat] 권한 없음:', { webinarId, hasPermission, webinar })
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const admin = createAdminSupabase()
    
    // 실제 웨비나 UUID 사용 (slug가 아닌)
    const actualWebinarId = webinar.id
    console.log('[Stats Chat] 웨비나 ID:', { webinarId, actualWebinarId })

    // 웨비나 정보 조회 (시작/종료 시간)
    const { data: webinarInfo } = await admin
      .from('webinars')
      .select('start_time, end_time')
      .eq('id', actualWebinarId)
      .single()

    // 쿼리 파라미터 파싱
    const { from, to, intervalSeconds } = parseStatsParams(
      searchParams,
      webinarInfo?.start_time,
      webinarInfo?.end_time
    )

    // 기본 통계 (전체 기간 조회 - 날짜 필터 없음)
    console.log('[Stats Chat] 메시지 조회 시작:', { actualWebinarId })
    const { data: messages, error: messagesError } = await admin
      .from('messages')
      .select('id, user_id', { count: 'exact' })
      .eq('webinar_id', actualWebinarId)
      .eq('hidden', false)

    if (messagesError) {
      console.error('[Stats Chat] 메시지 조회 오류:', messagesError)
    }
    console.log('[Stats Chat] 메시지 조회 결과:', { count: messages?.length || 0, error: messagesError })

    const totalMessages = messages?.length || 0
    const uniqueSenders = new Set(messages?.map((m) => m.user_id)).size

    // 타임라인 (버킷별 집계) - SQL로 직접 집계하는 것이 더 효율적이지만, 
    // Supabase 클라이언트로도 가능하도록 구현
    const { data: timelineData } = await admin
      .from('messages')
      .select('created_at, user_id')
      .eq('webinar_id', actualWebinarId)
      .eq('hidden', false)
      .gte('created_at', from.toISOString())
      .lt('created_at', to.toISOString())
      .order('created_at', { ascending: true })

    // 클라이언트 측에서 버킷별 집계
    const timelineMap = new Map<string, { message_count: number; sender_count: Set<string> }>()
    timelineData?.forEach((msg) => {
      const bucketTime = new Date(msg.created_at)
      const bucketSeconds = Math.floor(bucketTime.getTime() / 1000 / intervalSeconds) * intervalSeconds
      const bucketKey = new Date(bucketSeconds * 1000).toISOString()

      if (!timelineMap.has(bucketKey)) {
        timelineMap.set(bucketKey, { message_count: 0, sender_count: new Set() })
      }
      const bucket = timelineMap.get(bucketKey)!
      bucket.message_count++
      bucket.sender_count.add(msg.user_id)
    })

    const timeline = Array.from(timelineMap.entries())
      .map(([time_slot, data]) => ({
        time_slot,
        message_count: data.message_count,
        sender_count: data.sender_count.size,
      }))
      .sort((a, b) => a.time_slot.localeCompare(b.time_slot))

    // Top senders
    const senderCounts = new Map<string, { count: number; user_id: string }>()
    messages?.forEach((msg) => {
      const current = senderCounts.get(msg.user_id) || { count: 0, user_id: msg.user_id }
      senderCounts.set(msg.user_id, { ...current, count: current.count + 1 })
    })

    const topSendersData = Array.from(senderCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 닉네임 조회
    const userIds = topSendersData.map((s) => s.user_id)
    const [registrationsData, profilesData] = await Promise.all([
      admin
        .from('registrations')
        .select('user_id, nickname')
        .eq('webinar_id', actualWebinarId)
        .in('user_id', userIds),
      admin
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds),
    ])

    const nicknameMap = new Map<string, string>()
    registrationsData.data?.forEach((r) => {
      if (r.nickname) nicknameMap.set(r.user_id, r.nickname)
    })
    profilesData.data?.forEach((p) => {
      if (p.nickname && !nicknameMap.has(p.id)) {
        nicknameMap.set(p.id, p.nickname)
      }
    })

    const topSenders = topSendersData.map((sender) => ({
      user_id: sender.user_id,
      nickname: nicknameMap.get(sender.user_id) || '익명',
      message_count: sender.count,
    }))

    // 피크 시간대
    const peakTimeEntry = timeline.length > 0
      ? timeline.reduce((max, entry) => (entry.message_count > max.message_count ? entry : max), timeline[0])
      : null

    // 채팅 참여율
    const { count: totalRegistrants } = await admin
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', actualWebinarId)

    const participationRate =
      totalRegistrants && totalRegistrants > 0
        ? (uniqueSenders / totalRegistrants) * 100
        : 0

    const responseData = {
      totalMessages,
      uniqueSenders,
      participationRate: Math.round(participationRate * 100) / 100,
      timeline,
      topSenders,
      peakTime: peakTimeEntry
        ? {
            time: peakTimeEntry.time_slot,
            messageCount: peakTimeEntry.message_count,
          }
        : null,
    }

    console.log('[Stats Chat] 응답 데이터:', {
      totalMessages,
      uniqueSenders,
      participationRate: responseData.participationRate,
      timelineLength: timeline.length,
      topSendersCount: topSenders.length
    })

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error: any) {
    console.error('[Stats Chat] 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || '통계 조회 실패' },
      { status: 500 }
    )
  }
}






