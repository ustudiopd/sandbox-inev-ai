import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { generateSlugFromTitle } from '@/lib/utils/gemini-slug'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('온디맨드 생성 API 요청:', body)
    
    const { 
      clientId,
      title,
      projectName,
      description,
      type = 'ondemand',
      isPublic,
      accessPolicy,
      allowedEmails,
      publicPath, // 선택사항: 공개 경로 (slug로 사용)
      sessions, // 온디맨드 세션 배열
    } = body
    
    // title과 projectName 중 하나는 필수
    let finalTitle = title || projectName || ''
    let finalProjectName = projectName || title || null
    
    if (!clientId || !finalTitle) {
      console.error('필수 필드 누락:', { clientId, title, projectName })
      return NextResponse.json(
        { error: 'clientId와 title (또는 projectName)은 필수입니다' },
        { status: 400 }
      )
    }
    
    // 세션 검증
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json(
        { error: '최소 1개의 세션이 필요합니다' },
        { status: 400 }
      )
    }
    
    // 세션 유효성 검사 (asset_id는 나중에 추가 가능하도록 선택사항으로 변경)
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      if (!session.title) {
        return NextResponse.json(
          { error: `${i + 1}번째 세션의 제목은 필수입니다` },
          { status: 400 }
        )
      }
      // asset_id가 없으면 빈 문자열로 설정 (나중에 수정 가능)
      if (!session.asset_id) {
        sessions[i].asset_id = ''
      }
    }
    
    const admin = createAdminSupabase()
    
    // 클라이언트 정보 조회 (agency_id 가져오기)
    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .single()
    
    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    
    // 슈퍼 관리자는 항상 허용
    if (!profile?.is_super_admin) {
      // 클라이언트 멤버십 확인
      const { data: clientMember } = await supabase
        .from('client_members')
        .select('role')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (!clientMember) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
      
      // operator 이상만 생성 가능
      if (!['owner', 'admin', 'operator'].includes(clientMember.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions. Only owner, admin, or operator can create ondemand.' },
          { status: 403 }
        )
      }
    }
    
    // slug 생성 (웨비나 생성 로직과 동일)
    let slug: string | null = null
    
    if (publicPath) {
      // 사용자가 제공한 경로 사용
      const cleanPath = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath
      const { data: existing } = await admin
        .from('webinars')
        .select('id')
        .eq('slug', cleanPath)
        .maybeSingle()
      
      if (existing) {
        return NextResponse.json(
          { error: `slug "${cleanPath}"가 이미 사용 중입니다. 다른 경로를 사용해주세요.` },
          { status: 400 }
        )
      }
      
      slug = cleanPath
      console.log('사용자 제공 slug 사용:', slug)
    } else {
      // publicPath가 없으면 자동 생성
      // 1순위: 6자리 숫자로 자동 생성
      let generatedSlug: string | null = null
      let attempts = 0
      while (!generatedSlug && attempts < 100) {
        const randomSlug = Math.floor(100000 + Math.random() * 900000).toString()
        const { data: existing } = await admin
          .from('webinars')
          .select('id')
          .eq('slug', randomSlug)
          .maybeSingle()
        
        if (!existing) {
          generatedSlug = randomSlug
        }
        attempts++
      }
      
      if (generatedSlug) {
        slug = generatedSlug
        console.log('6자리 숫자 slug 자동 생성:', slug)
      } else {
        // 2순위: Gemini API로 영문 슬러그 생성
        try {
          slug = await generateSlugFromTitle(finalTitle)
          if (slug) {
            console.log('Gemini로 생성된 slug:', slug)
          }
        } catch (error) {
          console.warn('Gemini slug 생성 실패:', error)
        }
        
        // 3순위: 데이터베이스 함수 사용
        if (!slug) {
          const { data: slugResult, error: slugError } = await admin
            .rpc('generate_slug_from_title', { title: finalTitle })
          
          slug = slugResult as string | null
          if (slugError) {
            console.warn('DB RPC slug 생성 실패:', slugError)
          }
        }
        
        // 4순위: 수동으로 slug 생성 (간단한 버전)
        if (!slug) {
          console.warn('slug 생성 실패, 수동 생성 시도')
          slug = finalTitle
            .toLowerCase()
            .replace(/[^가-힣a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100)
            .replace(/^-+|-+$/g, '')
          
          if (!slug) {
            slug = 'ondemand-' + Date.now().toString(36)
          }
        }
        
        // 중복 체크 및 숫자 추가
        let finalSlug = slug
        let counter = 0
        while (true) {
          const { data: existing } = await admin
            .from('webinars')
            .select('id')
            .eq('slug', finalSlug)
            .maybeSingle()
          
          if (!existing) break
          
          counter++
          finalSlug = slug + '-' + counter
          if (counter > 1000) {
            finalSlug = slug + '-' + Date.now().toString(36)
            break
          }
        }
        slug = finalSlug
      }
    }
    
    // 세션 데이터 정리 및 settings JSONB 구성
    const cleanedSessions = sessions.map((s: any) => ({
      session_key: s.session_key || `s${s.order}`,
      title: s.title.trim(),
      description: s.description?.trim() || undefined,
      provider: s.provider || 'youtube',
      asset_id: s.asset_id?.trim() || '', // 빈 문자열 허용
      order: s.order,
      speaker: s.speaker?.trim() || undefined,
      category_label: s.category_label?.trim() || undefined,
      product_label: s.product_label?.trim() || undefined,
    }))
    
    // settings JSONB 구성
    const settings = {
      ondemand: {
        sessions: cleanedSessions,
        qna_enabled: true, // 기본값
        notify_emails: [], // 기본값 (나중에 설정 가능)
      },
    }
    
    // 온디맨드 웨비나 생성 (type='ondemand'로 설정)
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .insert({
        agency_id: client.agency_id,
        client_id: clientId,
        title: finalTitle,
        project_name: finalProjectName,
        description: description || null,
        youtube_url: '', // 온디맨드는 단일 YouTube URL 없음 (세션별로 관리)
        start_time: null, // 온디맨드는 시작 시간 없음
        end_time: null, // 온디맨드는 종료 시간 없음
        webinar_start_time: null, // 온디맨드는 시작 시간 없음
        max_participants: null, // 온디맨드는 참여자 제한 없음
        is_public: isPublic ?? false,
        access_policy: accessPolicy || 'auth',
        slug,
        type: 'ondemand', // 온디맨드 타입 설정
        settings: settings, // 세션 정보를 settings에 저장
        created_by: user.id,
      })
      .select()
      .single()
    
    if (webinarError) {
      console.error('온디맨드 생성 DB 오류:', webinarError)
      return NextResponse.json(
        { error: webinarError.message || '온디맨드 생성에 실패했습니다' },
        { status: 500 }
      )
    }
    
    console.log('온디맨드 생성 성공:', webinar.id, 'slug:', webinar.slug)
    
    // email_auth 정책인 경우 허용된 이메일 목록 저장
    if (accessPolicy === 'email_auth' && allowedEmails && Array.isArray(allowedEmails) && allowedEmails.length > 0) {
      const emailRows = allowedEmails.map((email: string) => ({
        webinar_id: webinar.id,
        email: email.trim().toLowerCase(),
      }))
      
      const { error: emailError } = await admin
        .from('webinar_allowed_emails')
        .insert(emailRows)
      
      if (emailError) {
        console.warn('허용된 이메일 저장 실패:', emailError)
        // 이메일 저장 실패해도 웨비나 생성은 성공으로 처리
      }
    }
    
    return NextResponse.json({
      success: true,
      webinar: {
        ...webinar,
        settings, // 응답에 settings 포함
      },
    })
  } catch (error: any) {
    console.error('온디맨드 생성 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
