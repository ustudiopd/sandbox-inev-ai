/**
 * 마이그레이션 091 실행 스크립트
 * batch_close_stale_sessions RPC 함수 생성
 * 
 * 사용법: npx tsx scripts/apply-migration-091.ts
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyMigration() {
  
  // 마이그레이션 파일 읽기
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '091_batch_close_stale_sessions_rpc.sql')
  console.log(`📄 마이그레이션 파일 읽기: ${migrationPath}`)
  
  const sql = readFileSync(migrationPath, 'utf-8')
  console.log('\n📋 실행할 SQL:')
  console.log('='.repeat(60))
  console.log(sql)
  console.log('='.repeat(60))
  
  // Supabase는 DDL 문(CREATE FUNCTION 등)을 직접 실행할 수 없으므로
  // Supabase Dashboard의 SQL Editor에서 실행해야 합니다.
  // 하지만 시도해보겠습니다.
  
  try {
    // SQL을 문장 단위로 분리 (begin/commit 제외)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s.toLowerCase() !== 'begin' && s.toLowerCase() !== 'commit')
    
    console.log(`\n🔧 실행할 SQL 문장 수: ${statements.length}`)
    
    // 각 문장 실행 시도
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      console.log(`\n[${i + 1}/${statements.length}] 실행 시도...`)
      console.log(statement.substring(0, 150) + '...')
      
      try {
        // Supabase는 DDL을 직접 실행할 수 없으므로, 
        // 실제로는 Supabase Dashboard의 SQL Editor에서 실행해야 합니다.
        // 하지만 시도해보겠습니다.
        
        // RPC를 통한 실행 시도 (exec_sql RPC가 있다면)
        const { error } = await admin.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          console.log('⚠️  RPC exec_sql이 없거나 실패했습니다.')
          console.log('📝 이 마이그레이션은 Supabase Dashboard의 SQL Editor에서 직접 실행해야 합니다.')
          break
        } else {
          console.log('✅ 성공!')
        }
      } catch (error: any) {
        console.log('⚠️  직접 실행 불가:', error.message)
        console.log('📝 이 마이그레이션은 Supabase Dashboard의 SQL Editor에서 직접 실행해야 합니다.')
        break
      }
    }
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
  }
  
  console.log('\n📋 다음 단계:')
  console.log('1. Supabase Dashboard (https://supabase.com/dashboard) 접속')
  console.log('2. 프로젝트 선택')
  console.log('3. SQL Editor 메뉴로 이동')
  console.log('4. 위의 SQL을 복사하여 실행')
  console.log('\n또는 Supabase CLI 사용:')
  console.log('supabase db push')
}

applyMigration().catch(console.error)
