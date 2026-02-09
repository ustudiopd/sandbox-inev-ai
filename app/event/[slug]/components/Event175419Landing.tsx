'use client'

interface Event175419LandingProps {
  event: {
    id: string
    code: string
    slug: string
    title: string | null
    event_date: string | null
    event_start_date: string | null
    event_end_date: string | null
    event_date_type: 'single' | 'range'
  }
}

export default function Event175419Landing({ event }: Event175419LandingProps) {
  // 날짜 포맷팅
  const formatEventDate = () => {
    if (event.event_date_type === 'single' && event.event_date) {
      const date = new Date(event.event_date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const days = ['일', '월', '화', '수', '목', '금', '토']
      const dayName = days[date.getDay()]
      
      return `${year}. ${month}. ${day}(${dayName})`
    }
    // 기본값
    return '2026. 03. 05(목)'
  }

  const eventDate = formatEventDate()
  const location = '노보텔 앰배서더 서울 용산 한라홀 3F'

  const bgImageUrl = 'https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/gcbio/bg.png'

  return (
    <div className="w-full min-h-screen relative bg-neutral-900 overflow-hidden">
      {/* 배경 레이어 */}
      <div 
        className="w-full h-full absolute left-0 top-0 bg-neutral-900 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImageUrl})` }}
      />
      
      {/* 상단 네비게이션 바 */}
      <div className="w-full h-16 md:h-20 left-0 top-0 absolute bg-neutral-900/60 overflow-hidden z-10">
        <div className="w-full max-w-[1920px] h-full mx-auto px-4 sm:px-8 md:px-16 lg:px-[250px] relative flex items-center justify-between">
          {/* 로고 영역 */}
          <div className="w-24 sm:w-32 md:w-40 h-7 sm:h-8 md:h-9 relative overflow-hidden flex-shrink-0">
            <img
              src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/gcbio/gcbio_logo.png"
              alt="GC녹십자"
              className="w-full h-full object-contain"
            />
          </div>

          {/* 메뉴 - 가운데 정렬, 반응형 */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-4 lg:gap-8 xl:gap-12">
            <div className="h-8 py-1.5 border-b-2 border-white flex justify-center items-center">
              <div className="text-center text-white text-xs lg:text-sm xl:text-base font-medium font-['Pretendard'] leading-6 whitespace-nowrap">HOME</div>
            </div>
            <div className="h-8 py-1.5 flex justify-center items-center">
              <div className="text-center text-white text-xs lg:text-sm xl:text-base font-medium font-['Pretendard'] leading-6 whitespace-nowrap">일정</div>
            </div>
            <div className="h-8 py-1.5 flex justify-center items-center">
              <div className="text-center text-white text-xs lg:text-sm xl:text-base font-medium font-['Pretendard'] leading-6 whitespace-nowrap">프로그램</div>
            </div>
            <div className="h-8 py-1.5 flex justify-center items-center">
              <div className="text-center text-white text-xs lg:text-sm xl:text-base font-medium font-['Pretendard'] leading-6 whitespace-nowrap">리더십 진단 테스트</div>
            </div>
            <div className="h-8 py-1.5 flex justify-center items-center">
              <div className="text-center text-white text-xs lg:text-sm xl:text-base font-medium font-['Pretendard'] leading-6 whitespace-nowrap">아카이빙</div>
            </div>
          </div>

          {/* 사용자 영역 - 로고와 균형 맞춤 */}
          <div className="w-24 sm:w-32 md:w-40 flex items-center justify-end flex-shrink-0">
            <div className="w-12 sm:w-14 md:w-[68px] h-6 sm:h-6 md:h-7 rounded-[100px] border border-zinc-100 bg-transparent flex items-center justify-center">
              <div className="text-center text-zinc-100 text-xs sm:text-sm md:text-base font-medium font-['Pretendard'] leading-6 whitespace-nowrap">홍길동</div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="w-full min-h-screen flex items-center justify-center pt-16 md:pt-20 px-4 sm:px-6 md:px-8 relative z-20">
        <div className="w-full max-w-[545px] inline-flex flex-col justify-start items-center gap-4 sm:gap-5 md:gap-6 overflow-hidden">
          {/* 타이틀 이미지 */}
          <img
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/gcbio/title.png"
            alt="CROSS-FUNCTIONAL Collaboration"
            className="w-full h-auto object-contain"
          />
          
          {/* 날짜 및 장소 */}
          <div className="self-stretch text-center text-white text-base sm:text-lg md:text-xl lg:text-2xl font-medium font-['Pretendard'] leading-6 sm:leading-7 md:leading-8">
            DATE  |  {eventDate}<br/>LOCATION  |  {location}
          </div>
        </div>
      </div>
    </div>
  )
}
