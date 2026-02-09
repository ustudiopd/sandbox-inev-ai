import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadWertAllImages() {
  try {
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
        fileSizeLimit: 10485760, // 10MB
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
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
    // img/wert 디렉토리에서 모든 이미지 파일 찾기
    const wertDir = join(process.cwd(), 'img', 'wert')
    const files = readdirSync(wertDir)
    
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    const imageFiles = files.filter(file => {
      const ext = file.toLowerCase().substring(file.lastIndexOf('.'))
      return imageExtensions.includes(ext)
    })
    
    console.log(`\n📁 발견된 이미지 파일: ${imageFiles.length}개\n`)
    
    const uploadedUrls: Record<string, string> = {}
    let successCount = 0
    let failCount = 0
    
    for (const fileName of imageFiles) {
      try {
        const imagePath = join(wertDir, fileName)
        const stats = statSync(imagePath)
        
        console.log(`📤 ${fileName} 업로드 중...`)
        console.log(`   파일 경로: ${imagePath}`)
        console.log(`   파일 크기: ${(stats.size / 1024).toFixed(2)} KB`)
        
        const imageBuffer = readFileSync(imagePath)
        
        // 파일 확장자에 따라 contentType 결정
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
        let contentType = 'image/png'
        if (ext === '.jpg' || ext === '.jpeg') {
          contentType = 'image/jpeg'
        } else if (ext === '.gif') {
          contentType = 'image/gif'
        } else if (ext === '.webp') {
          contentType = 'image/webp'
        }
        
        const filePath = `wert/${fileName}`
        
        const { data: uploadData, error: uploadError } = await admin.storage
          .from(bucketName)
          .upload(filePath, imageBuffer, {
            contentType,
            upsert: true, // 이미 있으면 덮어쓰기
          })
        
        if (uploadError) {
          console.error(`❌ ${fileName} 업로드 실패:`, uploadError.message)
          failCount++
          continue
        }
        
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
        uploadedUrls[fileName] = publicUrl
        successCount++
        console.log(`✅ ${fileName} 업로드 완료`)
        console.log(`   Public URL: ${publicUrl}\n`)
      } catch (error: any) {
        console.error(`❌ ${fileName} 처리 중 오류:`, error.message)
        failCount++
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📋 업로드 완료 요약')
    console.log('='.repeat(60))
    console.log(`✅ 성공: ${successCount}개`)
    console.log(`❌ 실패: ${failCount}개`)
    console.log('\n📝 업로드된 파일 URL 목록:')
    console.log(JSON.stringify(uploadedUrls, null, 2))
    
    return uploadedUrls
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

uploadWertAllImages()
