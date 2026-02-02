import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Pin, PinOff, User, Clock } from 'lucide-react'
import NoteDetailClient from './NoteDetailClient'
import NoteCommentsClient from './NoteCommentsClient'
import { generateHTML } from '@tiptap/html'
import { extensions } from '@/components/editor/extensions-server'
import type { JSONContent } from '@tiptap/core'

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; noteId: string }>
}) {
  const { clientId, noteId } = await params
  
  if (!clientId || !noteId) {
    redirect(`/client/${clientId}/notes`)
  }
  
  const { user } = await requireClientMember(clientId)
  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()
  
  // 노트 조회
  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .single()
  
  if (error || !note) {
    console.error('[NoteDetailPage] 노트 조회 오류:', error)
    redirect(`/client/${clientId}/notes`)
  }
  
  // 노트 작성자 프로필 조회
  const { data: noteAuthorProfile } = await admin
    .from('profiles')
    .select('display_name, email')
    .eq('id', note.author_id)
    .single()
  
  // 댓글 조회
  const { data: comments, error: commentsError } = await supabase
    .from('note_comments')
    .select('*')
    .eq('note_id', noteId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  
  if (commentsError) {
    console.error('[NoteDetailPage] 댓글 조회 오류:', commentsError)
  }
  
  // 댓글 작성자 프로필 조회
  const commentAuthorIds = comments ? [...new Set(comments.map(c => c.author_id))] : []
  const commentProfilesMap = new Map()
  
  if (commentAuthorIds.length > 0) {
    const { data: commentProfiles } = await admin
      .from('profiles')
      .select('id, display_name, email')
      .in('id', commentAuthorIds)
    
    if (commentProfiles) {
      commentProfiles.forEach((p: any) => {
        commentProfilesMap.set(p.id, p)
      })
    }
  }
  
  // 노트에 프로필 정보 추가
  const noteWithProfile = {
    ...note,
    profiles: noteAuthorProfile || null,
  }
  
  // 댓글에 프로필 정보 추가
  const commentsWithProfiles = (comments || []).map(comment => ({
    ...comment,
    profiles: commentProfilesMap.get(comment.author_id) || null,
  }))
  
  const isAuthor = note.author_id === user.id
  
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href={`/client/${clientId}/notes`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>노트 목록으로</span>
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {note.is_pinned && <Pin size={20} className="text-yellow-500" />}
                <h1 className="text-3xl font-bold text-gray-900">{note.title || '제목 없음'}</h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>{noteWithProfile.profiles?.display_name || noteWithProfile.profiles?.email || '알 수 없음'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{new Date(noteWithProfile.created_at).toLocaleString('ko-KR')}</span>
                </div>
                {noteWithProfile.updated_at !== noteWithProfile.created_at && (
                  <span className="text-gray-400">(수정됨)</span>
                )}
              </div>
            </div>
            
            {isAuthor && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/client/${clientId}/notes/${noteId}/edit`}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="수정"
                >
                  <Edit size={20} />
                </Link>
                <NoteDetailClient noteId={noteId} clientId={clientId} isPinned={noteWithProfile.is_pinned} />
              </div>
            )}
          </div>
        </div>
        
        {/* 콘텐츠 */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <NoteContent content={noteWithProfile.content as JSONContent} />
        </div>
        
        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            댓글 ({commentsWithProfiles?.length || 0})
          </h2>
          
          <NoteCommentsClient
            noteId={noteId}
            clientId={clientId}
            initialComments={commentsWithProfiles || []}
          />
        </div>
      </div>
    </div>
  )
}

// 노트 콘텐츠 렌더링 컴포넌트
function NoteContent({ content }: { content: JSONContent | null }) {
  if (!content) {
    return <p className="text-gray-500">내용이 없습니다.</p>
  }
  
  try {
    const html = generateHTML(content, extensions)
    
    return (
      <div
        className="prose prose-lg max-w-none prose-headings:font-bold prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-img:rounded-lg prose-img:max-w-full prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-white prose-pre:p-4 prose-pre:rounded-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  } catch (error) {
    console.error('콘텐츠 렌더링 오류:', error)
    return <p className="text-red-500">콘텐츠를 표시할 수 없습니다.</p>
  }
}
