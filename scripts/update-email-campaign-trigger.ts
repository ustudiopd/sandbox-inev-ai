/**
 * email_campaigns 트리거 함수 업데이트 스크립트
 * registration_campaign scope_type 지원 추가
 */

import { readFileSync } from 'fs'
import { join } from 'path'

async function updateTrigger() {
  // 마이그레이션 파일 읽기
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '084_enable_registration_campaign_email.sql')
  const sql = readFileSync(migrationPath, 'utf-8')
  
  console.log('📝 트리거 함수 업데이트 SQL')
  console.log('SQL 파일:', migrationPath)
  
  // SQL 실행 (Supabase는 여러 문장을 한 번에 실행할 수 있음)
  const functionSql = sql.trim()
  
  console.log('\n' + '='.repeat(70))
  console.log('📋 Supabase Dashboard에서 아래 SQL을 실행하세요:')
  console.log('='.repeat(70))
  console.log('\n' + functionSql)
  console.log('\n' + '='.repeat(70))
  console.log('\n📍 실행 방법:')
  console.log('1. Supabase Dashboard (https://supabase.com/dashboard) 접속')
  console.log('2. 프로젝트 선택')
  console.log('3. SQL Editor 메뉴로 이동')
  console.log('4. 위 SQL을 복사하여 실행')
  console.log('='.repeat(70))
}

updateTrigger().catch(console.error)
