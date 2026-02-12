/**
 * public/img/onepredict 폴더의 모든 이미지를 Supabase Storage(webinar-thumbnails 버킷, onepredict/)에 업로드
 * 실행: npx tsx scripts/upload-onepredict-all.ts
 */
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BUCKET = 'webinar-thumbnails'
const IMG_DIR = join(process.cwd(), 'public', 'img', 'onepredict')

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']

function getContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

function listAllFilesRecursive(dir: string, baseDir: string = dir): string[] {
  if (!existsSync(dir)) return []
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const e of entries) {
    const full = join(dir, e.name)
    const relative = full.slice(baseDir.length).replace(/\\/g, '/').replace(/^\//, '')
    if (e.isDirectory()) {
      files.push(...listAllFilesRecursive(full, baseDir))
    } else if (e.isFile()) {
      const ext = (e.name.slice(e.name.lastIndexOf('.')) || '').toLowerCase()
      if (IMAGE_EXT.includes(ext)) files.push(relative)
    }
  }
  return files
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

  const files = listAllFilesRecursive(IMG_DIR)
  if (files.length === 0) {
    console.warn('public/img/onepredict에 업로드할 이미지가 없습니다.')
    return
  }
  console.log('업로드 대상:', files.length, '개')

  for (const relativePath of files) {
    const localPath = join(IMG_DIR, relativePath)
    const contentType = getContentType(relativePath)
    const buffer = readFileSync(localPath)
    const bucketPath = `onepredict/${relativePath}`
    const { error } = await admin.storage.from(BUCKET).upload(bucketPath, buffer, {
      contentType,
      upsert: true,
    })
    if (error) {
      console.error('업로드 실패:', bucketPath, error.message)
      if (relativePath.endsWith('.svg')) {
        console.error('  → Storage 버킷 설정에서 allowed MIME에 image/svg+xml 추가 후 재실행하세요.')
      }
      continue
    }
    console.log('업로드 완료:', bucketPath)
  }

  console.log('\nPublic URL 예시:', `${supabaseUrl}/storage/v1/object/public/${BUCKET}/onepredict/webinar_logo.png`)
}

uploadAll()
  .then(() => setTimeout(() => process.exit(0), 100))
  .catch((e) => {
    console.error(e)
    setTimeout(() => process.exit(1), 100)
  })
