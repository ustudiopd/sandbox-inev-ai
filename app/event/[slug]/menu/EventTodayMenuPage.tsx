'use client'

import Event222152Header from '../components/Event222152Header'

interface EventTodayMenuPageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  pathSlug?: string
}

export default function EventTodayMenuPage({ event, pathSlug }: EventTodayMenuPageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <div className="w-full relative flex flex-col min-h-screen" style={{ background: '#F9F9F9' }}>
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="today-menu" />
        <main className="w-full flex-1 flex items-center justify-center">
          <p
            className="font-['Pretendard'] self-stretch flex items-center justify-center text-center"
            style={{
              color: '#111',
              fontSize: 44,
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '140%',
              letterSpacing: '-0.44px',
            }}
          >
            Nothing
          </p>
        </main>
      </div>
    </div>
  )
}
