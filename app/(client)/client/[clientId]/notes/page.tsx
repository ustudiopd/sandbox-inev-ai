import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pin, Clock, User } from 'lucide-react'
import type { JSONContent } from '@tiptap/core'

export default async function NotesPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  
  if (!clientId) {
    redirect('/')
  }
  
  const { user } = await requireClientMember(clientId)
  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()
  
  // 노트 목록 조회 (삭제되지 않은 것만, 고정된 것 먼저)
  const { data: notes, error } = await supabase
    .from('notes')
    .select(`
      id,
      title,
      content,
      is_pinned,
      created_at,
      updated_at,
      author_id
    `)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    console.error('[NotesPage] 노트 조회 오류:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    // 테이블이 없거나 RLS 문제일 수 있으므로 빈 배열로 처리
  }
  
  // 프로필 정보 별도 조회 (RLS 우회)
  const authorIds = notes ? [...new Set(notes.map(n => n.author_id))] : []
  const profilesMap = new Map()
  
  if (authorIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, email')
      .in('id', authorIds)
    
    if (profiles) {
      profiles.forEach((p: any) => {
        profilesMap.set(p.id, p)
      })
    }
  }
  
  // 노트에 프로필 정보 추가
  const notesWithProfiles = notes?.map(note => ({
    ...note,
    profiles: profilesMap.get(note.author_id) || null,
  })) || []
  
  // 작성자 정보 포맷팅
  const formatAuthor = (profile: any) => {
    if (!profile) return '알 수 없음'
    return profile.display_name || profile.email || '알 수 없음'
  }
  
  // 날짜 포맷팅
  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return '오늘'
    } else if (days === 1) {
      return '어제'
    } else if (days < 7) {
      return `${days}일 전`
    } else {
      return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }
  
  // 콘텐츠에서 텍스트 추출 (미리보기용)
  const extractPreview = (content: JSONContent | null): string => {
    if (!content) return ''
    
    const extractText = (node: JSONContent): string => {
      if (node.type === 'text') {
        return node.text || ''
      }
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('')
      }
      return ''
    }
    
    const text = extractText(content)
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">노트</h1>
            <p className="text-gray-600">팀과 함께 공유하는 메모와 아이디어</p>
          </div>
          <Link
            href={`/client/${clientId}/notes/new`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>새 노트</span>
          </Link>
        </div>
        
        {/* 노트 목록 */}
        {!notesWithProfiles || notesWithProfiles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg mb-4">아직 노트가 없습니다</p>
            <Link
              href={`/client/${clientId}/notes/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>첫 노트 작성하기</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notesWithProfiles.map((note) => (
              <Link
                key={note.id}
                href={`/client/${clientId}/notes/${note.id}`}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex-1">
                    {note.is_pinned && <Pin size={16} className="inline mr-2 text-yellow-500" />}
                    {note.title || '제목 없음'}
                  </h2>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {extractPreview(note.content as JSONContent)}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    <span>{formatAuthor(note.profiles)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>{formatDate(note.updated_at || note.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
