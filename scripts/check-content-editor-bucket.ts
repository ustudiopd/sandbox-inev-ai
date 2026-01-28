/**
 * 콘텐츠 에디터용 이미지 업로드 버킷 확인 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/check-content-editor-bucket.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '../lib/supabase/admin'

async function checkContentEditorBucket() {
  try {
    const admin = createAdminSupabase()
    
    const bucketName = 'uslab-images'
    
    console.log(`📦 버킷 "${bucketName}" 정보 확인 중...\n`)
    
    // 버킷 목록 조회
    const { data: buckets, error: listError } = await admin.storage.listBuckets()
    
    if (listError) {
      console.error('❌ 버킷 목록 조회 실패:', listError)
      throw listError
    }
    
    const bucket = buckets?.find(b => b.name === bucketName)
    
    if (!bucket) {
      console.log(`❌ 버킷 "${bucketName}"이 존재하지 않습니다.`)
      console.log('   스크립트를 실행하여 버킷을 생성하세요:')
      console.log('   npx tsx scripts/create-content-editor-bucket.ts')
      return
    }
    
    console.log('✅ 버킷 정보:')
    console.log('   이름:', bucket.name)
    console.log('   Public:', bucket.public ? '✅ 예 (웹에서 접근 가능)' : '❌ 아니오')
    console.log('   파일 크기 제한:', bucket.file_size_limit ? `${(bucket.file_size_limit / 1024 / 1024).toFixed(0)}MB` : '없음')
    console.log('   허용된 MIME 타입:', bucket.allowed_mime_types?.join(', ') || '모두 허용')
    console.log('   생성일:', bucket.created_at ? new Date(bucket.created_at).toLocaleString('ko-KR') : '알 수 없음')
    console.log('   수정일:', bucket.updated_at ? new Date(bucket.updated_at).toLocaleString('ko-KR') : '알 수 없음')
    
    // 버킷 내 파일 개수 확인
    const { data: files, error: filesError } = await admin.storage
      .from(bucketName)
      .list('uslab', {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' },
      })
    
    if (!filesError && files) {
      console.log('\n📁 버킷 내 파일:')
      console.log(`   uslab/ 폴더에 ${files.length > 0 ? '파일이 있습니다' : '파일이 없습니다'}`)
    }
    
    console.log('\n📝 권장 사항:')
    if (!bucket.public) {
      console.log('   ⚠️  버킷이 private입니다. 콘텐츠 에디터에서 이미지를 표시하려면 public으로 설정하세요.')
    }
    if (!bucket.file_size_limit || bucket.file_size_limit < 50 * 1024 * 1024) {
      console.log('   ⚠️  파일 크기 제한이 50MB 미만입니다. 콘텐츠 에디터 가이드 권장 크기는 50MB입니다.')
    }
    console.log('   ✅ 버킷 설정이 콘텐츠 에디터 사용에 적합합니다!')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 스크립트 실행
checkContentEditorBucket()
