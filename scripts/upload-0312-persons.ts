import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function upload0312Persons() {
  try {
    const admin = createAdminSupabase()
    const bucketName = 'webinar-thumbnails'
    
    const images = [
      { file: '0312_person_1.png', path: 'wert/0312_person_1.png' },
      { file: '0312_person_2.png', path: 'wert/0312_person_2.png' },
      { file: '0312_person_3.png', path: 'wert/0312_person_3.png' },
      { file: '0312_person_4.png', path: 'wert/0312_person_4.png' },
    ]
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      setTimeout(() => process.exit(1), 100)
      return
    }
    
    for (const img of images) {
      const imagePath = join(process.cwd(), 'img', 'wert', img.file)
      console.log(`\n이미지 파일 경로: ${imagePath}`)
      
      const imageBuffer = readFileSync(imagePath)
      console.log(`이미지 파일 크기: ${imageBuffer.length} bytes`)
      
      console.log(`이미지 업로드 중: ${img.path}...`)
      
      const { data: uploadData, error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(img.path, imageBuffer, {
          contentType: 'image/png',
          upsert: true,
        })
      
      if (uploadError) {
        console.error(`이미지 업로드 실패 (${img.file}):`, uploadError)
        throw uploadError
      }
      
      console.log(`✅ 이미지 업로드 완료: ${uploadData?.path}`)
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${img.path}`
      console.log(`✅ Public URL: ${publicUrl}`)
    }
    
    console.log('\n✅ 모든 이미지 업로드 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    setTimeout(() => process.exit(1), 100)
  }
}

upload0312Persons()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('예외 발생:', error)
    setTimeout(() => process.exit(1), 100)
  })
