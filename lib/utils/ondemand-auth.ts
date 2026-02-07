import { cookies } from 'next/headers'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export interface OnDemandAuthData {
  webinarId: string
  email: string
  name: string
  verifiedAt: number
}

/**
 * 온디맨드 인증 쿠키에서 인증 정보 가져오기
 */
export async function getOnDemandAuth(webinarId: string): Promise<OnDemandAuthData | null> {
  const cookieStore = await cookies()
  const authCookieName = `ondemand_auth_${webinarId}`
  const authCookie = cookieStore.get(authCookieName)
  
  if (!authCookie || !authCookie.value) {
    return null
  }
  
  try {
    const authData = JSON.parse(authCookie.value) as OnDemandAuthData
    
    // 웨비나 ID가 일치하는지 확인
    if (authData.webinarId !== webinarId) {
      return null
    }
    
    // 필수 필드 확인
    if (!authData.email || !authData.name) {
      return null
    }
    
    return authData
  } catch (error) {
    console.error('[getOnDemandAuth] 쿠키 파싱 오류:', error)
    return null
  }
}

/**
 * 온디맨드 등록 여부 확인
 */
export async function verifyOnDemandRegistration(
  webinarId: string,
  email: string,
  name: string
): Promise<boolean> {
  const admin = createAdminSupabase()
  
  // 온디맨드 정보 조회
  const { data: ondemand } = await admin
    .from('webinars')
    .select('id, registration_campaign_id')
    .eq('id', webinarId)
    .eq('type', 'ondemand')
    .maybeSingle()
  
  if (!ondemand) {
    return false
  }
  
  const emailLower = email.toLowerCase().trim()
  const nameTrimmed = name.trim()
  const campaignIdToCheck = ondemand.registration_campaign_id || ondemand.id
  
  // event_survey_entries 확인
  const { data: entries } = await admin
    .from('event_survey_entries')
    .select('id, name, registration_data')
    .eq('campaign_id', campaignIdToCheck)
    .eq('registration_data->>email', emailLower)
    .limit(10)
  
  if (entries && entries.length > 0) {
    // 이름으로 필터링
    const nameLower = nameTrimmed.toLowerCase().replace(/\s+/g, '').trim()
    
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
      
      if (regName) {
        const regNameNormalized = regName.toLowerCase().replace(/\s+/g, '').trim()
        
        // 정확히 일치하거나 서로 포함 관계인지 확인
        if (regNameNormalized === nameLower || 
            regNameNormalized.includes(nameLower) || 
            nameLower.includes(regNameNormalized)) {
          return true
        }
      } else {
        // 이름이 없으면 이메일만으로도 인정
        return true
      }
    }
  }
  
  // registrations 테이블 확인 (온디맨드 웨비나용)
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', emailLower)
    .maybeSingle()
  
  if (profile) {
    const { data: registration } = await admin
      .from('registrations')
      .select('webinar_id, user_id, registration_data')
      .eq('webinar_id', webinarId)
      .eq('user_id', profile.id)
      .maybeSingle()
    
    if (registration) {
      const regData = registration.registration_data as any
      const regName = regData?.name || registration.registration_data?.name
      
      if (regName) {
        const regNameNormalized = String(regName).toLowerCase().replace(/\s+/g, '').trim()
        const inputNameNormalized = nameTrimmed.toLowerCase().replace(/\s+/g, '').trim()
        
        if (regNameNormalized === inputNameNormalized || 
            regNameNormalized.includes(inputNameNormalized) || 
            inputNameNormalized.includes(regNameNormalized)) {
          return true
        }
      } else {
        // 이름이 없으면 이메일만으로 인정
        return true
      }
    }
  }
  
  return false
}

/**
 * 온디맨드 페이지 접근 시 인증 확인 및 리다이렉트
 * 인증되지 않은 경우 로그인 페이지로 리다이렉트
 * 
 * @param skipRegistrationCheck - 등록 여부 재확인을 건너뛸지 여부 (기본값: false)
 *                                 true인 경우 인증 쿠키만 확인하고 등록 여부는 확인하지 않음
 */
export async function requireOnDemandAuth(
  webinarId: string,
  webinarSlug?: string | null,
  skipRegistrationCheck: boolean = false
): Promise<OnDemandAuthData> {
  const authData = await getOnDemandAuth(webinarId)
  
  if (!authData) {
    const webinarPath = webinarSlug || webinarId
    redirect(`/ondemand/${webinarPath}/login`)
  }
  
  // 등록 여부 재확인 (선택적 - 성능 최적화를 위해 건너뛸 수 있음)
  // 인증 쿠키는 등록 확인 후에만 설정되므로, 보안상 문제 없음
  if (!skipRegistrationCheck) {
    const isRegistered = await verifyOnDemandRegistration(
      webinarId,
      authData.email,
      authData.name
    )
    
    if (!isRegistered) {
      const webinarPath = webinarSlug || webinarId
      redirect(`/ondemand/${webinarPath}/login`)
    }
  }
  
  return authData
}
