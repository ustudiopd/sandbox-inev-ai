#!/usr/bin/env node
/**
 * inev Phase 8: 이벤트 단위 데이터 Export 스크립트
 * 
 * 사용법:
 *   node scripts/inev-export-event.mjs <eventId> [outputDir]
 * 
 * 예시:
 *   node scripts/inev-export-event.mjs abc123-def456-ghi789 ./exports/event-123
 * 
 * 출력:
 *   - {outputDir}/event-{eventId}.json (메타데이터)
 *   - {outputDir}/event-{eventId}-{table}.json (각 테이블 데이터)
 *   - {outputDir}/event-{eventId}-manifest.json (전체 매니페스트)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 환경 변수 로드
function loadEnv() {
  const envPath = join(process.cwd(), '.env.local')
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key.trim()] = value.trim()
        }
      }
    })
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * 이벤트 단위 데이터 Export
 */
async function exportEvent(eventId, outputDir) {
  console.log(`📦 이벤트 Export 시작: ${eventId}`)
  console.log(`📁 출력 디렉토리: ${outputDir}`)
  
  // 출력 디렉토리 생성
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Supabase 프로젝트 ref 추출 (URL에서)
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown'

  const exportData = {
    event_id: eventId,
    exported_at: new Date().toISOString(),
    version: '1.0',
    source_event_id: eventId, // 불변키: 원본 Event ID (추적용)
    source_project_ref: projectRef, // 불변키: 원본 Supabase 프로젝트 ref
    migrated_at: null, // Import 시 설정됨
    tables: {},
  }

  try {
    // 1. Event 메타데이터 조회
    console.log('\n1️⃣ Event 메타데이터 조회 중...')
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      throw new Error(`Event를 찾을 수 없습니다: ${eventError?.message || 'Unknown error'}`)
    }

    exportData.event = event
    console.log(`   ✅ Event 조회 성공: ${event.code} (${event.slug})`)

    // 2. Client 정보 조회
    console.log('\n2️⃣ Client 정보 조회 중...')
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', event.client_id)
      .single()

    if (clientError || !client) {
      throw new Error(`Client를 찾을 수 없습니다: ${clientError?.message || 'Unknown error'}`)
    }

    exportData.client = client
    console.log(`   ✅ Client 조회 성공: ${client.name} (${client.slug})`)

    // 3. Leads (등록자) Export
    console.log('\n3️⃣ Leads Export 중...')
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('event_id', eventId)

    if (leadsError) {
      console.warn(`   ⚠️ Leads 조회 실패: ${leadsError.message}`)
      exportData.tables.leads = []
    } else {
      exportData.tables.leads = leads || []
      console.log(`   ✅ Leads Export 완료: ${exportData.tables.leads.length}개`)
    }

    // 4. Event Participations Export
    console.log('\n4️⃣ Event Participations Export 중...')
    const { data: participations, error: participationsError } = await supabase
      .from('event_participations')
      .select('*')
      .eq('event_id', eventId)

    if (participationsError) {
      console.warn(`   ⚠️ Event Participations 조회 실패: ${participationsError.message}`)
      exportData.tables.event_participations = []
    } else {
      exportData.tables.event_participations = participations || []
      console.log(`   ✅ Event Participations Export 완료: ${exportData.tables.event_participations.length}개`)
    }

    // 5. Event Survey Responses Export
    console.log('\n5️⃣ Event Survey Responses Export 중...')
    const { data: responses, error: responsesError } = await supabase
      .from('event_survey_responses')
      .select('*')
      .eq('event_id', eventId)

    if (responsesError) {
      console.warn(`   ⚠️ Event Survey Responses 조회 실패: ${responsesError.message}`)
      exportData.tables.event_survey_responses = []
    } else {
      exportData.tables.event_survey_responses = responses || []
      console.log(`   ✅ Event Survey Responses Export 완료: ${exportData.tables.event_survey_responses.length}개`)
    }

    // 6. Event Visits Export
    console.log('\n6️⃣ Event Visits Export 중...')
    const { data: visits, error: visitsError } = await supabase
      .from('event_visits')
      .select('*')
      .eq('event_id', eventId)

    if (visitsError) {
      console.warn(`   ⚠️ Event Visits 조회 실패: ${visitsError.message}`)
      exportData.tables.event_visits = []
    } else {
      exportData.tables.event_visits = visits || []
      console.log(`   ✅ Event Visits Export 완료: ${exportData.tables.event_visits.length}개`)
    }

    // 7. Event Emails Export
    console.log('\n7️⃣ Event Emails Export 중...')
    const { data: emails, error: emailsError } = await supabase
      .from('event_emails')
      .select('*')
      .eq('event_id', eventId)

    if (emailsError) {
      console.warn(`   ⚠️ Event Emails 조회 실패: ${emailsError.message}`)
      exportData.tables.event_emails = []
    } else {
      exportData.tables.event_emails = emails || []
      console.log(`   ✅ Event Emails Export 완료: ${exportData.tables.event_emails.length}개`)
    }

    // 8. Webinars Export (event_id로 연결된 웨비나)
    console.log('\n8️⃣ Webinars Export 중...')
    const { data: webinars, error: webinarsError } = await supabase
      .from('webinars')
      .select('*')
      .eq('event_id', eventId)

    if (webinarsError) {
      console.warn(`   ⚠️ Webinars 조회 실패: ${webinarsError.message}`)
      exportData.tables.webinars = []
    } else {
      exportData.tables.webinars = webinars || []
      console.log(`   ✅ Webinars Export 완료: ${exportData.tables.webinars.length}개`)
    }

    // 9. Short Links Export (event_id로 연결된 ShortLink)
    console.log('\n9️⃣ Short Links Export 중...')
    const { data: shortLinks, error: shortLinksError } = await supabase
      .from('short_links')
      .select('*')
      .eq('event_id', eventId)

    if (shortLinksError) {
      console.warn(`   ⚠️ Short Links 조회 실패: ${shortLinksError.message}`)
      exportData.tables.short_links = []
    } else {
      exportData.tables.short_links = shortLinks || []
      console.log(`   ✅ Short Links Export 완료: ${exportData.tables.short_links.length}개`)
    }

    // 10. Event Survey Campaigns Export (client_id로 연결된 캠페인, 선택적)
    console.log('\n🔟 Event Survey Campaigns Export 중...')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('event_survey_campaigns')
      .select('*')
      .eq('client_id', event.client_id)

    if (campaignsError) {
      console.warn(`   ⚠️ Event Survey Campaigns 조회 실패: ${campaignsError.message}`)
      exportData.tables.event_survey_campaigns = []
    } else {
      exportData.tables.event_survey_campaigns = campaigns || []
      console.log(`   ✅ Event Survey Campaigns Export 완료: ${exportData.tables.event_survey_campaigns.length}개`)
    }

    // 11. Event Access Logs Export (campaign_id로 연결된 로그, 선택적)
    if (exportData.tables.event_survey_campaigns.length > 0) {
      console.log('\n1️⃣1️⃣ Event Access Logs Export 중...')
      const campaignIds = exportData.tables.event_survey_campaigns.map(c => c.id)
      const { data: accessLogs, error: accessLogsError } = await supabase
        .from('event_access_logs')
        .select('*')
        .in('campaign_id', campaignIds)

      if (accessLogsError) {
        console.warn(`   ⚠️ Event Access Logs 조회 실패: ${accessLogsError.message}`)
        exportData.tables.event_access_logs = []
      } else {
        exportData.tables.event_access_logs = accessLogs || []
        console.log(`   ✅ Event Access Logs Export 완료: ${exportData.tables.event_access_logs.length}개`)
      }
    } else {
      exportData.tables.event_access_logs = []
    }

    // 12. 파일 저장
    console.log('\n💾 파일 저장 중...')
    
    // 매니페스트 파일 (전체 데이터)
    const manifestPath = join(outputDir, `event-${eventId}-manifest.json`)
    writeFileSync(manifestPath, JSON.stringify(exportData, null, 2), 'utf-8')
    console.log(`   ✅ 매니페스트 저장: ${manifestPath}`)

    // 개별 테이블 파일 (선택적, 큰 데이터셋의 경우)
    for (const [tableName, tableData] of Object.entries(exportData.tables)) {
      if (Array.isArray(tableData) && tableData.length > 0) {
        const tablePath = join(outputDir, `event-${eventId}-${tableName}.json`)
        writeFileSync(tablePath, JSON.stringify(tableData, null, 2), 'utf-8')
        console.log(`   ✅ ${tableName} 저장: ${tablePath} (${tableData.length}개 레코드)`)
      }
    }

    // 요약 정보
    const summary = {
      event_id: eventId,
      event_code: event.code,
      event_slug: event.slug,
      client_name: client.name,
      client_slug: client.slug,
      exported_at: exportData.exported_at,
      table_counts: Object.fromEntries(
        Object.entries(exportData.tables).map(([name, data]) => [
          name,
          Array.isArray(data) ? data.length : 0
        ])
      ),
    }

    const summaryPath = join(outputDir, `event-${eventId}-summary.json`)
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')
    console.log(`   ✅ 요약 저장: ${summaryPath}`)

    console.log('\n✅ Export 완료!')
    console.log('\n📊 Export 요약:')
    console.log(JSON.stringify(summary, null, 2))

    return exportData
  } catch (error) {
    console.error('\n❌ Export 실패:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// 메인 실행
const eventId = process.argv[2]
const outputDir = process.argv[3] || join(process.cwd(), 'exports', `event-${eventId}`)

if (!eventId) {
  console.error('❌ 사용법: node scripts/inev-export-event.mjs <eventId> [outputDir]')
  process.exit(1)
}

exportEvent(eventId, outputDir)
  .then(() => {
    console.log('\n🎉 Export 성공!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Export 실패:', error)
    process.exit(1)
  })
