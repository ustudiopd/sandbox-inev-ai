import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 워트인텔리전트 광고 시작일을 1월 16일로 설정하는 스크립트
 */
async function setWertCampaignStartDate() {
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
    
    // 2. 해당 클라이언트의 캠페인 링크 조회
    console.log('\n🔍 캠페인 링크 조회 중...')
    const { data: links, error: linksError } = await admin
      .from('campaign_link_meta')
      .select('id, name, status, created_at')
      .eq('client_id', wertClient.id)
      .order('created_at', { ascending: false })
    
    if (linksError) {
      console.error('❌ 캠페인 링크 조회 실패:', linksError)
      process.exit(1)
    }
    
    console.log(`\n📋 찾은 캠페인 링크 (${links?.length || 0}개):`)
    if (links && links.length > 0) {
      links.forEach((link: any) => {
        console.log(`   - ${link.name} (ID: ${link.id}, 상태: ${link.status})`)
      })
    } else {
      console.log('   캠페인 링크가 없습니다.')
      console.log('\n💡 캠페인 링크를 먼저 생성해주세요.')
      process.exit(0)
    }
    
    // 3. 시작일 설정 (2026년 1월 16일)
    const startDate = '2026-01-16'
    console.log(`\n📅 시작일 설정: ${startDate}`)
    
    // 4. 모든 캠페인 링크에 시작일 설정
    if (links && links.length > 0) {
      let updatedCount = 0
      for (const link of links) {
        console.log(`\n🔄 링크 업데이트 중: ${link.name}`)
        
        const { error: updateError } = await admin
          .from('campaign_link_meta')
          .update({ start_date: startDate })
          .eq('id', link.id)
        
        if (updateError) {
          console.error(`   ❌ 업데이트 실패: ${updateError.message}`)
        } else {
          console.log(`   ✅ 시작일 설정 완료: ${startDate}`)
          updatedCount++
        }
      }
      
      console.log(`\n✅ 총 ${updatedCount}개 링크의 시작일이 설정되었습니다.`)
    } else {
      console.log('\n⚠️  업데이트할 링크가 없습니다.')
    }
    
    console.log('\n✅ 작업 완료')
  } catch (error: any) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

setWertCampaignStartDate()
