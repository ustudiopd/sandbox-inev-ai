import { createAdminSupabase } from '../lib/supabase/admin'
import { sendWebinarRegistrationEmail } from '../lib/email'
import { getWebinarIdFromIdOrSlug } from '../lib/utils/webinar-query'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 웨비나 등록 및 접속 안내 이메일 발송 스크립트
 * 사용법: npx tsx scripts/send-webinar-email.ts <webinarIdOrSlug> <email> <displayName>
 * 예시: npx tsx scripts/send-webinar-email.ts 884372 jubileo@naver.com "주빌레오"
 */
async function main() {
  const webinarIdOrSlug = process.argv[2]
  const email = process.argv[3]
  const displayName = process.argv[4] || email.split('@')[0]

  if (!webinarIdOrSlug || !email) {
    console.error('❌ 사용법: npx tsx scripts/send-webinar-email.ts <webinarIdOrSlug> <email> [displayName]')
    console.error('예시: npx tsx scripts/send-webinar-email.ts 884372 jubileo@naver.com "주빌레오"')
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
      .select('id, title, slug, start_time, access_policy')
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
    console.log(`   - 접근 정책: ${webinar.access_policy}`)

    const emailLower = email.trim().toLowerCase()

    // 이미 등록된 이메일인지 확인
    const { data: existingEmail } = await admin
      .from('webinar_allowed_emails')
      .select('email')
      .eq('webinar_id', actualWebinarId)
      .eq('email', emailLower)
      .maybeSingle()

    if (existingEmail) {
      console.log(`⚠️  이미 등록된 이메일 주소입니다: ${emailLower}`)
      console.log('이메일만 재발송합니다...')
    } else {
      // 등록된 이메일 목록에 추가
      const { error: insertError } = await admin
        .from('webinar_allowed_emails')
        .insert({
          webinar_id: actualWebinarId,
          email: emailLower,
          created_by: null,
        })

      if (insertError) {
        console.error(`❌ 등록 실패:`, insertError.message)
        process.exit(1)
      }
      console.log(`✅ 이메일 등록 완료: ${emailLower}`)
    }

    // 이메일 발송
    const webinarSlug = webinar.slug || actualWebinarId
    console.log(`\n📧 이메일 발송 중...`)
    console.log(`   - 수신자: ${email}`)
    console.log(`   - 이름: ${displayName}`)
    console.log(`   - 웨비나: ${webinar.title}`)

    const emailSent = await sendWebinarRegistrationEmail(
      email,
      displayName,
      webinar.title || '웨비나',
      webinarSlug,
      webinar.start_time
    )

    if (emailSent) {
      console.log(`\n✅ 이메일 발송 완료!`)
      console.log(`\n접속 링크: ${process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'}/webinar/${webinarSlug}?email=${encodeURIComponent(email)}`)
    } else {
      console.error(`\n❌ 이메일 발송 실패`)
      process.exit(1)
    }
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
