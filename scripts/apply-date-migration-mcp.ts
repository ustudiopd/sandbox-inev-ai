import { config } from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigrationViaManagementAPI() {
  console.log('🔧 Supabase Management API를 통한 마이그레이션 실행 시도...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.')
    return
  }
  
  // 프로젝트 ID 추출 (URL에서)
  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectId) {
    console.error('❌ 프로젝트 ID를 추출할 수 없습니다.')
    return
  }
  
  console.log(`📋 프로젝트 ID: ${projectId}\n`)
  
  // 마이그레이션 SQL 읽기
  const migrationPath = join(process.cwd(), 'supabase', 'inev', '010_add_date_fields_to_events.sql')
  const sql = readFileSync(migrationPath, 'utf-8')
  
  console.log('📄 마이그레이션 SQL:')
  console.log(sql)
  console.log('\n')
  
  // Supabase Management API를 통한 실행 시도
  // 참고: Supabase는 DDL을 REST API로 직접 실행할 수 없습니다.
  // Management API도 SQL 실행을 지원하지 않습니다.
  
  console.log('⚠️  Supabase는 보안상의 이유로 DDL 문을 REST API로 직접 실행할 수 없습니다.')
  console.log('📝 다음 방법 중 하나를 사용하세요:\n')
  console.log('1. Supabase Dashboard > SQL Editor에서 직접 실행')
  console.log('2. Supabase CLI 사용: npx supabase db push')
  console.log('3. PostgreSQL 직접 연결 (psql)\n')
  console.log('─'.repeat(80))
  console.log('📋 실행할 SQL:')
  console.log('─'.repeat(80))
  console.log(sql)
  console.log('─'.repeat(80))
}

applyMigrationViaManagementAPI().catch(console.error)
