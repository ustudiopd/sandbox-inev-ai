/**
 * 워트인텔리전트 웨비나 slug를 숫자로 변경하는 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/update-wert-webinar-slug.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const oldSlug = 'wert-summit-26'
const newSlug = '149404'

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 웨비나 찾기
    console.log(`웨비나 조회 중: slug = "${oldSlug}"`)
    const { data: webinar, error: findError } = await admin
      .from('webinars')
      .select('id, title, slug')
      .eq('slug', oldSlug)
      .single()
    
    if (findError || !webinar) {
      console.error('❌ 웨비나를 찾을 수 없습니다:', findError)
      process.exit(1)
    }
    
    console.log('✅ 웨비나 찾음:')
    console.log(`   - ID: ${webinar.id}`)
    console.log(`   - 제목: ${webinar.title}`)
    console.log(`   - 현재 slug: ${webinar.slug}`)
    
    // 새 slug 중복 체크
    const { data: existing } = await admin
      .from('webinars')
      .select('id')
      .eq('slug', newSlug)
      .maybeSingle()
    
    if (existing) {
      console.error(`❌ 새 slug "${newSlug}"가 이미 사용 중입니다.`)
      process.exit(1)
    }
    
    // slug 업데이트
    console.log(`\nslug 업데이트 중: "${oldSlug}" → "${newSlug}"`)
    const { error: updateError } = await admin
      .from('webinars')
      .update({ slug: newSlug })
      .eq('id', webinar.id)
    
    if (updateError) {
      console.error('❌ slug 업데이트 실패:', updateError)
      process.exit(1)
    }
    
    console.log('✅ slug 업데이트 완료!')
    console.log(`\n새로운 웨비나 URL: /webinar/${newSlug}`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
