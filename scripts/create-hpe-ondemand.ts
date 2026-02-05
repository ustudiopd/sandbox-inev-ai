/**
 * HPE Webinar Series 온디맨드 생성 스크립트
 * 
 * 사용법:
 * npx tsx scripts/create-hpe-ondemand.ts
 */

import { createAdminSupabase } from '@/lib/supabase/admin'
import { generateSlugFromTitle } from '@/lib/utils/gemini-slug'

async function createHPEOnDemand() {
  const admin = createAdminSupabase()
  
  // 클라이언트 ID (HPE)
  const clientId = 'b621c16a-ec75-4256-a65d-b722a13d865c'
  
  console.log('🔍 HPE 클라이언트 확인...\n')
  
  // 클라이언트 정보 조회
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name, agency_id')
    .eq('id', clientId)
    .single()
  
  if (clientError || !client) {
    console.error('❌ 클라이언트를 찾을 수 없습니다:', clientError)
    return
  }
  
  console.log(`✅ 클라이언트: ${client.name} (${client.id})`)
  console.log(`   Agency ID: ${client.agency_id}\n`)
  
  // 슬러그 생성
  const title = 'HPE Webinar Series'
  let slug: string | null = null
  
  // 1순위: 6자리 숫자로 자동 생성
  let generatedSlug: string | null = null
  let attempts = 0
  while (!generatedSlug && attempts < 100) {
    const randomSlug = Math.floor(100000 + Math.random() * 900000).toString()
    const { data: existing } = await admin
      .from('webinars')
      .select('id')
      .eq('slug', randomSlug)
      .maybeSingle()
    
    if (!existing) {
      generatedSlug = randomSlug
    }
    attempts++
  }
  
  if (generatedSlug) {
    slug = generatedSlug
    console.log(`✅ 슬러그 생성: ${slug} (6자리 숫자)`)
  } else {
    // 2순위: Gemini API로 영문 슬러그 생성
    try {
      slug = await generateSlugFromTitle(title)
      if (slug) {
        console.log(`✅ 슬러그 생성: ${slug} (Gemini)`)
      }
    } catch (error) {
      console.warn('⚠️ Gemini slug 생성 실패:', error)
    }
    
    // 3순위: 수동 생성
    if (!slug) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100)
      
      if (!slug) {
        slug = 'hpe-webinar-series-' + Date.now().toString(36)
      }
      console.log(`✅ 슬러그 생성: ${slug} (수동)`)
    }
    
    // 중복 체크
    let finalSlug = slug
    let counter = 0
    while (true) {
      const { data: existing } = await admin
        .from('webinars')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle()
      
      if (!existing) break
      
      counter++
      finalSlug = slug + '-' + counter
      if (counter > 1000) {
        finalSlug = slug + '-' + Date.now().toString(36)
        break
      }
    }
    slug = finalSlug
  }
  
  console.log(`\n📝 최종 슬러그: ${slug}\n`)
  
  // 세션 데이터 (온디맨드.md 기반)
  const sessions = [
    {
      session_key: 'platform_ai_native_networking',
      title: 'AI 네이티브 네트워킹 플랫폼이란 무엇인가',
      category_label: 'Platform',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 1,
      description: '',
    },
    {
      session_key: 'datacenter_ai_high_performance',
      title: 'AI 워크로드를 위한 고성능 네트워크 구축 방안',
      category_label: 'Data Center',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 2,
      description: '',
    },
    {
      session_key: 'campus_aruba_smart_experience',
      title: "'보이지 않는 연결, 보이는 경험' Aruba UXI와 첨단 기술로 전세계 최초로 완성한 Smart Experience",
      category_label: 'Campus & Branch',
      product_label: 'HPE Aruba Networking',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 3,
      description: "네트워크의 품질은 이제 단순히 '연결'이 아니라 '경험'으로 평가됩니다. HPE Aruba Networking 세션에서는 Aruba User Experience Insight(UXI) 를 통해 실제 사용자의 체감 품질을 실시간으로 가시화하고, 문제를 선제적으로 감지·해결하는 사례와 전세계 최초 HPE Aruba 솔루션으로 이룬HIMSS Stage7취득 & 802.11mc/802.11az 고정밀 위치기반 서비스를 소개합니다.",
    },
    {
      session_key: 'campus_juniper_fullstack_network',
      title: '클라이언트부터 클라우드까지, 최상의 경험을 제공하는 풀스택 네트워크의 구현',
      category_label: 'Campus & Branch',
      product_label: 'HPE Juniper Networking',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 4,
      description: '',
    },
  ]
  
  // settings JSONB 구성
  const settings = {
    ondemand: {
      sessions: sessions,
      qna_enabled: true,
      notify_emails: [], // TODO: 운영자 이메일 추가 필요
    },
  }
  
  console.log('📦 온디맨드 생성 중...\n')
  console.log('제목:', title)
  console.log('슬러그:', slug)
  console.log('세션 수:', sessions.length)
  console.log('\n세션 목록:')
  sessions.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.category_label}] ${s.title}`)
    console.log(`     session_key: ${s.session_key}`)
    console.log(`     asset_id: ${s.asset_id || '(입력 필요)'}`)
  })
  
  // asset_id가 비어있어도 생성 가능 (나중에 수정 가능)
  const hasEmptyAssetId = sessions.some(s => !s.asset_id)
  if (hasEmptyAssetId) {
    console.log('\n⚠️ 경고: 일부 세션의 asset_id가 비어있습니다.')
    console.log('   일단 생성하고 나중에 수정할 수 있습니다.\n')
  }
  
  // 온디맨드 생성
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .insert({
      agency_id: client.agency_id,
      client_id: clientId,
      title: title,
      project_name: title,
      description: 'HPE Networking On-demand 시리즈',
      youtube_url: '', // 온디맨드는 단일 YouTube URL 없음
      start_time: null,
      end_time: null,
      webinar_start_time: null,
      max_participants: null,
      is_public: true,
      access_policy: 'auth',
      slug,
      type: 'ondemand',
      settings: settings,
      created_by: null, // 스크립트 실행 시에는 null
    })
    .select()
    .single()
  
  if (webinarError) {
    console.error('❌ 온디맨드 생성 실패:', webinarError)
    return
  }
  
  console.log('\n✅ 온디맨드 생성 성공!')
  console.log(`   ID: ${webinar.id}`)
  console.log(`   슬러그: ${webinar.slug}`)
  console.log(`   제목: ${webinar.title}`)
  console.log(`\n🔗 접근 URL:`)
  console.log(`   랜딩: https://eventflow.kr/ondemand/${webinar.slug}`)
  console.log(`   세션 목록: https://eventflow.kr/ondemand/${webinar.slug}/watch`)
  sessions.forEach((s) => {
    console.log(`   ${s.title}: https://eventflow.kr/ondemand/${webinar.slug}/watch/${s.session_key}`)
  })
}

createHPEOnDemand().catch(console.error)
