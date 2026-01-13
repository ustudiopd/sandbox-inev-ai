import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

/**
 * 6자리 숫자 코드 생성 (100000 ~ 999999)
 */
function generate6DigitCode(): string {
  return Math.floor(Math.random() * 900000 + 100000).toString()
}

/**
 * 고유한 6자리 숫자 slug 생성
 */
async function generateUnique6DigitSlug(
  admin: ReturnType<typeof createAdminSupabase>
): Promise<string | null> {
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    const code = generate6DigitCode()
    
    // 중복 체크
    const { data: existing } = await admin
      .from('webinars')
      .select('id')
      .eq('slug', code)
      .maybeSingle()
    
    if (!existing) {
      return code
    }
    
    attempts++
  }
  
  console.error('6자리 숫자 slug 생성 실패: 최대 시도 횟수 초과')
  return null
}

async function updateWebinarSlug() {
  try {
    const admin = createAdminSupabase()
    
    // 현재 slug로 웨비나 찾기
    const currentSlug = 'ces-2026-human-ai-talk-show-special-lecture'
    
    console.log(`웨비나 조회 중: slug = "${currentSlug}"`)
    const { data: webinar, error: findError } = await admin
      .from('webinars')
      .select('id, title, slug')
      .eq('slug', currentSlug)
      .single()
    
    if (findError || !webinar) {
      console.error('❌ 웨비나를 찾을 수 없습니다:', findError)
      process.exit(1)
    }
    
    console.log('✅ 웨비나 찾음:')
    console.log(`   - ID: ${webinar.id}`)
    console.log(`   - 제목: ${webinar.title}`)
    console.log(`   - 현재 slug: ${webinar.slug}`)
    
    // 6자리 숫자 slug 생성
    console.log('\n6자리 숫자 slug 생성 중...')
    const newSlug = await generateUnique6DigitSlug(admin)
    
    if (!newSlug) {
      console.error('❌ 고유한 slug 생성 실패')
      process.exit(1)
    }
    
    console.log(`✅ 생성된 slug: ${newSlug}`)
    
    // slug 업데이트
    console.log('\nslug 업데이트 중...')
    const { error: updateError } = await admin
      .from('webinars')
      .update({ slug: newSlug })
      .eq('id', webinar.id)
    
    if (updateError) {
      console.error('❌ slug 업데이트 실패:', updateError)
      process.exit(1)
    }
    
    console.log('✅ slug 업데이트 완료!')
    console.log(`\n새로운 웨비나 URL: https://eventflow.kr/webinar/${newSlug}`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

updateWebinarSlug()
