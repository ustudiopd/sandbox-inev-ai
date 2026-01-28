import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function uploadThumb4() {
  try {
    const admin = createAdminSupabase()
    
    // 이미지 파일 읽기
    const imagePath = join(process.cwd(), 'img', 'onepredict', 'thumb4.png')
    console.log('이미지 파일 경로:', imagePath)
    
    const imageBuffer = readFileSync(imagePath)
    console.log('이미지 파일 크기:', imageBuffer.length, 'bytes')
    
    // 버킷 이름
    const bucketName = 'webinar-thumbnails'
    
    // 이미지 업로드
    const filePath = 'onepredict/thumb4.png'
    console.log('이미지 업로드 중...')
    
    const { data: uploadData, error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true, // 이미 있으면 덮어쓰기
      })
    
    if (uploadError) {
      console.error('❌ 업로드 실패:', uploadError)
      throw uploadError
    }
    
    console.log('✅ 업로드 완료:', uploadData?.path)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
    console.log(`   Public URL: ${publicUrl}`)
    
    // 웨비나의 meta_thumbnail_url 업데이트 (slug가 426307인 웨비나)
    const { data: webinars, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug')
      .eq('slug', '426307')
    
    if (webinarError) {
      console.error('❌ 웨비나 조회 실패:', webinarError)
      throw webinarError
    }
    
    if (!webinars || webinars.length === 0) {
      console.warn('⚠️  slug가 426307인 웨비나를 찾을 수 없습니다.')
      console.log('   Public URL을 수동으로 웨비나 설정에 입력해주세요:', publicUrl)
      return
    }
    
    for (const webinar of webinars) {
      const { error: updateError } = await admin
        .from('webinars')
        .update({ meta_thumbnail_url: publicUrl })
        .eq('id', webinar.id)
      
      if (updateError) {
        console.error(`❌ 웨비나 ${webinar.id} 업데이트 실패:`, updateError)
      } else {
        console.log(`✅ 웨비나 ${webinar.id} (slug: ${webinar.slug}) 메타 썸네일 업데이트 완료`)
      }
    }
    
    console.log('\n✅ 모든 작업 완료!')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

uploadThumb4()
