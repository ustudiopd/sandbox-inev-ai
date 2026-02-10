/**
 * 222152 이벤트 페이지에서 사용하는 gcbio 이미지 전체를 Supabase Storage(gcbio 버킷)에 업로드
 * 실행: npx tsx scripts/upload-gcbio-all-222152.ts
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BUCKET = 'gcbio'
const IMG_DIR = join(process.cwd(), 'img', 'gcbio')

/** 업로드할 파일 목록 (222152 관련 페이지에서 참조하는 파일) */
const FILES: { path: string; contentType: string }[] = [
  { path: 'gcbio_logo.png', contentType: 'image/png' },
  { path: 'Title_black.png', contentType: 'image/png' },
  { path: 'button_01.png', contentType: 'image/png' },
  { path: 'button_02.png', contentType: 'image/png' },
  { path: 'page4_archiving_photo1.png', contentType: 'image/png' },
  { path: 'page4_archiving_photo2.png', contentType: 'image/png' },
  { path: 'page4_archiving_photo3.png', contentType: 'image/png' },
  { path: 'page4_archiving_video1.png', contentType: 'image/png' },
  { path: 'page4_archiving_video2_2.png', contentType: 'image/png' },
  { path: 'page3_program_2.png', contentType: 'image/png' },
  { path: 'page3_program_3.png', contentType: 'image/png' },
  { path: 'page3_program_4.png', contentType: 'image/png' },
  { path: 'page3_program_5.png', contentType: 'image/png' },
  { path: 'page3_program_6.png', contentType: 'image/png' },
  { path: 'person1.png', contentType: 'image/png' },
  { path: 'person2.png', contentType: 'image/png' },
  { path: 'person3.png', contentType: 'image/png' },
  { path: 'Timetable.svg', contentType: 'image/svg+xml' },
]

async function ensureBucket(admin: ReturnType<typeof createAdminSupabase>) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets()
  if (listError) throw listError
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    const { error: createError } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'],
    })
    if (createError) throw createError
    console.log('버킷 생성:', BUCKET)
  }
}

async function uploadAll() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL가 설정되지 않았습니다.')
    return
  }

  const admin = createAdminSupabase()
  await ensureBucket(admin)

  for (const { path: filePath, contentType } of FILES) {
    const localPath = join(IMG_DIR, filePath)
    if (!existsSync(localPath)) {
      console.warn('파일 없음, 스킵:', filePath)
      continue
    }
    const buffer = readFileSync(localPath)
    const { error } = await admin.storage.from(BUCKET).upload(filePath, buffer, {
      contentType,
      upsert: true,
    })
    if (error) {
      console.error('업로드 실패:', filePath, error.message)
      if (filePath.endsWith('.svg')) {
        console.error('  → Storage 버킷 gcbio 설정에서 allowed MIME에 image/svg+xml 추가 후 재실행하거나, 대시보드에서 수동 업로드하세요.')
      }
      continue
    }
    console.log('업로드 완료:', filePath)
  }

  console.log('\nPublic URL 예시:', `${supabaseUrl}/storage/v1/object/public/${BUCKET}/gcbio_logo.png`)
}

uploadAll()
  .then(() => setTimeout(() => process.exit(0), 100))
  .catch((e) => {
    console.error(e)
    setTimeout(() => process.exit(1), 100)
  })
