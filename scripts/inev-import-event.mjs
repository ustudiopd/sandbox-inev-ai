#!/usr/bin/env node
/**
 * inev Phase 8: 이벤트 단위 데이터 Import 스크립트
 * 
 * 사용법:
 *   node scripts/inev-import-event.mjs <manifestPath> <targetSupabaseUrl> <targetServiceRoleKey> [--dry-run]
 * 
 * 예시:
 *   node scripts/inev-import-event.mjs ./exports/event-123/event-abc123-manifest.json https://xxx.supabase.co xxx-key
 *   node scripts/inev-import-event.mjs ./exports/event-123/event-abc123-manifest.json https://xxx.supabase.co xxx-key --dry-run
 * 
 * 주의사항:
 *   - Import 전에 반드시 백업을 확인하세요
 *   - --dry-run 플래그로 실제 import 없이 검증만 수행 가능
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 이벤트 단위 데이터 Import
 */
async function importEvent(manifestPath, targetSupabaseUrl, targetServiceRoleKey, dryRun = false) {
  console.log(`📥 이벤트 Import 시작`)
  console.log(`📄 매니페스트: ${manifestPath}`)
  console.log(`🎯 대상 Supabase: ${targetSupabaseUrl}`)
  console.log(`🔧 Dry-run 모드: ${dryRun ? 'ON' : 'OFF'}`)

  if (!existsSync(manifestPath)) {
    throw new Error(`매니페스트 파일을 찾을 수 없습니다: ${manifestPath}`)
  }

  // 매니페스트 읽기
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  console.log(`\n📦 Export 정보:`)
  console.log(`   Event ID: ${manifest.event_id}`)
  console.log(`   Event Code: ${manifest.event?.code || 'N/A'}`)
  console.log(`   Client: ${manifest.client?.name || 'N/A'}`)
  console.log(`   Export 일시: ${manifest.exported_at}`)
  console.log(`   Source Event ID: ${manifest.source_event_id || manifest.event_id}`)
  console.log(`   Source Project Ref: ${manifest.source_project_ref || 'N/A'}`)
  
  // 중복 Import 방지: 이미 migrated_at이 있으면 경고
  if (manifest.migrated_at) {
    console.warn(`\n⚠️ 경고: 이 매니페스트는 이미 Import되었습니다 (migrated_at: ${manifest.migrated_at})`)
    console.warn(`   재Import 시 데이터 중복이 발생할 수 있습니다.`)
    if (!dryRun) {
      const readline = await import('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      const answer = await new Promise(resolve => {
        rl.question('계속 진행하시겠습니까? (yes/no): ', resolve)
      })
      rl.close()
      if (answer.toLowerCase() !== 'yes') {
        console.log('Import 취소됨')
        process.exit(0)
      }
    }
  }

  if (dryRun) {
    console.log('\n🔍 Dry-run 모드: 실제 import 없이 검증만 수행합니다.\n')
  } else {
    console.log('\n⚠️ 실제 Import 모드: 데이터가 대상 Supabase에 저장됩니다.\n')
  }

  const targetSupabase = createClient(targetSupabaseUrl, targetServiceRoleKey)

  try {
    // 1. Client 확인/생성
    console.log('1️⃣ Client 확인/생성 중...')
    const clientData = manifest.client
    if (!clientData) {
      throw new Error('Client 데이터가 없습니다.')
    }

    // Client slug로 기존 Client 확인
    const { data: existingClient } = await targetSupabase
      .from('clients')
      .select('id, name, slug')
      .eq('slug', clientData.slug)
      .maybeSingle()

    let clientId
    if (existingClient) {
      clientId = existingClient.id
      console.log(`   ✅ 기존 Client 발견: ${existingClient.name} (${existingClient.slug})`)
    } else {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] Client 생성 예정: ${clientData.name} (${clientData.slug})`)
        clientId = clientData.id // Dry-run에서는 원본 ID 사용
      } else {
        // Client 생성 (id는 새로 생성, slug는 유지)
        const { data: newClient, error: clientError } = await targetSupabase
          .from('clients')
          .insert({
            name: clientData.name,
            slug: clientData.slug,
            canonical_domain: clientData.canonical_domain || null,
            subdomain_domain: clientData.subdomain_domain || null,
          })
          .select()
          .single()

        if (clientError) {
          throw new Error(`Client 생성 실패: ${clientError.message}`)
        }

        clientId = newClient.id
        console.log(`   ✅ Client 생성 완료: ${newClient.name} (${newClient.slug})`)
      }
    }

    // ID 매핑 저장 (원본 ID → 새 ID)
    const idMapping = {
      clients: { [manifest.client.id]: clientId },
      events: {},
      leads: {},
      // ... 기타 테이블 매핑
    }

    // 2. Event 확인/생성
    console.log('\n2️⃣ Event 확인/생성 중...')
    const eventData = manifest.event
    if (!eventData) {
      throw new Error('Event 데이터가 없습니다.')
    }

    // Event code로 기존 Event 확인 (같은 client 내)
    const { data: existingEvent } = await targetSupabase
      .from('events')
      .select('id, code, slug')
      .eq('client_id', clientId)
      .eq('code', eventData.code)
      .maybeSingle()

    let eventId
    if (existingEvent) {
      eventId = existingEvent.id
      console.log(`   ✅ 기존 Event 발견: ${existingEvent.code} (${existingEvent.slug})`)
    } else {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] Event 생성 예정: ${eventData.code} (${eventData.slug})`)
        eventId = eventData.id // Dry-run에서는 원본 ID 사용
      } else {
        // Event 생성
        const { data: newEvent, error: eventError } = await targetSupabase
          .from('events')
          .insert({
            client_id: clientId,
            code: eventData.code,
            slug: eventData.slug,
            module_registration: eventData.module_registration ?? true,
            module_survey: eventData.module_survey ?? false,
            module_webinar: eventData.module_webinar ?? false,
            module_email: eventData.module_email ?? false,
            module_utm: eventData.module_utm ?? false,
            module_ondemand: eventData.module_ondemand ?? false,
          })
          .select()
          .single()

        if (eventError) {
          throw new Error(`Event 생성 실패: ${eventError.message}`)
        }

        eventId = newEvent.id
        idMapping.events[eventData.id] = eventId
        console.log(`   ✅ Event 생성 완료: ${newEvent.code} (${newEvent.slug})`)
      }
    }

    // 3. Leads Import
    console.log('\n3️⃣ Leads Import 중...')
    const leads = manifest.tables?.leads || []
    if (leads.length > 0) {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] ${leads.length}개 Leads Import 예정`)
      } else {
        // event_id를 새 eventId로 매핑
        const leadsToInsert = leads.map(lead => ({
          ...lead,
          id: undefined, // 새 ID 생성
          event_id: eventId,
        }))

        const { data: insertedLeads, error: leadsError } = await targetSupabase
          .from('leads')
          .insert(leadsToInsert)
          .select()

        if (leadsError) {
          throw new Error(`Leads Import 실패: ${leadsError.message}`)
        }

        // ID 매핑 저장
        leads.forEach((lead, index) => {
          idMapping.leads[lead.id] = insertedLeads[index].id
        })

        console.log(`   ✅ Leads Import 완료: ${insertedLeads.length}개`)
      }
    } else {
      console.log(`   ℹ️ Leads 없음 (스킵)`)
    }

    // 4. Event Participations Import
    console.log('\n4️⃣ Event Participations Import 중...')
    const participations = manifest.tables?.event_participations || []
    if (participations.length > 0) {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] ${participations.length}개 Event Participations Import 예정`)
      } else {
        const participationsToInsert = participations.map(participation => ({
          ...participation,
          id: undefined,
          event_id: eventId,
          lead_id: idMapping.leads[participation.lead_id] || participation.lead_id,
        }))

        const { data: insertedParticipations, error: participationsError } = await targetSupabase
          .from('event_participations')
          .insert(participationsToInsert)
          .select()

        if (participationsError) {
          throw new Error(`Event Participations Import 실패: ${participationsError.message}`)
        }

        console.log(`   ✅ Event Participations Import 완료: ${insertedParticipations.length}개`)
      }
    } else {
      console.log(`   ℹ️ Event Participations 없음 (스킵)`)
    }

    // 5. Event Survey Responses Import
    console.log('\n5️⃣ Event Survey Responses Import 중...')
    const responses = manifest.tables?.event_survey_responses || []
    if (responses.length > 0) {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] ${responses.length}개 Event Survey Responses Import 예정`)
      } else {
        const responsesToInsert = responses.map(response => ({
          ...response,
          id: undefined,
          event_id: eventId,
          lead_id: idMapping.leads[response.lead_id] || null,
        }))

        const { data: insertedResponses, error: responsesError } = await targetSupabase
          .from('event_survey_responses')
          .insert(responsesToInsert)
          .select()

        if (responsesError) {
          throw new Error(`Event Survey Responses Import 실패: ${responsesError.message}`)
        }

        console.log(`   ✅ Event Survey Responses Import 완료: ${insertedResponses.length}개`)
      }
    } else {
      console.log(`   ℹ️ Event Survey Responses 없음 (스킵)`)
    }

    // 6. Event Visits Import
    console.log('\n6️⃣ Event Visits Import 중...')
    const visits = manifest.tables?.event_visits || []
    if (visits.length > 0) {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] ${visits.length}개 Event Visits Import 예정`)
      } else {
        const visitsToInsert = visits.map(visit => ({
          ...visit,
          id: undefined,
          event_id: eventId,
          lead_id: idMapping.leads[visit.lead_id] || null,
        }))

        const { data: insertedVisits, error: visitsError } = await targetSupabase
          .from('event_visits')
          .insert(visitsToInsert)
          .select()

        if (visitsError) {
          throw new Error(`Event Visits Import 실패: ${visitsError.message}`)
        }

        console.log(`   ✅ Event Visits Import 완료: ${insertedVisits.length}개`)
      }
    } else {
      console.log(`   ℹ️ Event Visits 없음 (스킵)`)
    }

    // 7. Event Emails Import
    console.log('\n7️⃣ Event Emails Import 중...')
    const emails = manifest.tables?.event_emails || []
    if (emails.length > 0) {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] ${emails.length}개 Event Emails Import 예정`)
      } else {
        const emailsToInsert = emails.map(email => ({
          ...email,
          id: undefined,
          event_id: eventId,
        }))

        const { data: insertedEmails, error: emailsError } = await targetSupabase
          .from('event_emails')
          .insert(emailsToInsert)
          .select()

        if (emailsError) {
          throw new Error(`Event Emails Import 실패: ${emailsError.message}`)
        }

        console.log(`   ✅ Event Emails Import 완료: ${insertedEmails.length}개`)
      }
    } else {
      console.log(`   ℹ️ Event Emails 없음 (스킵)`)
    }

    // 8. Webinars Import (선택적, event_id가 있는 경우만)
    console.log('\n8️⃣ Webinars Import 중...')
    const webinars = manifest.tables?.webinars || []
    if (webinars.length > 0) {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] ${webinars.length}개 Webinars Import 예정`)
      } else {
        const webinarsToInsert = webinars.map(webinar => ({
          ...webinar,
          id: undefined,
          event_id: eventId,
          client_id: clientId,
        }))

        const { data: insertedWebinars, error: webinarsError } = await targetSupabase
          .from('webinars')
          .insert(webinarsToInsert)
          .select()

        if (webinarsError) {
          throw new Error(`Webinars Import 실패: ${webinarsError.message}`)
        }

        console.log(`   ✅ Webinars Import 완료: ${insertedWebinars.length}개`)
      }
    } else {
      console.log(`   ℹ️ Webinars 없음 (스킵)`)
    }

    // 9. Short Links Import (선택적)
    console.log('\n9️⃣ Short Links Import 중...')
    const shortLinks = manifest.tables?.short_links || []
    if (shortLinks.length > 0) {
      if (dryRun) {
        console.log(`   🔍 [Dry-run] ${shortLinks.length}개 Short Links Import 예정`)
      } else {
        const shortLinksToInsert = shortLinks
          .filter(link => link.event_id) // event_id가 있는 것만
          .map(link => ({
            ...link,
            id: undefined,
            event_id: eventId,
            webinar_id: null, // event_id가 있으면 webinar_id는 null
          }))

        if (shortLinksToInsert.length > 0) {
          const { data: insertedShortLinks, error: shortLinksError } = await targetSupabase
            .from('short_links')
            .insert(shortLinksToInsert)
            .select()

          if (shortLinksError) {
            throw new Error(`Short Links Import 실패: ${shortLinksError.message}`)
          }

          console.log(`   ✅ Short Links Import 완료: ${insertedShortLinks.length}개`)
        } else {
          console.log(`   ℹ️ Short Links 없음 (스킵)`)
        }
      }
    } else {
      console.log(`   ℹ️ Short Links 없음 (스킵)`)
    }

    // Import 완료 시 migrated_at 업데이트 (매니페스트 파일에 기록)
    if (!dryRun) {
      manifest.migrated_at = new Date().toISOString()
      const { writeFileSync } = await import('fs')
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
      console.log(`\n✅ 매니페스트 업데이트: migrated_at = ${manifest.migrated_at}`)
    }

    console.log('\n✅ Import 완료!')
    
    if (dryRun) {
      console.log('\n🔍 Dry-run 모드로 완료되었습니다. 실제 import를 수행하려면 --dry-run 플래그를 제거하세요.')
    } else {
      console.log('\n📊 Import 요약:')
      console.log(`   Event ID: ${eventId}`)
      console.log(`   Client ID: ${clientId}`)
      console.log(`   Source Event ID: ${manifest.source_event_id || manifest.event_id}`)
      console.log(`   Source Project Ref: ${manifest.source_project_ref || 'N/A'}`)
      console.log(`   Leads: ${leads.length}개`)
      console.log(`   Participations: ${participations.length}개`)
      console.log(`   Responses: ${responses.length}개`)
      console.log(`   Visits: ${visits.length}개`)
      console.log(`   Emails: ${emails.length}개`)
      console.log(`   Webinars: ${webinars.length}개`)
      console.log(`   Short Links: ${shortLinks.length}개`)
    }

    return { eventId, clientId, idMapping }
  } catch (error) {
    console.error('\n❌ Import 실패:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// 메인 실행
const manifestPath = process.argv[2]
const targetSupabaseUrl = process.argv[3]
const targetServiceRoleKey = process.argv[4]
const dryRun = process.argv.includes('--dry-run')

if (!manifestPath || !targetSupabaseUrl || !targetServiceRoleKey) {
  console.error('❌ 사용법: node scripts/inev-import-event.mjs <manifestPath> <targetSupabaseUrl> <targetServiceRoleKey> [--dry-run]')
  console.error('\n예시:')
  console.error('  node scripts/inev-import-event.mjs ./exports/event-123/event-abc123-manifest.json https://xxx.supabase.co xxx-key')
  console.error('  node scripts/inev-import-event.mjs ./exports/event-123/event-abc123-manifest.json https://xxx.supabase.co xxx-key --dry-run')
  process.exit(1)
}

importEvent(manifestPath, targetSupabaseUrl, targetServiceRoleKey, dryRun)
  .then(() => {
    console.log('\n🎉 Import 성공!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Import 실패:', error)
    process.exit(1)
  })
