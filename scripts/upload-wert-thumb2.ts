/**
 * Wert thumb_wert2.png 이미지를 Supabase Storage에 업로드하는 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/upload-wert-thumb2.ts
 */

import { createAdminSupabase } from '@/lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadWertThumb2() {
  try {
    const admin = createAdminSupabase()

    const imagePath = join(process.cwd(), 'public', 'img', 'wert', 'thumb_wert2.png')
    console.log('이미지 파일 경로:', imagePath)

    const imageBuffer = readFileSync(imagePath)
    console.log('이미지 파일 크기:', imageBuffer.length, 'bytes')

    const bucketName = 'webinar-thumbnails'

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

    const filePath = 'wert/thumb_wert2.png'
    console.log('이미지 업로드 중...')

    const { data: uploadData, error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error('이미지 업로드 실패:', uploadError)
      throw uploadError
    }

    console.log('✅ 이미지 업로드 완료:', uploadData?.path)

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
    console.error(error)
    process.exit(1)
  }
}

uploadWertThumb2()
