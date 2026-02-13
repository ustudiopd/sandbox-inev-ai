import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadGcbioMainDeco3() {
  try {
    const admin = createAdminSupabase()
    
    // 이미지 파일 읽기
    const imagePath = join(process.cwd(), 'img', 'gcbio', 'main_deco3.png')
    console.log('이미지 파일 경로:', imagePath)
    
    const imageBuffer = readFileSync(imagePath)
    console.log('이미지 파일 크기:', imageBuffer.length, 'bytes')
    
    // 버킷명
    const bucketName = 'gcbio'
    
    // 이미지 업로드
    const filePath = 'main_deco3.png'
    console.log('이미지 업로드 중...')
    
    const { data: uploadData, error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true, // 이미 있으면 덮어쓰기
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
      setTimeout(() => process.exit(1), 100)
      return
    }
    
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
    console.log('✅ Public URL:', publicUrl)
    
    return publicUrl
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    setTimeout(() => process.exit(1), 100)
  }
}

uploadGcbioMainDeco3()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('예외 발생:', error)
    setTimeout(() => process.exit(1), 100)
  })
