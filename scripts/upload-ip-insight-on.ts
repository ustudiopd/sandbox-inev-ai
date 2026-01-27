import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadIPInsightOn() {
  try {
    const admin = createAdminSupabase()
    
    // 이미지 파일 읽기
    const imagePath = join(process.cwd(), 'img', 'wert', 'ip_insight_on.png')
    console.log('이미지 파일 경로:', imagePath)
    
    const imageBuffer = readFileSync(imagePath)
    console.log('이미지 파일 크기:', imageBuffer.length, 'bytes')
    
    const bucketName = 'webinar-thumbnails'
    
    // 이미지 업로드
    const filePath = 'wert/ip_insight_on.png'
    console.log('이미지 업로드 중...')
    
    const { data: uploadData, error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      })
    
    if (uploadError) {
      console.error('❌ 이미지 업로드 실패:', uploadError)
      throw uploadError
    }
    
    console.log('✅ 이미지 업로드 완료:', uploadData?.path)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
    console.log('\n✅ 업로드 완료!')
    console.log('Public URL:', publicUrl)
    
    return publicUrl
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

uploadIPInsightOn()
