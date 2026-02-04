import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminSupabase } from '../supabase/admin'

export interface AudienceRecipient {
  email: string
  displayName?: string
}

export interface AudienceQuery {
  type: 'webinar_registrants' | 'registration_campaign_registrants'
  webinar_id?: string
  campaign_id?: string
  exclude_entered?: boolean
}

/**
 * 대상자 조회
 * @param query 대상자 쿼리
 * @param admin Admin Supabase 클라이언트 (서버 전용)
 * @returns 대상자 목록
 */
export async function getAudience(
  query: AudienceQuery,
  admin: SupabaseClient = createAdminSupabase()
): Promise<AudienceRecipient[]> {
  if (query.type === 'webinar_registrants') {
    if (!query.webinar_id) {
      throw new Error('webinar_id가 필요합니다')
    }

    let q = admin
      .from('registrations')
      .select('email, display_name')
      .eq('webinar_id', query.webinar_id)
      .not('email', 'is', null)

    // Phase 1에서는 exclude_entered=false만 허용
    if (query.exclude_entered) {
      throw new Error('exclude_entered 기능은 Phase 2에서 구현 예정입니다')
    }

    const { data, error } = await q

    if (error) {
      console.error('대상자 조회 실패:', error)
      throw error
    }

    return (data || []).map(r => ({
      email: r.email!,
      displayName: r.display_name || undefined
    }))
  }

  if (query.type === 'registration_campaign_registrants') {
    if (!query.campaign_id) {
      throw new Error('campaign_id가 필요합니다')
    }

    // event_survey_entries에서 registration_data->>'email' 추출
    const { data, error } = await admin
      .from('event_survey_entries')
      .select('registration_data, name')
      .eq('campaign_id', query.campaign_id)
      .not('registration_data->email', 'is', null)

    if (error) {
      console.error('대상자 조회 실패:', error)
      throw error
    }

    // Phase 1에서는 exclude_entered=false만 허용
    if (query.exclude_entered) {
      throw new Error('exclude_entered 기능은 Phase 2에서 구현 예정입니다')
    }

    return (data || [])
      .map((r: any) => {
        const email = r.registration_data?.email
        if (!email) return null
        return {
          email: email.toLowerCase().trim(),
          displayName: r.name || undefined
        }
      })
      .filter(Boolean) as AudienceRecipient[]
  }

  throw new Error(`지원되지 않는 대상자 타입: ${query.type}`)
}

/**
 * 대상자 미리보기 (샘플 10명)
 */
export async function getAudiencePreview(
  query: AudienceQuery,
  admin: SupabaseClient = createAdminSupabase()
): Promise<{ totalCount: number; samples: AudienceRecipient[] }> {
  const allRecipients = await getAudience(query, admin)
  
  return {
    totalCount: allRecipients.length,
    samples: allRecipients.slice(0, 10)
  }
}
