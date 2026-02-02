/**
 * 집계 실행 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/run-aggregation.ts [clientId] [from] [to]
 * 
 * 예시:
 *   npx tsx scripts/run-aggregation.ts
 *   npx tsx scripts/run-aggregation.ts 55317496-d3d6-4e65-81d3-405892de78ab
 *   npx tsx scripts/run-aggregation.ts 55317496-d3d6-4e65-81d3-405892de78ab 2026-02-02 2026-02-02
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function runAggregation(clientId?: string, fromDate?: string, toDate?: string) {
  const admin = createAdminSupabase()
  
  // 기본값 설정
  const defaultToDate = toDate ? new Date(toDate) : new Date()
  const defaultFromDate = fromDate ? new Date(fromDate) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  console.log('='.repeat(80))
  console.log('집계 실행')
  console.log('='.repeat(80))
  console.log(`날짜 범위: ${defaultFromDate.toISOString().split('T')[0]} ~ ${defaultToDate.toISOString().split('T')[0]}`)
  if (clientId) {
    console.log(`클라이언트 ID: ${clientId}`)
  }
  console.log('')
  
  // 집계 함수 직접 호출
  const { aggregateMarketingStats } = await import('../app/api/cron/aggregate-marketing-stats/route')
  
  try {
    const result = await aggregateMarketingStats(
      defaultFromDate,
      defaultToDate,
      clientId
    )
    
    console.log('집계 완료:')
    console.log(JSON.stringify(result, null, 2))
  } catch (error: any) {
    console.error('집계 실행 오류:', error)
    throw error
  }
  
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined
const fromDate = args[1] || undefined
const toDate = args[2] || undefined

runAggregation(clientId, fromDate, toDate)
  .then(() => {
    console.log('완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
