import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * 온디맨드 등록 여부 확인 API
 * POST /api/ondemand/[id]/check-registration
 * body: { email, name }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { email, name } = await req.json()
    
    if (!email || !name) {
      return NextResponse.json(
        { error: 'email and name are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // UUID 또는 slug로 온디맨드 조회
    const query = getOnDemandQuery(id)
    
    let queryBuilder = admin
      .from('webinars')
      .select('id, slug, registration_campaign_id')
      .eq('type', 'ondemand')
    
    if (query.column === 'slug') {
      queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    const { data: ondemand, error: ondemandError } = await queryBuilder.maybeSingle()
    
    if (ondemandError || !ondemand) {
      return NextResponse.json(
        { error: 'OnDemand not found' },
        { status: 404 }
      )
    }
    
    // registration_campaign_id가 있으면 해당 캠페인에서 확인
    // 없으면 웨비나 ID를 직접 사용해서 확인
    const campaignIdToCheck = ondemand.registration_campaign_id || ondemand.id
    
    if (campaignIdToCheck) {
      // 캠페인 또는 웨비나 ID로 조회
      let campaign = null
      const { data: campaignData, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('id', campaignIdToCheck)
        .maybeSingle()
      
      if (campaignData) {
        campaign = campaignData
      } else if (campaignIdToCheck === ondemand.id) {
        // 웨비나 ID를 직접 사용하는 경우
        campaign = { id: campaignIdToCheck }
      } else {
        return NextResponse.json({
          registered: false,
          message: '등록 정보를 찾을 수 없습니다.',
        })
      }
      
      const emailLower = email.trim().toLowerCase()
      const nameTrimmed = name.trim()
      
      // 등록 정보 조회 (웨비나 ID를 campaign_id로 사용)
      const { data: entries, error: entryError } = await admin
        .from('event_survey_entries')
        .select('id, name, registration_data')
        .eq('campaign_id', campaign.id)
        .eq('registration_data->>email', emailLower)
      
      if (entryError) {
        console.error('등록 정보 조회 오류:', entryError)
        return NextResponse.json({
          registered: false,
          message: '등록 정보를 찾을 수 없습니다.',
        })
      }
      
      if (entries && entries.length > 0) {
        // 이름으로 필터링
        const nameLower = nameTrimmed.toLowerCase()
        let foundEntry = null
        
        console.log('[check-registration] 이메일로 찾은 엔트리 수:', entries.length)
        console.log('[check-registration] 입력된 이름:', nameTrimmed, '이메일:', emailLower)
        
        for (const entry of entries) {
          const regData = (entry as any).registration_data as any
          const entryName = (entry as any).name
          
          // 이름 추출 우선순위: entry.name > registration_data.name > registration_data.firstName/lastName
          let regName = ''
          if (entryName) {
            regName = String(entryName).trim()
          } else if (regData) {
            if (regData.name) {
              regName = String(regData.name).trim()
            } else if (regData.firstName && regData.lastName) {
              regName = `${regData.lastName}${regData.firstName}`.trim()
            } else if (regData.firstName) {
              regName = String(regData.firstName).trim()
            } else if (regData.lastName) {
              regName = String(regData.lastName).trim()
            }
          }
          
          console.log('[check-registration] 엔트리 ID:', entry.id, '등록된 이름:', regName, 'entry.name:', entryName, 'registration_data:', JSON.stringify(regData))
          
          if (regName) {
            // 한글 이름은 대소문자 구분 없이 비교
            const regNameNormalized = regName.toLowerCase().replace(/\s+/g, '').trim()
            const inputNameNormalized = nameLower.replace(/\s+/g, '').trim()
            
            // 정확히 일치하거나 서로 포함 관계인지 확인
            if (regNameNormalized === inputNameNormalized || 
                regNameNormalized.includes(inputNameNormalized) || 
                inputNameNormalized.includes(regNameNormalized)) {
              console.log('[check-registration] 이름 매칭 성공:', regNameNormalized, '===', inputNameNormalized)
              foundEntry = entry
              break
            } else {
              console.log('[check-registration] 이름 매칭 실패:', regNameNormalized, '!==', inputNameNormalized)
            }
          } else {
            // 이름이 없으면 이메일만으로도 인정 (이름 필드가 비어있을 수 있음)
            console.log('[check-registration] 이름이 없는 엔트리, 이메일만으로 인정')
            foundEntry = entry
            break
          }
        }
        
        if (foundEntry) {
          // 로그인 성공 시 인증 쿠키 설정
          const cookieStore = await cookies()
          const authCookieValue = JSON.stringify({
            webinarId: ondemand.id,
            email: emailLower,
            name: nameTrimmed,
            verifiedAt: Date.now(),
          })
          
          const response = NextResponse.json({
            registered: true,
          })
          
          // httpOnly 쿠키로 설정하여 XSS 공격 방지
          // path를 '/'로 설정하여 모든 경로에서 접근 가능 (쿠키 이름에 웨비나 ID 포함으로 구분)
          response.cookies.set(`ondemand_auth_${ondemand.id}`, authCookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7일
            path: '/', // 모든 경로에서 접근 가능
          })
          
          return response
        }
      }
      
      // event_survey_entries에 없으면 registrations 테이블 확인 (온디맨드 웨비나용)
      console.log('[check-registration] event_survey_entries에 없음, registrations 테이블 확인 중...')
      
      // 이메일로 사용자 찾기
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle()
      
      if (profile) {
        // registrations 테이블에서 확인
        const { data: registration } = await admin
          .from('registrations')
          .select('webinar_id, user_id, registration_data')
          .eq('webinar_id', ondemand.id)
          .eq('user_id', profile.id)
          .maybeSingle()
        
        if (registration) {
          const regData = registration.registration_data as any
          const regName = regData?.name || registration.registration_data?.name
          
          if (regName) {
            const regNameNormalized = String(regName).toLowerCase().replace(/\s+/g, '').trim()
            const inputNameNormalized = nameTrimmed.toLowerCase().replace(/\s+/g, '').trim()
            
            // 이름이 일치하거나 포함 관계인지 확인 (이름 중복 허용이므로 이메일만 확인)
            if (regNameNormalized === inputNameNormalized || 
                regNameNormalized.includes(inputNameNormalized) || 
                inputNameNormalized.includes(regNameNormalized)) {
              console.log('[check-registration] registrations에서 이름 매칭 성공')
              
              // 로그인 성공 시 인증 쿠키 설정
              const authCookieValue = JSON.stringify({
                webinarId: ondemand.id,
                email: emailLower,
                name: nameTrimmed,
                verifiedAt: Date.now(),
              })
              
              const response = NextResponse.json({
                registered: true,
              })
              
              // httpOnly 쿠키로 설정하여 XSS 공격 방지
              // path를 '/'로 설정하여 모든 경로에서 접근 가능 (쿠키 이름에 웨비나 ID 포함으로 구분)
              response.cookies.set(`ondemand_auth_${ondemand.id}`, authCookieValue, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60, // 7일
                path: '/', // 모든 경로에서 접근 가능
              })
              
              return response
            }
          } else {
            // 이름이 없으면 이메일만으로 인정
            console.log('[check-registration] registrations에서 이메일만으로 인정')
            
            // 로그인 성공 시 인증 쿠키 설정
            const authCookieValue = JSON.stringify({
              webinarId: ondemand.id,
              email: emailLower,
              name: nameTrimmed,
              verifiedAt: Date.now(),
            })
            
            const response = NextResponse.json({
              registered: true,
            })
            
            // httpOnly 쿠키로 설정하여 XSS 공격 방지
            // path를 '/'로 설정하여 모든 경로에서 접근 가능 (쿠키 이름에 웨비나 ID 포함으로 구분)
            response.cookies.set(`ondemand_auth_${ondemand.id}`, authCookieValue, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60, // 7일
              path: '/', // 모든 경로에서 접근 가능
            })
            
            return response
          }
        }
      }
      
      console.log('[check-registration] 등록 정보를 찾지 못함')
    }
    
    // registration_campaign_id가 없거나 등록 정보를 찾지 못한 경우
    return NextResponse.json({
      registered: false,
      message: '등록 정보를 찾을 수 없습니다.',
    })
  } catch (error: any) {
    console.error('등록 확인 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
