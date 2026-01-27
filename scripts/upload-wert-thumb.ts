import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadWertThumb() {
  try {
    const admin = createAdminSupabase()
    
    // 버킷이 없으면 생성 (public 버킷으로 생성하여 웹에서 접근 가능하도록)
    const bucketName = 'webinar-thumbnails'
    
    // 버킷 존재 확인
    const { data: buckets, error: listError } = await admin.storage.listBuckets()
    
    if (listError) {
      console.error('버킷 목록 조회 실패:', listError)
      throw listError
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName)
    
    if (!bucketExists) {
      console.log(`버킷 "${bucketName}" 생성 중...`)
      const { data: bucket, error: createError } = await admin.storage.createBucket(bucketName, {
        public: true, // 웹에서 접근 가능하도록 public으로 설정
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      })
      
      if (createError) {
        console.error('버킷 생성 실패:', createError)
        throw createError
      }
      
      console.log('✅ 버킷 생성 완료:', bucket?.name)
    } else {
      console.log('✅ 버킷이 이미 존재합니다:', bucketName)
    }
    
    // 업로드할 이미지 파일 목록
    const imagesToUpload = [
      { localFile: 'thumb.png', bucketPath: 'wert/thumb.png' },
      { localFile: 'thumb2.png', bucketPath: 'wert/thumb2.png' },
      { localFile: 'thumb3.png', bucketPath: 'wert/thumb3.png' },
    ]
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
    // 각 이미지 업로드
    for (const image of imagesToUpload) {
      const imagePath = join(process.cwd(), 'img', 'wert', image.localFile)
      console.log(`\n📤 ${image.localFile} 업로드 중...`)
      console.log('이미지 파일 경로:', imagePath)
      
      const imageBuffer = readFileSync(imagePath)
      console.log('이미지 파일 크기:', imageBuffer.length, 'bytes')
      
      const { data: uploadData, error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(image.bucketPath, imageBuffer, {
          contentType: 'image/png',
          upsert: true, // 이미 있으면 덮어쓰기
        })
      
      if (uploadError) {
        console.error(`❌ ${image.localFile} 업로드 실패:`, uploadError)
        throw uploadError
      }
      
      console.log(`✅ ${image.localFile} 업로드 완료:`, uploadData?.path)
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${image.bucketPath}`
      console.log(`   Public URL: ${publicUrl}`)
    }
    
    console.log('\n✅ 모든 이미지 업로드 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

uploadWertThumb()
