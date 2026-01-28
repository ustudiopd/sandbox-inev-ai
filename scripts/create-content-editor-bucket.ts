/**
 * 콘텐츠 에디터용 이미지 업로드 버킷 생성 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/create-content-editor-bucket.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '../lib/supabase/admin'

async function createContentEditorBucket() {
  try {
    const admin = createAdminSupabase()
    
    const bucketName = 'uslab-images'
    
    console.log(`📦 버킷 "${bucketName}" 생성 중...`)
    
    // 버킷 존재 확인
    const { data: buckets, error: listError } = await admin.storage.listBuckets()
    
    if (listError) {
      console.error('❌ 버킷 목록 조회 실패:', listError)
      throw listError
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName)
    
    if (bucketExists) {
      console.log(`✅ 버킷 "${bucketName}"이 이미 존재합니다.`)
      return
    }
    
    // 버킷 생성
    const { data: bucket, error: createError } = await admin.storage.createBucket(bucketName, {
      public: true, // 웹에서 접근 가능하도록 public으로 설정
      fileSizeLimit: 50 * 1024 * 1024, // 50MB (콘텐츠 에디터 가이드 권장 크기)
      allowedMimeTypes: [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ],
    })
    
    if (createError) {
      console.error('❌ 버킷 생성 실패:', createError)
      throw createError
    }
    
    console.log('✅ 버킷 생성 완료!')
    console.log('   이름:', bucket?.name)
    console.log('   Public: true (웹에서 접근 가능)')
    console.log('   파일 크기 제한: 50MB')
    console.log('   허용된 MIME 타입: image/png, image/jpeg, image/jpg, image/gif, image/webp, image/svg+xml')
    
    console.log('\n📝 다음 단계:')
    console.log('   1. Supabase 대시보드에서 Storage > Policies 확인')
    console.log('   2. Public 버킷이므로 모든 사용자가 읽기 가능')
    console.log('   3. 업로드는 인증된 사용자만 가능하도록 RLS 정책 설정 권장')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 스크립트 실행
createContentEditorBucket()
