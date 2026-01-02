import { createAdminSupabase } from '@/lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

async function uploadEdmHeader1600_1() {
  try {
    const admin = createAdminSupabase()
    
    // 이미지 파일 읽기
    const imagePath = join(process.cwd(), 'img', 'edm_header_1600_1.jpg')
    console.log('이미지 파일 경로:', imagePath)
    
    const imageBuffer = readFileSync(imagePath)
    console.log('이미지 파일 크기:', imageBuffer.length, 'bytes')
    
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
    
    // 이미지 업로드
    const filePath = 'edm_header_1600_1.jpg'
    console.log('이미지 업로드 중...')
    
    const { data: uploadData, error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // 이미 있으면 덮어쓰기
      })
    
    if (uploadError) {
      console.error('이미지 업로드 실패:', uploadError)
      throw uploadError
    }
    
    console.log('✅ 이미지 업로드 완료:', uploadData?.path)
    
    // Public URL 생성
    const { data: urlData } = admin.storage
      .from(bucketName)
      .getPublicUrl(filePath)
    
    console.log('✅ Public URL:', urlData?.publicUrl)
    console.log('\n이미지가 성공적으로 업로드되었습니다!')
    console.log('웹에서 접근 가능한 URL:', urlData?.publicUrl)
  } catch (error: any) {
    console.error('❌ 업로드 실패:', error.message)
    process.exit(1)
  }
}

uploadEdmHeader1600_1()
