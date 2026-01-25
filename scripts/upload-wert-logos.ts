import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadWertLogos() {
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
      { name: 'kewert_logo.png', path: 'wert/kewert_logo.png', group: 'logo' },
      { name: 'kewert_logo-w.png', path: 'wert/kewert_logo-w.png', group: 'logo-white' },
      { name: 'bg1.png', path: 'wert/bg1.png', group: 'bg1' },
      { name: 'image 50-1.png', path: 'wert/image 50-1.png', group: 'bg-hero' },
      { name: 'symbol1.png', path: 'wert/symbol1.png', group: 'symbol' },
      { name: 'qa.png', path: 'wert/qa.png', group: 'qa' },
      { name: 'qa2.png', path: 'wert/qa2.png', group: 'qa2' },
      { name: 'image 53.png', path: 'wert/image 53.png', group: 'speaker1' },
      { name: 'Rectangle 34625314.png', path: 'wert/Rectangle 34625314.png', group: 'speaker2' },
      { name: 'check_icon.png', path: 'wert/check_icon.png', group: 'check' },
      { name: 'image 51.png', path: 'wert/image 51.png', group: 'ip-team' },
      { name: 'image 52.png', path: 'wert/image 52.png', group: 'patent-office' },
      { name: 'image 50.png', path: 'wert/image 50.png', group: 'rd-team' },
      { name: 'icon_plus.png', path: 'wert/icon_plus.png', group: 'plus-icon' },
      { name: 'image_2.png', path: 'wert/image_2.png', group: 'coffee-icon' },
      { name: 'image 48.png', path: 'wert/image 48.png', group: 'quote-icon' },
      { name: 'image 49.png', path: 'wert/image 49.png', group: 'trial-icon' },
      { name: 'notice.png', path: 'wert/notice.png', group: 'notice-icon' },
    ]
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
    const uploadedUrls: Record<string, string> = {}
    
    for (const image of images) {
      const imagePath = join(process.cwd(), 'img', image.path)
      console.log(`\n📤 ${image.group} (${image.name}) 업로드 중...`)
      console.log('   파일 경로:', imagePath)
      
      const imageBuffer = readFileSync(imagePath)
      console.log('   파일 크기:', imageBuffer.length, 'bytes')
      
      const filePath = `wert/${image.name}`
      
      const { data: uploadData, error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(filePath, imageBuffer, {
          contentType: 'image/png',
          upsert: true,
        })
      
      if (uploadError) {
        console.error(`❌ ${image.name} 업로드 실패:`, uploadError)
        continue
      }
      
      console.log(`✅ ${image.name} 업로드 완료:`, uploadData?.path)
      
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
      uploadedUrls[image.group] = publicUrl
      console.log(`   Public URL: ${publicUrl}`)
    }
    
    console.log('\n📋 업로드 완료 요약:')
    console.log(JSON.stringify(uploadedUrls, null, 2))
    
    return uploadedUrls
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

uploadWertLogos()
