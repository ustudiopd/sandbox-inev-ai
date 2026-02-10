'use client'

import Event222152Header from '../components/Event222152Header'

interface CollaborationStylePageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  /** URL 경로의 slug (헤더 링크가 현재 주소와 맞도록) */
  pathSlug?: string
}

export default function CollaborationStylePage({ event, pathSlug }: CollaborationStylePageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <div
      className="w-full relative flex flex-col min-h-screen"
      style={{
        background: '#F9F9F9',
      }}
    >
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="collaboration-style" />

        <main
          className="w-full flex justify-center items-center box-border flex-1"
          style={{
            padding: '150px 250px 145px 250px',
          }}
        >
          <div className="flex flex-col justify-center items-center w-full max-w-[1420px]">
            <h1
              className="font-['Pretendard']"
              style={{
                alignSelf: 'stretch',
                color: '#111',
                textAlign: 'center',
                fontFamily: 'Pretendard',
                fontSize: '44px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.44px',
                marginBottom: '24px',
              }}
            >
              협업 스타일 진단
            </h1>
            <p
              className="font-['Pretendard']"
              style={{
                color: '#111',
                textAlign: 'center',
                fontFamily: 'Pretendard',
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
              }}
            >
              당신은 어떤 리더인가요? 지금 한번 알아볼까요?
            </p>
            <button
              type="button"
              className="font-['Pretendard'] flex items-center justify-center cursor-pointer border-0"
              style={{
                marginTop: '70px',
                width: '360px',
                height: '60px',
                borderRadius: '100px',
                background: '#000',
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: '100%',
              }}
            >
              Click
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
