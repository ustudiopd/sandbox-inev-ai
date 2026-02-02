import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkEventAccessLogsSchema() {
  console.log('🔍 event_access_logs 테이블 스키마 확인 중...\n')
  
  const admin = createAdminSupabase()
  
  // 컬럼 목록 조회
  const { data: columns, error } = await admin.rpc('exec_sql', {
    query: `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'event_access_logs'
      ORDER BY ordinal_position;
    `
  })
  
  if (error) {
    console.error('❌ 스키마 조회 실패:', error)
    return
  }
  
  // 직접 쿼리 시도
  const { data: directQuery, error: directError } = await admin
    .from('event_access_logs')
    .select('cid')
    .limit(1)
  
  console.log('📋 컬럼 목록:')
  console.log(columns)
  
  console.log('\n🧪 직접 쿼리 테스트 (cid 컬럼):')
  if (directError) {
    console.error('❌ cid 컬럼 조회 실패:', directError)
  } else {
    console.log('✅ cid 컬럼 존재 확인됨')
  }
  
  // 테이블 구조 확인을 위한 더미 INSERT 시도 (롤백)
  console.log('\n🧪 INSERT 테스트 (cid 포함):')
  const testData = {
    session_id: 'test-schema-check',
    campaign_id: '3a88682e-6fab-463c-8328-6b403c8c5c7a',
    cid: 'TEST123',
    accessed_at: new Date().toISOString(),
  }
  
  const { error: insertError } = await admin
    .from('event_access_logs')
    .insert(testData)
  
  if (insertError) {
    console.error('❌ INSERT 실패:', insertError)
    console.error('   Code:', insertError.code)
    console.error('   Message:', insertError.message)
    console.error('   Details:', insertError.details)
    console.error('   Hint:', insertError.hint)
  } else {
    console.log('✅ INSERT 성공 - cid 컬럼 존재 확인')
    
    // 테스트 데이터 삭제
    await admin
      .from('event_access_logs')
      .delete()
      .eq('session_id', 'test-schema-check')
  }
}

checkEventAccessLogsSchema()
  .then(() => {
    console.log('\n✅ 스키마 확인 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  })
