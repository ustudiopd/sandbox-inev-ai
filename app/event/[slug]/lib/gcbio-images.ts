/**
 * 222152 이벤트용 gcbio 버킷 이미지 URL
 * NEXT_PUBLIC_SUPABASE_URL 기준 public/gcbio 경로 사용
 * (env 없을 때 fallback: inev.ai 프로젝트 Storage)
 * @param cacheVersion 로고 등 변경 시 브라우저 캐시 무시용 (예: 2)
 */
const BUCKET = 'gcbio'
const FALLBACK_BASE = 'https://gbkivxdlebdtfudexbga.supabase.co'

export function getGcbioImageUrl(filename: string, cacheVersion?: number): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_BASE
  const url = `${base}/storage/v1/object/public/${BUCKET}/${filename}`
  return cacheVersion != null ? `${url}?v=${cacheVersion}` : url
}
