import { config } from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '@/lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  console.log('🔧 events 테이블에 날짜 필드 추가 마이그레이션 실행 중...\n')
  
  const admin = createAdminSupabase()
  
  // 마이그레이션 SQL 읽기
  const migrationPath = join(process.cwd(), 'supabase', 'inev', '010_add_date_fields_to_events.sql')
  const sql = readFileSync(migrationPath, 'utf-8')
  
  console.log('📄 마이그레이션 SQL:')
  console.log(sql)
  console.log('\n')
  
  // SQL 문장 분리
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`🔧 실행할 SQL 문장 수: ${statements.length}\n`)
  
  // Supabase는 DDL을 직접 실행할 수 없으므로
  // Supabase Dashboard의 SQL Editor를 사용해야 합니다.
  console.log('⚠️  Supabase는 DDL 문을 REST API로 직접 실행할 수 없습니다.')
  console.log('📝 다음 SQL을 Supabase Dashboard > SQL Editor에서 직접 실행하세요:\n')
  console.log('─'.repeat(80))
  console.log(sql)
  console.log('─'.repeat(80))
  console.log('\n')
  console.log('📋 실행 방법:')
  console.log('1. https://supabase.com/dashboard 접속')
  console.log('2. 프로젝트 선택 (gbkivxdlebdtfudexbga)')
  console.log('3. 좌측 메뉴에서 "SQL Editor" 클릭')
  console.log('4. 위 SQL을 복사해 붙여넣기')
  console.log('5. "Run" 버튼 클릭')
  console.log('\n')
}

applyMigration().catch(console.error)
