/**
 * 이벤트 slug를 code(숫자)로 변경하는 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/update-event-slug-to-code.ts --code=722895 [--execute]
 * 
 * --execute 플래그 없이는 실제 수정하지 않고 미리보기만 표시합니다.
 */

import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const executeFlag = args.includes('--execute')
const codeArg = args.find(arg => arg.startsWith('--code='))
const eventCode = codeArg ? codeArg.split('=')[1] : null

if (!eventCode) {
  console.error('❌ 이벤트 코드를 지정해주세요.')
  console.error('사용법: npx tsx scripts/update-event-slug-to-code.ts --code=722895 [--execute]')
  process.exit(1)
}

;(async () => {
  const admin = createAdminSupabase()

  try {
    // 이벤트 찾기 (code로)
    console.log(`📋 이벤트 조회 중: code = "${eventCode}"`)
    const { data: event, error: findError } = await admin
      .from('events')
      .select('id, code, slug, title')
      .eq('code', eventCode)
      .single()
    
    if (findError || !event) {
      console.error('❌ 이벤트를 찾을 수 없습니다:', findError)
      process.exit(1)
    }
    
    console.log('✅ 이벤트 찾음:')
    console.log(`   - ID: ${event.id}`)
    console.log(`   - 코드: ${event.code}`)
    console.log(`   - 제목: ${event.title}`)
    console.log(`   - 현재 slug: ${event.slug}`)
    console.log(`   - 새 slug (code): ${event.code}`)
    
    // 이미 slug가 code와 같으면 업데이트 불필요
    if (event.slug === event.code) {
      console.log('\n✅ slug가 이미 code와 동일합니다. 업데이트할 필요가 없습니다.')
      process.exit(0)
    }
    
    // 새 slug(code) 중복 체크 (다른 이벤트가 이미 사용 중인지)
    const { data: existing } = await admin
      .from('events')
      .select('id, code, title')
      .eq('slug', event.code)
      .neq('id', event.id)
      .maybeSingle()
    
    if (existing) {
      console.error(`❌ 새 slug "${event.code}"가 이미 다른 이벤트에서 사용 중입니다.`)
      console.error(`   - 사용 중인 이벤트 ID: ${existing.id}`)
      console.error(`   - 사용 중인 이벤트 코드: ${existing.code}`)
      console.error(`   - 사용 중인 이벤트 제목: ${existing.title}`)
      process.exit(1)
    }
    
    if (!executeFlag) {
      console.log('\n⚠️  --execute 플래그가 없어 실제 업데이트를 수행하지 않습니다.')
      console.log(`\n📝 실행할 작업:`)
      console.log(`   UPDATE events SET slug = '${event.code}' WHERE id = '${event.id}'`)
      console.log(`\n🔄 롤백 방법:`)
      console.log(`   UPDATE events SET slug = '${event.slug}' WHERE id = '${event.id}'`)
      console.log(`\n실제 업데이트를 수행하려면 --execute 플래그를 추가하세요:`)
      console.log(`   npx tsx scripts/update-event-slug-to-code.ts --code=${eventCode} --execute`)
      process.exit(0)
    }
    
    // slug 업데이트
    console.log(`\n🔄 slug 업데이트 중: "${event.slug}" → "${event.code}"`)
    const { error: updateError } = await admin
      .from('events')
      .update({ slug: event.code, updated_at: new Date().toISOString() })
      .eq('id', event.id)
    
    if (updateError) {
      console.error('❌ slug 업데이트 실패:', updateError)
      process.exit(1)
    }
    
    console.log('✅ slug 업데이트 완료!')
    console.log(`\n📌 변경 사항:`)
    console.log(`   - 이전 slug: ${event.slug}`)
    console.log(`   - 새 slug: ${event.code}`)
    console.log(`\n🔗 새로운 이벤트 URL: /event/${event.code}`)
    console.log(`\n🔄 롤백 방법:`)
    console.log(`   UPDATE events SET slug = '${event.slug}' WHERE id = '${event.id}'`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('예외 발생:', error)
    setTimeout(() => process.exit(1), 100)
  })
