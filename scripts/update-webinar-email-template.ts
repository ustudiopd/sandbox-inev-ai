import { createAdminSupabase } from '../lib/supabase/admin'
import { getWebinarIdFromIdOrSlug } from '../lib/utils/webinar-query'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 웨비나 이메일 템플릿 업데이트 스크립트
 * 사용법: npx tsx scripts/update-webinar-email-template.ts <webinarIdOrSlug> <emailTemplateText>
 */
async function main() {
  const webinarIdOrSlug = process.argv[2]
  const emailTemplateText = process.argv[3]

  if (!webinarIdOrSlug || !emailTemplateText) {
    console.error('❌ 사용법: npx tsx scripts/update-webinar-email-template.ts <webinarIdOrSlug> <emailTemplateText>')
    console.error('예시: npx tsx scripts/update-webinar-email-template.ts 884372 "모두의 특강\\n\\nCES 2026 | 인간지능 x 인공지능 토크쇼\\n\\n에 신청해주셔서 감사합니다\\n\\n해당 라이브는\\n\\n2026.1.14일 19시에 시작합니다\\n\\n해당링크를 눌러 접속하시면됩니다"')
    process.exit(1)
  }

  try {
    const admin = createAdminSupabase()

    // 웨비나 ID 조회 (UUID 또는 slug)
    const actualWebinarId = await getWebinarIdFromIdOrSlug(webinarIdOrSlug)

    if (!actualWebinarId) {
      console.error(`❌ 웨비나를 찾을 수 없습니다: ${webinarIdOrSlug}`)
      process.exit(1)
    }

    // 웨비나 정보 조회
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, slug')
      .eq('id', actualWebinarId)
      .single()

    if (webinarError || !webinar) {
      console.error(`❌ 웨비나 조회 실패:`, webinarError?.message || '알 수 없는 오류')
      process.exit(1)
    }

    console.log('✅ 웨비나 찾음:')
    console.log(`   - ID: ${webinar.id}`)
    console.log(`   - 제목: ${webinar.title}`)
    console.log(`   - Slug: ${webinar.slug || '없음'}`)

    // 이메일 템플릿 업데이트
    const { error: updateError } = await admin
      .from('webinars')
      .update({ email_template_text: emailTemplateText })
      .eq('id', actualWebinarId)

    if (updateError) {
      console.error(`❌ 업데이트 실패:`, updateError.message)
      console.error('   참고: email_template_text 컬럼이 없을 수 있습니다. 마이그레이션 054를 확인하세요.')
      process.exit(1)
    }

    console.log(`\n✅ 이메일 템플릿 업데이트 완료!`)
    console.log(`\n업데이트된 템플릿:`)
    console.log('─'.repeat(50))
    console.log(emailTemplateText)
    console.log('─'.repeat(50))
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
