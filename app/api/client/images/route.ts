import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * GET /api/client/images
 * 클라이언트용 이미지 목록 조회
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const prefix = searchParams.get('prefix') || 'uslab' // 기본값: uslab

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId가 필요합니다' },
        { status: 400 }
      )
    }

    // 권한 확인
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer'])

    const admin = createAdminSupabase()

    // 클라이언트 정보 조회 (워트 클라이언트 확인용)
    const { data: client } = await admin
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single()

    const isWertClient = client?.name && (
      client.name.includes('워트') ||
      client.name.includes('모두의특강') ||
      client.name.includes('Wert') ||
      client.name.includes('wert')
    )

    const bucketName = 'uslab-images'
    const images: Array<{ url: string; path: string; name: string; updated_at?: string }> = []

    // 1. uslab/ 경로의 이미지들 (모든 클라이언트)
    try {
      const { data: uslabFiles, error: uslabError } = await admin.storage
        .from(bucketName)
        .list(prefix, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (!uslabError && uslabFiles) {
        const imageFiles = uslabFiles.filter(
          (file) =>
            file.name &&
            (file.name.endsWith('.jpg') ||
              file.name.endsWith('.jpeg') ||
              file.name.endsWith('.png') ||
              file.name.endsWith('.gif') ||
              file.name.endsWith('.webp'))
        )

        for (const file of imageFiles) {
          const filePath = `${prefix}/${file.name}`
          const { data: urlData } = admin.storage.from(bucketName).getPublicUrl(filePath)
          images.push({
            url: urlData.publicUrl,
            path: filePath,
            name: file.name,
            updated_at: file.updated_at,
          })
        }
      }
    } catch (error) {
      console.error('uslab 이미지 목록 조회 오류:', error)
    }

    // 2. 워트 클라이언트인 경우 wert/ 경로의 이미지들도 추가
    if (isWertClient) {
      try {
        // public/img/wert/ 경로의 이미지들 (로컬 파일)
        const wertPublicImages = [
          { url: '/img/wert/thumb_wert1.png', path: 'public/img/wert/thumb_wert1.png', name: 'thumb_wert1.png' },
          { url: '/img/wert/thumb_wert.png', path: 'public/img/wert/thumb_wert.png', name: 'thumb_wert.png' },
          { url: '/img/wert/thumb3.png', path: 'public/img/wert/thumb3.png', name: 'thumb3.png' },
          { url: '/img/wert/thumb.png', path: 'public/img/wert/thumb.png', name: 'thumb.png' },
        ]

        images.push(...wertPublicImages)

        // Storage의 wert/ 경로 이미지들도 조회 (있는 경우)
        const { data: wertFiles, error: wertError } = await admin.storage
          .from(bucketName)
          .list('wert', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
          })

        if (!wertError && wertFiles) {
          const imageFiles = wertFiles.filter(
            (file) =>
              file.name &&
              (file.name.endsWith('.jpg') ||
                file.name.endsWith('.jpeg') ||
                file.name.endsWith('.png') ||
                file.name.endsWith('.gif') ||
                file.name.endsWith('.webp'))
          )

          for (const file of imageFiles) {
            const filePath = `wert/${file.name}`
            const { data: urlData } = admin.storage.from(bucketName).getPublicUrl(filePath)
            images.push({
              url: urlData.publicUrl,
              path: filePath,
              name: file.name,
              updated_at: file.updated_at,
            })
          }
        }
      } catch (error) {
        console.error('wert 이미지 목록 조회 오류:', error)
      }
    }

    // 최신순으로 정렬 (updated_at 기준)
    images.sort((a, b) => {
      if (!a.updated_at && !b.updated_at) return 0
      if (!a.updated_at) return 1
      if (!b.updated_at) return -1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    return NextResponse.json({
      success: true,
      data: {
        images,
        isWertClient: !!isWertClient,
      },
    })
  } catch (error: any) {
    console.error('이미지 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
