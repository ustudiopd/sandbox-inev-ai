/**
 * img/gcbio 폴더의 모든 이미지를 Supabase Storage(gcbio 버킷)에 업로드
 * 실행: npx tsx scripts/upload-gcbio-all-222152.ts
 */
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BUCKET = 'gcbio'
const IMG_DIR = join(process.cwd(), 'img', 'gcbio')

function getContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

function listAllFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(
    (f) => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.gif') || f.endsWith('.webp') || f.endsWith('.svg')
  )
}

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

  const files = listAllFiles(IMG_DIR)
  if (files.length === 0) {
    console.warn('img/gcbio에 업로드할 이미지가 없습니다.')
    return
  }
  console.log('업로드 대상:', files.length, '개')

  for (const filePath of files) {
    const localPath = join(IMG_DIR, filePath)
    const contentType = getContentType(filePath)
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
