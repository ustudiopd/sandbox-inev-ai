import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 폼 설정 확인 스크립트
 */

async function checkFormConfig(publicPath: string) {
  const admin = createAdminSupabase()

  console.log('='.repeat(60))
  console.log('폼 설정 확인')
  console.log('='.repeat(60))
  console.log(`public_path: ${publicPath}`)
  console.log('')

  // 캠페인 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, form_id, welcome_schema, completion_schema, display_schema')
    .eq('public_path', publicPath)
    .single()

  if (campaignError || !campaign) {
    console.error('❌ 캠페인을 찾을 수 없습니다:', campaignError)
    process.exit(1)
  }

  console.log(`✅ 캠페인 찾음: ${campaign.title} (ID: ${campaign.id})`)
  console.log(`   - form_id: ${campaign.form_id || '없음'}`)
  console.log(`   - welcome_schema: ${campaign.welcome_schema ? '있음' : '없음'}`)
  console.log(`   - completion_schema: ${campaign.completion_schema ? '있음' : '없음'}`)
  console.log(`   - display_schema: ${campaign.display_schema ? '있음' : '없음'}`)
  console.log('')

  if (campaign.welcome_schema) {
    console.log('welcome_schema:')
    console.log(JSON.stringify(campaign.welcome_schema, null, 2))
    console.log('')
  }

  if (campaign.completion_schema) {
    console.log('completion_schema:')
    console.log(JSON.stringify(campaign.completion_schema, null, 2))
    console.log('')
  }

  if (campaign.display_schema) {
    console.log('display_schema:')
    console.log(JSON.stringify(campaign.display_schema, null, 2))
    console.log('')
  }

  if (!campaign.form_id) {
    console.log('⚠️  폼이 연결되어 있지 않습니다.')
    return
  }

  // 폼 조회
  const { data: form, error: formError } = await admin
    .from('forms')
    .select('id, title, description, config')
    .eq('id', campaign.form_id)
    .single()

  if (formError || !form) {
    console.error('❌ 폼을 찾을 수 없습니다:', formError)
    return
  }

  console.log(`✅ 폼 찾음: ${form.title} (ID: ${form.id})`)
  console.log(`   - description: ${form.description || '(없음)'}`)
  console.log(`   - config: ${form.config ? '있음' : '없음'}`)
  console.log('')

  if (form.config) {
    console.log('config:')
    console.log(JSON.stringify(form.config, null, 2))
    console.log('')
  }
}

const args = process.argv.slice(2)

if (args.length < 1) {
  console.error('사용법: npx tsx scripts/check-form-config.ts <public_path>')
  console.error('예시: npx tsx scripts/check-form-config.ts /345870')
  process.exit(1)
}

const publicPath = args[0]

if (!publicPath.startsWith('/')) {
  console.error('❌ public_path는 /로 시작해야 합니다.')
  process.exit(1)
}

checkFormConfig(publicPath)
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error)
    process.exit(1)
  })
