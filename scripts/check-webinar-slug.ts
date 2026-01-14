import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env.local' })

async function checkWebinarSlug() {
  try {
    const admin = createAdminSupabase()
    
    console.log('=== 웨비나 slug 조회 테스트 ===\n')
    
    // 1. slug로 직접 조회
    console.log('1. slug "884372"로 조회:')
    const { data: webinarBySlug, error: slugError } = await admin
      .from('webinars')
      .select('id, slug, title')
      .eq('slug', '884372')
      .single()
    
    console.log('   결과:', {
      found: !!webinarBySlug,
      data: webinarBySlug,
      error: slugError ? {
        code: slugError.code,
        message: slugError.message,
        details: slugError.details,
        hint: slugError.hint
      } : null
    })
    
    // 2. 모든 웨비나의 slug 확인
    console.log('\n2. 모든 웨비나의 slug 확인:')
    const { data: allWebinars, error: allError } = await admin
      .from('webinars')
      .select('id, slug, title')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (allError) {
      console.error('   에러:', allError)
    } else {
      console.log('   총 개수:', allWebinars?.length || 0)
      allWebinars?.forEach((w, i) => {
        console.log(`   ${i + 1}. ID: ${w.id.substring(0, 8)}..., slug: "${w.slug}" (타입: ${typeof w.slug}), 제목: ${w.title?.substring(0, 30)}...`)
      })
    }
    
    // 3. slug가 숫자인 웨비나 찾기
    console.log('\n3. slug가 숫자인 웨비나 찾기:')
    const { data: numericSlugs, error: numericError } = await admin
      .from('webinars')
      .select('id, slug, title')
      .not('slug', 'is', null)
      .like('slug', '%884372%')
    
    if (numericError) {
      console.error('   에러:', numericError)
    } else {
      console.log('   찾은 개수:', numericSlugs?.length || 0)
      numericSlugs?.forEach((w, i) => {
        console.log(`   ${i + 1}. slug: "${w.slug}" (타입: ${typeof w.slug}), 제목: ${w.title}`)
      })
    }
    
    // 4. 문자열 타입으로 조회 시도
    console.log('\n4. 문자열 타입으로 명시적 조회:')
    const { data: stringSlug, error: stringError } = await admin
      .from('webinars')
      .select('id, slug, title')
      .eq('slug', String('884372'))
      .not('slug', 'is', null)
      .single()
    
    console.log('   결과:', {
      found: !!stringSlug,
      data: stringSlug,
      error: stringError ? {
        code: stringError.code,
        message: stringError.message
      } : null
    })
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

checkWebinarSlug()
