import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 테스트 캠페인 링크 삭제 스크립트
 * "26년2월웨비나(테스트)" 링크를 삭제합니다.
 */
async function deleteTestCampaignLink() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!url || !serviceKey) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
    process.exit(1)
  }
  
  const admin = createClient(url, serviceKey)
  
  try {
    // 1. 워트인텔리전트 클라이언트 찾기
    console.log('🔍 워트인텔리전트 클라이언트 조회 중...')
    const { data: wertClients, error: clientError } = await admin
      .from('clients')
      .select('id, name')
      .or('name.ilike.%워트%,name.ilike.%Wert%,name.ilike.%wert%')
      .limit(10)
    
    if (clientError) {
      console.error('❌ 클라이언트 조회 실패:', clientError)
      process.exit(1)
    }
    
    if (!wertClients || wertClients.length === 0) {
      console.error('❌ 워트인텔리전트 클라이언트를 찾을 수 없습니다')
      process.exit(1)
    }
    
    const wertClient = wertClients.find(c => c.name.includes('워트') || c.name.includes('Wert')) || wertClients[0]
    console.log(`✅ 클라이언트 찾음: ${wertClient.name} (ID: ${wertClient.id})`)
    
    // 2. 테스트 링크 찾기
    console.log('\n🔍 테스트 링크 조회 중...')
    const { data: testLinks, error: linksError } = await admin
      .from('campaign_link_meta')
      .select('id, name, status, created_at')
      .eq('client_id', wertClient.id)
      .ilike('name', '%26년2월웨비나%테스트%')
    
    if (linksError) {
      console.error('❌ 링크 조회 실패:', linksError)
      process.exit(1)
    }
    
    if (!testLinks || testLinks.length === 0) {
      console.log('⚠️  테스트 링크를 찾을 수 없습니다.')
      console.log('   검색어: "26년2월웨비나(테스트)"')
      
      // 모든 링크 목록 표시
      const { data: allLinks } = await admin
        .from('campaign_link_meta')
        .select('id, name, status, created_at')
        .eq('client_id', wertClient.id)
        .order('created_at', { ascending: false })
      
      if (allLinks && allLinks.length > 0) {
        console.log('\n📋 현재 존재하는 링크 목록:')
        allLinks.forEach((link: any) => {
          console.log(`   - ${link.name} (ID: ${link.id}, 상태: ${link.status})`)
        })
      }
      
      process.exit(0)
    }
    
    console.log(`\n📋 찾은 테스트 링크 (${testLinks.length}개):`)
    testLinks.forEach((link: any) => {
      console.log(`   - ${link.name} (ID: ${link.id}, 상태: ${link.status})`)
    })
    
    // 3. 링크 삭제 (soft delete: archived)
    console.log('\n🗑️  링크 삭제 중...')
    for (const link of testLinks) {
      const { error: deleteError } = await admin
        .from('campaign_link_meta')
        .update({ status: 'archived' })
        .eq('id', link.id)
      
      if (deleteError) {
        console.error(`   ❌ 삭제 실패: ${link.name} - ${deleteError.message}`)
      } else {
        console.log(`   ✅ 삭제 완료: ${link.name}`)
      }
    }
    
    console.log('\n✅ 작업 완료')
  } catch (error: any) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

deleteTestCampaignLink()
