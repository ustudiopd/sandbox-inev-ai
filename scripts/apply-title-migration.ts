import { config } from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '@/lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  console.log('🔧 events 테이블에 title 컬럼 추가 마이그레이션 실행 중...\n')
  
  const admin = createAdminSupabase()
  
  // 마이그레이션 SQL 읽기
  const migrationPath = join(process.cwd(), 'supabase', 'inev', '009_add_title_to_events.sql')
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
  
  // 각 문장 실행
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement) continue
    
    console.log(`[${i + 1}/${statements.length}] 실행 중...`)
    console.log(statement.substring(0, 100) + '...\n')
    
    try {
      // Supabase는 DDL을 직접 실행할 수 없으므로
      // PostgreSQL의 pg_catalog를 통해 실행하거나
      // Supabase Dashboard의 SQL Editor를 사용해야 합니다.
      // 하지만 간단한 ALTER TABLE은 시도해볼 수 있습니다.
      
      // 직접 쿼리 실행 시도 (PostgreSQL REST API 사용)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
          body: JSON.stringify({ sql_query: statement }),
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('⚠️  REST API 실행 실패, Supabase Dashboard에서 직접 실행이 필요합니다.')
        console.log('📝 다음 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요:\n')
        console.log(sql)
        console.log('\n')
        return
      }
      
      const result = await response.json()
      console.log('✅ 성공!')
      console.log(result)
      console.log('\n')
    } catch (error: any) {
      console.log('⚠️  실행 실패:', error.message)
      console.log('📝 다음 SQL을 Supabase Dashboard > SQL Editor에서 직접 실행하세요:\n')
      console.log(sql)
      console.log('\n')
      return
    }
  }
  
  console.log('✅ 마이그레이션 완료!')
}

applyMigration().catch(console.error)
