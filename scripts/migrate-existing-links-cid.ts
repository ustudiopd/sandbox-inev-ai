import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { generateCID } from '@/lib/utils/cid'

dotenv.config({ path: '.env.local' })

/**
 * 기존 캠페인 링크에 cid를 생성하는 마이그레이션 스크립트
 */
async function migrateExistingLinksCID() {
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
    // 1. cid가 없는 모든 링크 조회
    console.log('🔍 cid가 없는 링크 조회 중...')
    const { data: linksWithoutCID, error: linksError } = await admin
      .from('campaign_link_meta')
      .select('id, name, client_id, cid')
      .is('cid', null)
    
    if (linksError) {
      console.error('❌ 링크 조회 실패:', linksError)
      process.exit(1)
    }
    
    if (!linksWithoutCID || linksWithoutCID.length === 0) {
      console.log('✅ cid가 없는 링크가 없습니다.')
      process.exit(0)
    }
    
    console.log(`\n📋 cid가 없는 링크 (${linksWithoutCID.length}개):`)
    linksWithoutCID.forEach((link: any) => {
      console.log(`   - ${link.name} (ID: ${link.id}, Client: ${link.client_id})`)
    })
    
    // 2. 각 링크에 cid 생성 및 저장
    console.log('\n🔄 cid 생성 및 저장 중...')
    let successCount = 0
    let failCount = 0
    
    for (const link of linksWithoutCID) {
      let cid: string
      let attempts = 0
      const maxAttempts = 10
      
      // 중복 체크를 포함한 cid 생성
      while (attempts < maxAttempts) {
        cid = generateCID()
        
        // 중복 체크
        const { data: existingLink } = await admin
          .from('campaign_link_meta')
          .select('id')
          .eq('client_id', link.client_id)
          .eq('cid', cid)
          .maybeSingle()
        
        if (!existingLink) {
          break // 중복 없음
        }
        
        attempts++
      }
      
      if (attempts >= maxAttempts) {
        console.error(`   ❌ cid 생성 실패: ${link.name}`)
        failCount++
        continue
      }
      
      // cid 업데이트
      const { error: updateError } = await admin
        .from('campaign_link_meta')
        .update({ cid: cid! })
        .eq('id', link.id)
      
      if (updateError) {
        console.error(`   ❌ 업데이트 실패: ${link.name} - ${updateError.message}`)
        failCount++
      } else {
        console.log(`   ✅ cid 생성 완료: ${link.name} → ${cid!}`)
        successCount++
      }
    }
    
    console.log(`\n✅ 작업 완료`)
    console.log(`   성공: ${successCount}개`)
    console.log(`   실패: ${failCount}개`)
  } catch (error: any) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

migrateExistingLinksCID()
