import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { broadcastRaffleDraw } from '@/lib/webinar/broadcast'
import { sendEmailViaResend } from '@/lib/email/resend'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; giveawayId: string }> }
) {
  try {
    const { webinarId, giveawayId } = await params
    const { manualWinners } = await req.json().catch(() => ({}))
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 추첨 조회
    const { data: giveaway, error: giveawayError } = await admin
      .from('giveaways')
      .select('*')
      .eq('id', giveawayId)
      .eq('webinar_id', webinarId)
      .single()
    
    if (giveawayError || !giveaway) {
      return NextResponse.json(
        { error: 'Giveaway not found' },
        { status: 404 }
      )
    }
    
    if (giveaway.status !== 'open' && giveaway.status !== 'closed') {
      return NextResponse.json(
        { error: 'Giveaway must be open or closed to draw' },
        { status: 400 }
      )
    }
    
    // 권한 확인 (클라이언트 operator 이상 또는 에이전시 owner/admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle()
    
    let hasPermission = false
    
    if (profile?.is_super_admin) {
      hasPermission = true
    } else {
      // 클라이언트 멤버십 확인
      const { data: clientMember } = await supabase
        .from('client_members')
        .select('role')
        .eq('client_id', giveaway.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator', 'member'].includes(clientMember.role)) {
        hasPermission = true
      } else {
        // 에이전시 멤버십 확인 (owner/admin만 추첨 실행 가능)
        if (giveaway.agency_id) {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', giveaway.agency_id)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
            hasPermission = true
          }
        }
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 사용자 지정 방식인지 확인
    const isManualDraw = giveaway.draw_type === 'manual' && manualWinners && Array.isArray(manualWinners) && manualWinners.length > 0
    
    let winners: any[] = []
    
    if (isManualDraw) {
      // 사용자 지정 방식: 선택된 당첨자를 그대로 사용
      // 기존 당첨자 삭제
      await admin
        .from('giveaway_winners')
        .delete()
        .eq('giveaway_id', giveawayId)
      
      // 선택된 당첨자를 giveaway_winners에 삽입
      const insertData = (manualWinners as string[]).map((participantId: string, index: number) => ({
        giveaway_id: giveawayId,
        participant_id: participantId,
        rank: index + 1,
        proof_json: {
          draw_type: 'manual',
          selected_at: new Date().toISOString(),
        },
      }))
      
      const { data: insertedWinners, error: insertError } = await admin
        .from('giveaway_winners')
        .insert(insertData)
        .select()
      
      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        )
      }
      
      // winners 포맷팅
      winners = (insertedWinners || []).map((w: any) => ({
        participant_id: w.participant_id,
        rank: w.rank,
        proof: w.proof_json,
      }))
    } else {
      // 랜덤 추첨 방식: 기존 SQL 함수 사용
      const autoSeed = `${giveawayId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      
      const { data: drawnWinners, error: drawError } = await admin.rpc('draw_giveaway', {
        p_giveaway_id: giveawayId,
        p_seed: autoSeed,
      })
      
      if (drawError) {
        return NextResponse.json(
          { error: drawError.message },
          { status: 500 }
        )
      }
      
      winners = drawnWinners || []
    }
    
    // 추첨 상태 업데이트
    const updateData: any = {
      status: 'drawn',
      drawn_at: new Date().toISOString(),
    }
    
    // 랜덤 추첨 방식일 때만 seed_reveal 설정
    if (!isManualDraw) {
      const autoSeed = `${giveawayId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      updateData.seed_reveal = autoSeed
    }
    
    const { data: updatedGiveaway, error: updateError } = await admin
      .from('giveaways')
      .update(updateData)
      .eq('id', giveawayId)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    // 당첨자 사용자 정보 조회
    const participantIds = (winners || []).map((w: any) => w.participant_id)
    let profilesMap = new Map()
    
    if (participantIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, email')
        .in('id', participantIds)
      
      profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    }
    
    // 당첨자 데이터 포맷팅 (사용자 정보 포함)
    const formattedWinners = (winners || []).map((w: any) => {
      const profile = profilesMap.get(w.participant_id)
      return {
        participant_id: w.participant_id,
        rank: w.rank,
        proof: w.proof,
        user: profile ? {
          display_name: profile.display_name,
          email: profile.email,
        } : undefined,
      }
    })
    
    // 감사 로그
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        agency_id: giveaway.agency_id,
        client_id: giveaway.client_id,
        webinar_id: webinarId,
        action: 'GIVEAWAY_DRAW',
        payload: {
          giveaway_id: giveawayId,
          winners_count: winners?.length || 0,
        },
      })
    
    // Phase 3: DB draw 성공 후 Broadcast 전파
    broadcastRaffleDraw(webinarId, {
      giveaway: updatedGiveaway,
      winners: formattedWinners,
    }, user.id)
      .catch((error) => console.error('Broadcast 전파 실패:', error))
    
    // 당첨자 이메일로 결과 전송
    try {
      const winnerEmails = formattedWinners
        .map((w: any) => w.user?.email)
        .filter((email: any): email is string => !!email)
      
      if (winnerEmails.length > 0) {
        // 당첨자 리스트 HTML 생성 (이메일만 표시)
        const winnersListHtml = formattedWinners
          .sort((a: any, b: any) => a.rank - b.rank)
          .map((w: any) => {
            const email = w.user?.email || w.participant_id.substring(0, 8) + '...'
            return `<tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${w.rank}등</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
            </tr>`
          })
          .join('')

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              h1 { color: #7c3aed; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th { background-color: #7c3aed; color: white; padding: 12px; text-align: left; }
              td { padding: 8px; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎉 경품 추첨 결과</h1>
              <p>안녕하세요,</p>
              <p><strong>${updatedGiveaway.name}</strong> 추첨이 완료되었습니다.</p>
              <h2>당첨자 목록</h2>
              <table>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>이메일</th>
                  </tr>
                </thead>
                <tbody>
                  ${winnersListHtml}
                </tbody>
              </table>
              <p>축하합니다!</p>
            </div>
          </body>
          </html>
        `

        // 관리자에게 당첨자 리스트 이메일 전송
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle()

        if (adminProfile?.email) {
          await sendEmailViaResend({
            from: 'Inev.ai <notify@eventflow.kr>',
            to: adminProfile.email,
            subject: `[${updatedGiveaway.name}] 추첨 결과 - 당첨자 ${formattedWinners.length}명`,
            html: emailHtml,
          }).catch((error) => {
            console.error('당첨자 결과 이메일 전송 실패:', error)
          })
        }
      }
    } catch (emailError) {
      console.error('이메일 전송 중 오류:', emailError)
      // 이메일 전송 실패해도 추첨 결과는 반환
    }
    
    return NextResponse.json({
      success: true,
      winners: formattedWinners,
      giveaway: updatedGiveaway,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

