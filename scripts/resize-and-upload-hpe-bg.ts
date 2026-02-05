import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function resizeAndUploadHPEBG() {
  try {
    // 원본 이미지 파일 읽기
    const originalImagePath = join(process.cwd(), 'img', 'hpe', 'webinar_login_BG.png')
    console.log('원본 이미지 파일 경로:', originalImagePath)
    
    // 이미지를 1600px 너비로 리사이즈
    console.log('이미지 리사이즈 중 (1600px 너비)...')
    const resizedBuffer = await sharp(originalImagePath)
      .resize(1600, null, {
        withoutEnlargement: true, // 원본보다 크게 만들지 않음
        fit: 'inside', // 비율 유지하면서 1600px 안에 맞춤
      })
      .png({ quality: 90, compressionLevel: 9 }) // 압축 레벨 높여서 파일 크기 줄이기
      .toBuffer()
    
    console.log('리사이즈된 이미지 크기:', resizedBuffer.length, 'bytes')
    
    // 임시 파일로 저장 (선택사항)
    const tempPath = join(process.cwd(), 'img', 'hpe', 'webinar_login_BG_1600px.png')
    writeFileSync(tempPath, resizedBuffer)
    console.log('임시 파일 저장 완료:', tempPath)
    
    // Supabase Storage에 업로드
    const admin = createAdminSupabase()
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
        public: true,
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
    const filePath = 'hpe/webinar_login_BG_1600px.png'
    console.log('이미지 업로드 중...')
    
    const { data: uploadData, error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(filePath, resizedBuffer, {
        contentType: 'image/png',
        upsert: true,
      })
    
    if (uploadError) {
      console.error('이미지 업로드 실패:', uploadError)
      throw uploadError
    }
    
    console.log('✅ 이미지 업로드 완료:', uploadData?.path)
    
    // Public URL 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
    console.log('✅ Public URL:', publicUrl)
    
    return publicUrl
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

resizeAndUploadHPEBG()
