/**
 * jo.png와 jo2.png 이미지를 Supabase 스토리지에 업로드하는 스크립트
 */

import { createAdminSupabase } from '../lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadJoImages() {
  try {
    const admin = createAdminSupabase()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
    const bucketName = 'webinar-thumbnails'

    const images = [
      {
        name: 'jo.png',
        path: 'wert/jo.png',
        targetPath: 'wert/jo.png',
      },
      {
        name: 'jo2.png',
        path: 'wert/jo2.png',
        targetPath: 'wert/jo2.png',
      },
    ]

    console.log('📤 발표자 이미지 업로드 시작...\n')

    for (const image of images) {
      const imagePath = join(process.cwd(), 'img', image.path)
      console.log(`📤 ${image.name} 업로드 중...`)
      console.log('   파일 경로:', imagePath)

      const imageBuffer = readFileSync(imagePath)
      console.log('   파일 크기:', imageBuffer.length, 'bytes')

      const filePath = image.targetPath

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
      console.log(`   Public URL: ${publicUrl}\n`)
    }

    console.log('📋 업로드 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

uploadJoImages()
