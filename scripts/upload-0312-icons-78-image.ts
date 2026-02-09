import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function upload0312Icons78Image() {
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
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      setTimeout(() => process.exit(1), 100)
      return
    }
    
    // 0312_icon_7.png 업로드
    const image7Path = join(process.cwd(), 'img', 'wert', '0312_icon_7.png')
    console.log('이미지 파일 경로:', image7Path)
    const image7Buffer = readFileSync(image7Path)
    console.log('이미지 파일 크기:', image7Buffer.length, 'bytes')
    
    const filePath7 = 'wert/0312_icon_7.png'
    console.log('이미지 업로드 중...', filePath7)
    
    const { data: uploadData7, error: uploadError7 } = await admin.storage
      .from(bucketName)
      .upload(filePath7, image7Buffer, {
        contentType: 'image/png',
        upsert: true,
      })
    
    if (uploadError7) {
      console.error('이미지 업로드 실패:', uploadError7)
      throw uploadError7
    }
    
    console.log('✅ 이미지 업로드 완료:', uploadData7?.path)
    const publicUrl7 = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath7}`
    console.log('✅ Public URL:', publicUrl7)
    
    // 0312_icon_8.png 업로드
    const image8Path = join(process.cwd(), 'img', 'wert', '0312_icon_8.png')
    console.log('이미지 파일 경로:', image8Path)
    const image8Buffer = readFileSync(image8Path)
    console.log('이미지 파일 크기:', image8Buffer.length, 'bytes')
    
    const filePath8 = 'wert/0312_icon_8.png'
    console.log('이미지 업로드 중...', filePath8)
    
    const { data: uploadData8, error: uploadError8 } = await admin.storage
      .from(bucketName)
      .upload(filePath8, image8Buffer, {
        contentType: 'image/png',
        upsert: true,
      })
    
    if (uploadError8) {
      console.error('이미지 업로드 실패:', uploadError8)
      throw uploadError8
    }
    
    console.log('✅ 이미지 업로드 완료:', uploadData8?.path)
    const publicUrl8 = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath8}`
    console.log('✅ Public URL:', publicUrl8)
    
    return { url7: publicUrl7, url8: publicUrl8 }
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    setTimeout(() => process.exit(1), 100)
  }
}

upload0312Icons78Image()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('예외 발생:', error)
    setTimeout(() => process.exit(1), 100)
  })
