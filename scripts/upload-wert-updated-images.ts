import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadWertUpdatedImages() {
  try {
    const admin = createAdminSupabase()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
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
        fileSizeLimit: 5242880,
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
    
    const images = [
      { name: 'image 50.png', path: 'wert/image 50.png', targetPath: 'wert/image 50.png' },
      { name: 'image 51.png', path: 'wert/image 51.png', targetPath: 'wert/image 51.png' },
      { name: 'image 52.png', path: 'wert/image 52.png', targetPath: 'wert/image 52.png' },
      { name: 'jo.png', path: 'wert/jo.png', targetPath: 'wert/jo.png' },
    ]
    
    console.log('📤 이미지 업로드 시작...\n')
    
    for (const image of images) {
      const imagePath = join(process.cwd(), 'img', image.path)
      console.log(`📤 ${image.name} 업로드 중...`)
      console.log('   파일 경로:', imagePath)
      
      try {
        const imageBuffer = readFileSync(imagePath)
        console.log('   파일 크기:', imageBuffer.length, 'bytes')
        
        const { data: uploadData, error: uploadError } = await admin.storage
          .from(bucketName)
          .upload(image.targetPath, imageBuffer, {
            contentType: 'image/png',
            upsert: true, // 기존 파일 덮어쓰기
          })
        
        if (uploadError) {
          console.error(`❌ ${image.name} 업로드 실패:`, uploadError)
          continue
        }
        
        console.log(`✅ ${image.name} 업로드 완료:`, uploadData?.path)
        
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${image.targetPath}`
        console.log(`   Public URL: ${publicUrl}\n`)
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          console.error(`❌ 파일을 찾을 수 없습니다: ${imagePath}`)
          continue
        }
        throw fileError
      }
    }
    
    console.log('📋 업로드 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

uploadWertUpdatedImages()
