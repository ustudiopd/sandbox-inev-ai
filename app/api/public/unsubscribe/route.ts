import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 수신거부 설정 API
 * POST /api/public/unsubscribe
 * body: { email?, phone?, phone_norm?, unsubscribeEmail, unsubscribePhone, unsubscribeSms }
 */
export async function POST(req: Request) {
  try {
    const { email, phone, phone_norm, unsubscribeEmail, unsubscribePhone, unsubscribeSms } = await req.json()
    
    if (!email && !phone && !phone_norm) {
      return NextResponse.json(
        { error: 'email, phone, or phone_norm is required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 전화번호 정규화
    let normalizedPhone = phone_norm
    if (phone && !phone_norm) {
      normalizedPhone = phone.replace(/\D/g, '')
    }
    
    // 이메일 정규화 (소문자)
    const normalizedEmail = email ? email.trim().toLowerCase() : null
    
    // 기존 수신거부 정보 조회
    const { data: existing } = await admin
      .from('marketing_unsubscribes')
      .select('*')
      .or(
        normalizedEmail && normalizedPhone
          ? `email.eq.${normalizedEmail},phone_norm.eq.${normalizedPhone}`
          : normalizedEmail
          ? `email.eq.${normalizedEmail}`
          : `phone_norm.eq.${normalizedPhone}`
      )
      .maybeSingle()
    
    const unsubscribeData = {
      email: normalizedEmail,
      phone_norm: normalizedPhone || null,
      unsubscribe_email: unsubscribeEmail === true || unsubscribeEmail === 'true',
      unsubscribe_phone: unsubscribePhone === true || unsubscribePhone === 'true',
      unsubscribe_sms: unsubscribeSms === true || unsubscribeSms === 'true',
      unsubscribed_at: new Date().toISOString(),
    }
    
    if (existing) {
      // 기존 레코드 업데이트
      const { data: updated, error: updateError } = await admin
        .from('marketing_unsubscribes')
        .update({
          ...unsubscribeData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('수신거부 업데이트 오류:', updateError)
        return NextResponse.json(
          { error: 'Failed to update unsubscribe preferences' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: '수신거부 설정이 업데이트되었습니다.',
        unsubscribe: updated,
      })
    } else {
      // 새 레코드 생성
      const { data: created, error: insertError } = await admin
        .from('marketing_unsubscribes')
        .insert(unsubscribeData)
        .select()
        .single()
      
      if (insertError) {
        console.error('수신거부 생성 오류:', insertError)
        return NextResponse.json(
          { error: 'Failed to create unsubscribe preferences' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: '수신거부 설정이 완료되었습니다.',
        unsubscribe: created,
      })
    }
  } catch (error: any) {
    console.error('수신거부 API 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 수신거부 상태 조회 API
 * GET /api/public/unsubscribe?email=...&phone_norm=...
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const phone_norm = searchParams.get('phone_norm')
    
    if (!email && !phone_norm) {
      return NextResponse.json(
        { error: 'email or phone_norm is required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    const normalizedEmail = email ? email.trim().toLowerCase() : null
    
    const { data: unsubscribe, error } = await admin
      .from('marketing_unsubscribes')
      .select('*')
      .or(
        normalizedEmail && phone_norm
          ? `email.eq.${normalizedEmail},phone_norm.eq.${phone_norm}`
          : normalizedEmail
          ? `email.eq.${normalizedEmail}`
          : `phone_norm.eq.${phone_norm}`
      )
      .maybeSingle()
    
    if (error) {
      console.error('수신거부 조회 오류:', error)
      return NextResponse.json(
        { error: 'Failed to fetch unsubscribe preferences' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      unsubscribe: unsubscribe || {
        unsubscribe_email: false,
        unsubscribe_phone: false,
        unsubscribe_sms: false,
      },
    })
  } catch (error: any) {
    console.error('수신거부 조회 API 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
