import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarQuery } from './webinar'

/**
 * 웨비나 ID 또는 slug로 웨비나를 조회하고 실제 UUID를 반환
 * @param idOrSlug 웨비나 ID (UUID) 또는 slug
 * @returns 실제 웨비나 UUID
 */
export async function getWebinarIdFromIdOrSlug(idOrSlug: string): Promise<string | null> {
  const admin = createAdminSupabase()
  const query = getWebinarQuery(idOrSlug)
  
  let queryBuilder = admin
    .from('webinars')
    .select('id')
  
  if (query.column === 'slug') {
    queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
  } else {
    queryBuilder = queryBuilder.eq(query.column, query.value)
  }
  
  const { data: webinar, error } = await queryBuilder.single()
  
  if (error || !webinar) {
    return null
  }
  
  return webinar.id
}
