import { NextRequest, NextResponse } from 'next/server'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'
import { getChatStats } from '@/lib/stats/chat'

/**
 * 통합 통계 API
 * GET /api/webinars/[webinarId]/stats?sections=chat,qa,forms,...&from=&to=&interval=
 * 
 * sections: 조회할 섹션 목록 (쉼표로 구분)
 * - chat: 채팅 통계
 * - qa: Q&A 통계
 * - forms: 폼/퀴즈 통계
 * - giveaways: 추첨 통계
 * - files: 파일 통계
 * - registrants: 등록자 통계
 * - access: 접속 통계
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const { searchParams } = new URL(request.url)

    console.log('[Stats] 통합 통계 조회 시작:', { webinarId, searchParams: Object.fromEntries(searchParams) })

    // 권한 확인
    const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
    if (!hasPermission || !webinar) {
      console.error('[Stats] 권한 없음:', { webinarId, hasPermission, webinar })
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    console.log('[Stats] 권한 확인 완료:', { webinarId, webinar })

    // sections 파라미터 파싱
    const sectionsParam = searchParams.get('sections') || 'chat,qa,forms,giveaways,files,registrants,access,survey,sessions'
    const sections = sectionsParam.split(',').map((s) => s.trim())

    // 각 섹션별 API 호출 - 인증 헤더 전달
    const baseUrl = request.nextUrl.origin
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')
    
    const fetchOptions: RequestInit = {
      headers: {
        ...(authHeader && { 'authorization': authHeader }),
        ...(cookieHeader && { 'cookie': cookieHeader }),
      },
    }
    
    const statsPromises: Record<string, Promise<any>> = {}

    if (sections.includes('chat')) {
      // 직접 함수 호출 (HTTP fetch 대신)
      console.log('[Stats] chat 통계 직접 호출 시작:', { 
        webinarId: webinar.id, 
        hasStartTime: !!webinar.start_time,
        hasEndTime: !!webinar.end_time 
      })
      statsPromises.chat = getChatStats(webinar.id, searchParams, webinar.start_time, webinar.end_time)
        .then((data) => {
          console.log('[Stats] chat 통계 조회 성공:', { 
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            totalMessages: data?.totalMessages
          })
          return { success: true, data }
        })
        .catch((err) => {
          console.error('[Stats] chat 통계 조회 실패:', {
            error: err,
            message: err.message,
            stack: err.stack
          })
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('qa')) {
      statsPromises.qa = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/qa?${searchParams.toString()}`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] qa API 오류 (${res.status}):`, text)
            throw new Error(`qa API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] qa API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('forms')) {
      statsPromises.forms = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/forms?${searchParams.toString()}`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] forms API 오류 (${res.status}):`, text)
            throw new Error(`forms API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] forms API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('giveaways')) {
      statsPromises.giveaways = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/giveaways?${searchParams.toString()}`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] giveaways API 오류 (${res.status}):`, text)
            throw new Error(`giveaways API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] giveaways API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('files')) {
      statsPromises.files = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/files?${searchParams.toString()}`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] files API 오류 (${res.status}):`, text)
            throw new Error(`files API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] files API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('registrants')) {
      statsPromises.registrants = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/registrants?${searchParams.toString()}`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] registrants API 오류 (${res.status}):`, text)
            throw new Error(`registrants API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] registrants API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('access')) {
      statsPromises.access = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/access?${searchParams.toString()}`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] access API 오류 (${res.status}):`, text)
            throw new Error(`access API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] access API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('survey')) {
      statsPromises.survey = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/survey`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] survey API 오류 (${res.status}):`, text)
            throw new Error(`survey API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] survey API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    if (sections.includes('sessions')) {
      statsPromises.sessions = fetch(
        `${baseUrl}/api/webinars/${webinarId}/stats/sessions?${searchParams.toString()}`,
        fetchOptions
      )
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            console.error(`[Stats] sessions API 오류 (${res.status}):`, text)
            throw new Error(`sessions API 오류: ${res.status}`)
          }
          return res.json()
        })
        .catch((err) => {
          console.error('[Stats] sessions API 호출 실패:', err)
          return { success: false, error: err.message }
        })
    }

    // 모든 섹션 병렬 조회
    console.log('[Stats] 섹션별 API 호출 시작:', Object.keys(statsPromises))
    const results = await Promise.allSettled(Object.values(statsPromises))
    const sectionKeys = Object.keys(statsPromises)
    const stats: Record<string, any> = {}

    results.forEach((result, index) => {
      const sectionKey = sectionKeys[index]
      if (result.status === 'fulfilled' && result.value?.success) {
        stats[sectionKey] = result.value.data
        console.log(`[Stats] ${sectionKey} 조회 성공:`, {
          hasData: !!result.value.data,
          dataType: typeof result.value.data,
          dataKeys: result.value.data ? Object.keys(result.value.data) : [],
          dataPreview: result.value.data ? JSON.stringify(result.value.data).substring(0, 200) : 'null'
        })
      } else {
        stats[sectionKey] = null
        if (result.status === 'rejected') {
          console.error(`[Stats] ${sectionKey} 조회 실패 (rejected):`, {
            reason: result.reason,
            message: result.reason?.message,
            stack: result.reason?.stack
          })
        } else if (result.status === 'fulfilled') {
          if (result.value) {
            console.error(`[Stats] ${sectionKey} 조회 실패 (fulfilled but not success):`, {
              success: result.value.success,
              error: result.value.error,
              hasData: !!result.value.data,
              dataType: typeof result.value.data,
              fullResponse: JSON.stringify(result.value).substring(0, 500)
            })
          } else {
            console.error(`[Stats] ${sectionKey} 조회 실패 (fulfilled but no value):`, {
              status: result.status,
              value: result.value
            })
          }
        }
      }
    })

    console.log('[Stats] 통합 통계 조회 완료:', { 
      sections: Object.keys(stats),
      hasData: Object.values(stats).some(v => v !== null)
    })

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error('[Stats] 통합 통계 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || '통계 조회 실패' },
      { status: 500 }
    )
  }
}






