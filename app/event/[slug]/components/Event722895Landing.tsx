'use client'

import Link from 'next/link'

interface Event722895LandingProps {
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

export default function Event722895Landing({ event }: Event722895LandingProps) {
  // 날짜 포맷팅
  const formatEventDate = () => {
    if (event.event_date_type === 'single' && event.event_date) {
      const date = new Date(event.event_date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
      const dayName = days[date.getDay()]
      
      return {
        date: `${year}. ${month}. ${day}`,
        day: dayName,
        time: '14:00',
      }
    }
    return {
      date: '2026. 03. 12',
      day: '목요일',
      time: '14:00',
    }
  }

  const eventDate = formatEventDate()

  return (
    <>
      {/* ===== 히어로 섹션 ===== */}
      <div className="w-full bg-stone-800">
        <div className="w-full max-w-[1000px] mx-auto min-h-[400px] md:h-[963px] relative overflow-hidden px-5 md:px-0">
          {/* 배경 이미지 및 오버레이 */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_bg2.png)' }}>
            <div className="absolute inset-0 bg-black/20" />
          </div>
          
          {/* 상단 왼쪽 로고 - 모바일: 버튼 양끝단에 맞춤 */}
          <div className="absolute left-5 md:left-[72px] top-[24px] md:top-[63px] z-10">
            <div className="w-32 h-4 md:w-72 md:h-9 relative overflow-hidden">
              <img 
                src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo-w.png" 
                alt="keywert Insight" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* 상단 오른쪽 로고 - 모바일: 버튼 양끝단에 맞춤 */}
          <div className="absolute right-5 md:right-[72px] top-[24px] md:top-[64px] z-10">
            <div className="w-32 h-4 md:w-72 md:h-9 relative overflow-hidden">
              <img 
                src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/insight_logo.png" 
                alt="keywert Insight" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="relative z-10 pt-20 md:pt-[246px] pb-12 md:pb-0 px-5 md:px-[72px]">
            <div className="w-full md:w-[691px] flex flex-col justify-start items-start gap-6 md:gap-8">
              {/* Webinar 배지 */}
              <div className="px-5 py-2 md:px-7 md:py-3 bg-white/5 rounded-full md:rounded-[32px] inline-flex justify-center items-center gap-2.5 overflow-hidden">
                <div className="text-center justify-start text-white text-lg md:text-3xl font-medium font-['Pretendard']">Webinar</div>
              </div>

              {/* 타이틀 영역 */}
              <div className="self-stretch flex flex-col justify-start items-start gap-4 md:gap-6">
                {/* 메인 타이틀 */}
                <div className="w-full md:w-[553px] flex flex-col justify-start items-start gap-0">
                  <div className="self-stretch justify-start text-white text-3xl font-bold font-['Pretendard'] leading-tight md:text-[75px]">
                    미래를 선점하는
                  </div>
                  <div className="self-stretch justify-start text-lime-300 text-3xl font-bold font-['Pretendard'] leading-tight [text-shadow:_0px_2px_16px_rgb(0_0_0_/_0.16)] md:text-[75px]">
                    기업의 비밀
                  </div>
                </div>

                {/* 서브 타이틀 및 날짜 */}
                <div className="self-stretch flex flex-col justify-start items-start gap-3">
                  <div className="self-stretch h-auto md:h-12 justify-start text-white text-base md:text-4xl font-bold font-['Pretendard'] leading-tight">
                    기술연구 AX로 CES 2027 지배하기
                  </div>
                  <div className="inline-flex justify-start items-center gap-2 md:gap-3 flex-wrap">
                    <div className="justify-start text-white text-sm md:text-3xl font-bold font-['Pretendard']">
                      {eventDate.date}
                    </div>
                    <div className="justify-start text-white text-sm md:text-3xl font-normal font-['Pretendard']">
                      {eventDate.day} {eventDate.time}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 영역 - 모바일: 하단 중앙, 데스크톱: 절대 위치 */}
            <div className="mt-8 md:mt-0 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-[744px] flex flex-row justify-center items-center gap-2 md:gap-4 w-full md:w-auto px-0 md:px-0">
              <Link
                href={`/event/${event.slug}/register`}
                className="flex-1 md:w-[419px] px-4 py-2 md:px-10 md:py-8 bg-teal-500 rounded-full md:rounded-[115px] outline outline-2 outline-offset-[-2px] outline-white/30 flex justify-center items-center gap-2.5 hover:bg-teal-600 transition-colors"
              >
                <div className="text-center justify-start text-white text-sm md:text-4xl font-bold font-['Pretendard']">
                  웨비나 등록하기
                </div>
              </Link>
              <Link
                href={`/event/${event.slug}/webinar`}
                className="flex-1 md:w-[419px] px-4 py-2 md:px-10 md:py-8 bg-teal-950 rounded-full md:rounded-[115px] outline outline-2 outline-offset-[-2px] outline-white/30 flex justify-center items-center gap-2.5 hover:bg-teal-900 transition-colors"
              >
                <div className="text-center justify-start text-white text-sm md:text-4xl font-bold font-['Pretendard']">
                  웨비나 시청하기
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== "이번 웨비나에서는" 섹션 ===== */}
      <div className="w-full">
        <div className="w-full max-w-[1000px] mx-auto md:h-[1178px] relative overflow-hidden px-5 md:px-0 py-10 md:py-0 bg-slate-100 md:bg-slate-100">
        <div className="md:left-[72px] md:top-[120px] md:absolute justify-start text-teal-600 text-2xl md:text-4xl font-bold font-['Pretendard'] leading-[36px] md:leading-[60px] mb-4 md:mb-0">이번 웨비나에서는.</div>
        <div className="md:w-[838px] md:left-[72px] md:top-[212px] md:absolute inline-flex flex-col justify-start items-start gap-8 md:gap-16">
          <div className="self-stretch flex flex-col justify-start items-start gap-10 md:gap-24">
            <div className="self-stretch flex flex-col justify-start items-start gap-4 md:gap-6">
              <div className="self-stretch justify-start text-black text-base md:text-3xl font-normal font-['Pretendard'] leading-[26px] md:leading-[48px]">
                피지컬 AI, 핵융합, 첨단바이오 등  CES를 흔드는 기술은 매년 바뀌지만, 시장을 지배하는 기업은 명확합니다. 바로 기술의 방향을 먼저 읽은 기업이죠.
              </div>
              <div className="self-stretch justify-start text-black text-base md:text-3xl font-normal font-['Pretendard'] leading-[26px] md:leading-[48px]">
                하지만 아직도 많은 기업들이  시간과 리소스가 많이 드는 과거의 기술연구 방식에 머물러 있습니다. 이 한계를 넘어서는 방법은 기술연구 AX 입니다.
              </div>
              <div className="self-stretch justify-start text-black text-base md:text-3xl font-normal font-['Pretendard'] leading-[26px] md:leading-[48px]">
                이미 앞서가는 기업들은 기술연구 AX를 통해 연구의 속도와 정확도를 높이며, 기술 인사이트를 전략으로 전환하고 있습니다.
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-0 text-teal-600 text-base md:text-3xl font-bold font-['Pretendard'] leading-[26px] md:leading-[48px]">
              <div>이번 웨비나에서 기술연구 AX를 통해</div>
              <div>CES 2026를 넘어 CES2027를 지배할 기술의</div>
              <div>진짜 미래를 가장 먼저 확인하세요!</div>
            </div>
          </div>
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_kewert.png" 
            alt="Keywert" 
            className="w-20 h-14 md:w-28 md:h-20 object-contain"
          />
        </div>
        </div>
      </div>

      {/* ===== "이런 분들께 추천합니다" 섹션 ===== */}
      <div className="w-full">
        <div className="w-full max-w-[1000px] mx-auto md:h-[1812px] relative overflow-hidden px-5 md:px-0 pt-10 pb-0 md:py-0 bg-gradient-to-b from-slate-200 to-stone-50 md:bg-gradient-to-b md:from-slate-200 md:to-stone-50">
        <div className="md:w-[456px] md:left-[72px] md:top-[127px] md:absolute inline-flex flex-col justify-start items-start gap-2 md:gap-3 mb-5 md:mb-0">
          <div className="self-stretch justify-start text-teal-600 text-xl md:text-3xl font-bold font-['Pretendard']">미래를 선점하는 기업의 비밀</div>
          <div className="self-stretch justify-start text-black/80 text-2xl md:text-5xl font-bold font-['Pretendard']">이런 분들께 추천합니다</div>
        </div>
        <div className="md:w-[856px] md:left-[72px] md:top-[299px] md:absolute inline-flex flex-col justify-start items-start gap-3 md:gap-4 mb-8 md:mb-0">
          {/* 추천 카드 1 */}
          <div className="self-stretch p-4 md:p-10 bg-white/80 rounded-[14px] md:rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2 md:gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-3 md:gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-3 md:gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_2.png" 
                  alt="연구개발 담당자" 
                  className="w-10 h-10 md:w-16 md:h-16 object-contain flex-shrink-0"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 md:gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard'] text-sm md:text-[28px] leading-[20px] md:leading-[36px]">경쟁사보다 먼저 기술 트렌드를  파악하고 싶은</div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard'] text-base md:text-[28px] leading-[22px] md:leading-[36px]">연구개발 담당자</div>
                </div>
              </div>
            </div>
          </div>
          {/* 추천 카드 2 */}
          <div className="self-stretch p-4 md:p-10 bg-white/80 rounded-[14px] md:rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2 md:gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-3 md:gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-3 md:gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_3.png" 
                  alt="의사결정권자" 
                  className="w-10 h-10 md:w-16 md:h-16 object-contain flex-shrink-0"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 md:gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard'] text-sm md:text-[28px] leading-[20px] md:leading-[36px]">조직의 기술연구 방식이 여전히 과거에  머물러 있다고 느끼는</div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard'] text-base md:text-[28px] leading-[22px] md:leading-[36px]">의사결정권자</div>
                </div>
              </div>
            </div>
          </div>
          {/* 추천 카드 3 */}
          <div className="self-stretch p-4 md:p-10 bg-white/80 rounded-[14px] md:rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2 md:gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-3 md:gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-3 md:gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_4.png" 
                  alt="사업기획·전략 담당자" 
                  className="w-10 h-10 md:w-16 md:h-16 object-contain flex-shrink-0"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 md:gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard'] text-sm md:text-[28px] leading-[20px] md:leading-[36px]">미래기술 전략을 수립해야 하는 </div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard'] text-base md:text-[28px] leading-[22px] md:leading-[36px]">사업기획·전략  담당자</div>
                </div>
              </div>
            </div>
          </div>
          {/* 추천 카드 4 */}
          <div className="self-stretch p-4 md:p-10 bg-white/80 rounded-[14px] md:rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2 md:gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-3 md:gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-3 md:gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_5.png" 
                  alt="대학교 교수 및 대학원생" 
                  className="w-10 h-10 md:w-16 md:h-16 object-contain flex-shrink-0"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 md:gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard'] text-sm md:text-[28px] leading-[20px] md:leading-[36px]">최신 기술 동향을 연구에  반영하고 싶은</div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard'] text-base md:text-[28px] leading-[22px] md:leading-[36px]">대학교 교수 및  대학원생</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 기술 박스 6개 - 모바일: 3열 grid / 데스크톱: absolute */}
        <div className="grid grid-cols-3 gap-3 mb-8 md:contents">
          <div className="flex flex-col items-center gap-2 md:w-56 md:left-[112px] md:top-[1193px] md:absolute md:inline-flex md:flex-col md:justify-start md:items-center md:gap-7">
            <img src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" alt="File icon" className="w-16 h-12 md:w-40 md:h-28 object-contain" />
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3.5">
              <div className="w-2.5 h-2.5 md:w-4 md:h-4 bg-purple-600 rounded-full" />
              <div className="text-center text-black text-xs md:text-3xl font-medium font-['Pretendard']">핵융합</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:w-56 md:left-[378.12px] md:top-[1193px] md:absolute md:inline-flex md:flex-col md:justify-start md:items-center md:gap-7">
            <img src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" alt="File icon" className="w-16 h-12 md:w-40 md:h-28 object-contain" />
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3.5">
              <div className="w-2.5 h-2.5 md:w-4 md:h-4 bg-red-600 rounded-full" />
              <div className="text-center text-black text-xs md:text-3xl font-medium font-['Pretendard']">첨단 바이오</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:w-56 md:left-[644.24px] md:top-[1193px] md:absolute md:inline-flex md:flex-col md:justify-start md:items-center md:gap-7">
            <img src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" alt="File icon" className="w-16 h-12 md:w-40 md:h-28 object-contain" />
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3.5">
              <div className="w-2.5 h-2.5 md:w-4 md:h-4 bg-blue-600 rounded-full" />
              <div className="text-center text-black text-xs md:text-3xl font-medium font-['Pretendard']">공간 컴퓨팅</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:w-56 md:left-[112px] md:top-[1400px] md:absolute md:inline-flex md:flex-col md:justify-start md:items-center md:gap-7">
            <img src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" alt="File icon" className="w-16 h-12 md:w-40 md:h-28 object-contain" />
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3.5">
              <div className="w-2.5 h-2.5 md:w-4 md:h-4 bg-yellow-500 rounded-full" />
              <div className="text-center text-black text-xs md:text-3xl font-medium font-['Pretendard']">모빌리티</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:w-56 md:left-[378px] md:top-[1400px] md:absolute md:inline-flex md:flex-col md:justify-start md:items-center md:gap-7">
            <img src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" alt="File icon" className="w-16 h-12 md:w-40 md:h-28 object-contain" />
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3.5">
              <div className="w-2.5 h-2.5 md:w-4 md:h-4 bg-green-500 rounded-full" />
              <div className="text-center text-black text-xs md:text-3xl font-medium font-['Pretendard']">피지컬 AI</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:w-56 md:left-[644px] md:top-[1400px] md:absolute md:inline-flex md:flex-col md:justify-start md:items-center md:gap-7">
            <img src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" alt="File icon" className="w-16 h-12 md:w-40 md:h-28 object-contain" />
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3.5">
              <div className="w-2.5 h-2.5 md:w-4 md:h-4 bg-yellow-400 rounded-full" />
              <div className="text-center text-black text-xs md:text-3xl font-medium font-['Pretendard']">디지털 헬스</div>
            </div>
          </div>
        </div>

        <div className="w-[calc(100%+40px)] -mx-5 md:mx-0 md:w-screen md:left-[calc(-50vw+500px)] relative md:absolute md:top-[1748px] h-12 md:h-16 bg-gray-700 rounded-tl-[32px] md:rounded-tl-[64px] rounded-tr-[32px] md:rounded-tr-[64px] md:rounded-none md:rounded-tl-[64px] md:rounded-tr-[64px]" />
        </div>
      </div>

      {/* ===== 프로그램/행사 정보 섹션 ===== */}
      <div className="w-full">
        <div className="w-full max-w-[1000px] mx-auto md:h-[3140px] relative overflow-hidden px-5 md:px-0 py-10 md:py-0 bg-gray-700 md:bg-gray-700">
        {/* 섹션 타이틀 */}
        <div className="md:w-[856px] md:left-[72px] md:top-[72px] md:absolute inline-flex flex-col justify-start items-start gap-2 md:gap-3 mb-6 md:mb-0">
          <div className="justify-start text-white text-xl md:text-3xl font-bold font-['Pretendard']">미래를 선점하는 기업의 비밀</div>
          <div className="inline-flex flex-wrap justify-start items-center gap-1 md:gap-2.5">
            <div className="justify-start text-white text-2xl md:text-5xl font-bold font-['Pretendard']">기술연구 AX로</div>
            <div 
              className="justify-start text-2xl md:text-5xl font-bold font-['Pretendard']"
              style={{
                background: 'radial-gradient(circle, #B2F174 0%, #02E7E0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              CES 2027
            </div>
            <div className="justify-start text-white text-2xl md:text-5xl font-bold font-['Pretendard']">지배하기</div>
          </div>
        </div>

        {/* 행사 정보 (OVERVIEW) */}
        <div className="w-full md:w-[856px] md:left-[72px] md:top-[262px] md:absolute inline-flex flex-col justify-start items-center gap-6 md:gap-12 mb-8 md:mb-0">
          <div className="self-stretch px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-lime-300 to-cyan-400 rounded-xl md:rounded-2xl flex flex-col justify-start items-start gap-2 md:gap-2.5 overflow-hidden">
            <div className="self-stretch inline-flex justify-between items-center">
              <div className="flex-1 md:w-96 flex justify-start items-center gap-1.5 md:gap-2">
                <div className="w-5 h-5 md:w-7 md:h-7 relative flex items-center justify-center">
                  <div className="w-5 h-5 md:w-7 md:h-7 absolute bg-black rounded-full" />
                  <div className="relative text-center text-lime-300 text-sm md:text-xl font-bold font-['Pretendard']">1</div>
                </div>
                <div className="justify-start text-black text-lg md:text-3xl font-bold font-['Pretendard']">행사 정보</div>
              </div>
              <div className="text-center justify-start text-green-200 text-sm md:text-2xl font-bold font-['Figtree'] leading-6 md:leading-10">OVERVIEW</div>
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-3 md:gap-4">
            <div className="self-stretch inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-1 md:gap-6">
              <div className="text-center justify-start text-white text-base md:text-2xl font-bold font-['Pretendard'] leading-7 md:leading-10">일&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;시</div>
              <div className="hidden md:block w-0.5 h-5 bg-white/20" />
              <div className="text-center justify-start text-white text-lg md:text-3xl font-bold font-['Pretendard'] leading-7 md:leading-10">2026년 3월 12일(목) 오후2시 - 4시 30분</div>
            </div>
            <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-white/20" />
            <div className="self-stretch inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-1 md:gap-6">
              <div className="text-center justify-start text-white text-base md:text-2xl font-bold font-['Pretendard'] leading-7 md:leading-10">장&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;소</div>
              <div className="hidden md:block w-0.5 h-5 bg-white/20" />
              <div className="text-center justify-start text-white text-lg md:text-3xl font-bold font-['Pretendard'] leading-7 md:leading-10">온라인 LIVE</div>
            </div>
            <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-white/20" />
            <div className="self-stretch inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-1 md:gap-6">
              <div className="text-center justify-start text-white text-base md:text-2xl font-bold font-['Pretendard'] leading-7 md:leading-10">참  가  비</div>
              <div className="hidden md:block w-0.5 h-5 bg-white/20" />
              <div className="text-center justify-start text-white text-lg md:text-3xl font-bold font-['Pretendard'] leading-7 md:leading-10">무료</div>
            </div>
          </div>
        </div>

        {/* 프로그램 소개 */}
        <div className="w-full md:w-[856px] md:left-[72px] md:top-[658px] md:absolute inline-flex flex-col justify-start items-start gap-6 md:gap-12">
          <div className="self-stretch px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-lime-300 to-cyan-400 rounded-xl md:rounded-2xl flex flex-col justify-start items-start gap-2 md:gap-2.5 overflow-hidden">
            <div className="self-stretch inline-flex justify-between items-center">
              <div className="flex-1 md:w-96 flex justify-start items-center gap-1.5 md:gap-2">
                <div className="w-5 h-5 md:w-7 md:h-7 relative flex items-center justify-center">
                  <div className="w-5 h-5 md:w-7 md:h-7 absolute bg-black rounded-full" />
                  <div className="relative text-center text-lime-300 text-sm md:text-xl font-bold font-['Pretendard']">2</div>
                </div>
                <div className="justify-start text-black text-lg md:text-3xl font-bold font-['Pretendard']">프로그램 소개</div>
              </div>
              <div className="text-center justify-start text-green-200 text-sm md:text-2xl font-bold font-['Figtree'] leading-6 md:leading-10">PROGRAM</div>
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            {/* 인사말 카드 */}
            <div className="self-stretch md:h-36 relative bg-black/25 rounded-xl md:rounded-2xl overflow-hidden p-4 md:p-0">
              <div className="md:left-[40px] md:top-[40px] md:absolute inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-3 md:gap-8">
                <div className="relative inline-flex rounded-full md:rounded-[41px] p-[1px]" style={{ background: 'linear-gradient(to right, #B0F176, #05E7DE)' }}>
                  <div className="bg-gray-800 rounded-full md:rounded-[41px] px-3 md:px-4 py-1 md:py-1.5 flex justify-center items-center gap-2 md:gap-2.5 md:w-[149px]">
                    <div className="text-center justify-start text-white text-sm md:text-2xl font-semibold font-['Pretendard'] leading-6 md:leading-10">인  사  말</div>
                  </div>
                </div>
                <div className="justify-start text-white text-lg md:text-4xl font-bold font-['Pretendard'] leading-7 md:leading-10">웨비나 소개 및 세션 안내</div>
              </div>
            </div>

            {/* SESSION 1 카드 */}
            <div className="self-stretch md:h-[603px] relative bg-black/25 rounded-xl md:rounded-2xl overflow-hidden p-4 md:p-0">
              <div className="md:w-[775px] md:left-[40px] md:top-[40px] md:absolute inline-flex flex-col justify-start items-start gap-4 md:gap-6">
                <div className="inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-3 md:gap-8">
                  <div className="relative inline-flex rounded-full md:rounded-[41px] p-[1px]" style={{ background: 'linear-gradient(to right, #B0F176, #05E7DE)' }}>
                    <div className="bg-gray-800 rounded-full md:rounded-[41px] px-3 md:px-4 py-1 md:py-1.5 flex justify-center items-center gap-2 md:gap-2.5">
                      <div className="text-center justify-start text-white text-sm md:text-2xl font-semibold font-['Pretendard'] leading-6 md:leading-10">SESSION 1</div>
                    </div>
                  </div>
                  <div className="justify-start text-white text-lg md:text-4xl font-bold font-['Pretendard'] leading-7 md:leading-10">앞서가는 기업의 비밀 : 기술연구 AX</div>
                </div>
                <div className="self-stretch flex flex-col gap-1 md:gap-2 pl-0 md:pl-[181px]">
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 왜 기술연구는 과거에 머물러 있나</div>
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 기술연구 AX란 무엇인가</div>
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 앞서가는 기업들이 기술연구 AX로 번환한 이유</div>
                </div>
              </div>
              {/* 연사 이미지 - 모바일 */}
              <div className="flex gap-3 mt-3 md:hidden">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_1.png" alt="윤정호 CEO" />
                  <div className="text-center text-white/60 text-[10px] font-normal font-['Pretendard']">워트인텔리전스</div>
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">윤정호 CEO</div>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_2.png" alt="장영진 COO" />
                  <div className="text-center text-white/60 text-[10px] font-normal font-['Pretendard']">워트인텔리전스</div>
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">장영진 COO</div>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_3.png" alt="나호열 CTO" />
                  <div className="text-center text-white/60 text-[10px] font-normal font-['Pretendard']">워트인텔리전스</div>
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">나호열 CTO</div>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_4.png" alt="조용상 CPO" />
                  <div className="text-center text-white/60 text-[10px] font-normal font-['Pretendard']">워트인텔리전스</div>
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">조용상 CPO</div>
                </div>
              </div>
              {/* 연사 이미지 - 데스크톱 */}
              <div className="hidden md:block w-48 h-40 left-[40px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_1.png" alt="윤정호 CEO" />
              </div>
              <div className="hidden md:block w-48 h-40 left-[234px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_2.png" alt="장영진 COO" />
              </div>
              <div className="hidden md:block w-48 h-40 left-[428px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_3.png" alt="나호열 CTO" />
              </div>
              <div className="hidden md:block w-48 h-40 left-[622px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_4.png" alt="조용상 CPO" />
              </div>
              <div className="hidden md:block w-28 h-8 left-[43px] top-[502px] absolute" />
              <div className="hidden md:block w-28 left-[69px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>윤정호 CEO</div>
              </div>
              <div className="hidden md:block w-28 left-[255px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>장영진 COO</div>
              </div>
              <div className="hidden md:block w-28 left-[460px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>나호열 CTO</div>
              </div>
              <div className="hidden md:block w-28 left-[661px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>조용상 CPO</div>
              </div>
            </div>

            {/* SESSION 2 카드 */}
            <div className="self-stretch md:h-[603px] relative bg-black/25 rounded-xl md:rounded-2xl overflow-hidden p-4 md:p-0">
              <div className="md:w-[775px] md:left-[40px] md:top-[40px] md:absolute inline-flex flex-col justify-start items-start gap-4 md:gap-6">
                <div className="inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-3 md:gap-8">
                  <div className="relative inline-flex rounded-full md:rounded-[41px] p-[1px]" style={{ background: 'linear-gradient(to right, #B0F176, #05E7DE)' }}>
                    <div className="bg-gray-800 rounded-full md:rounded-[41px] px-3 md:px-4 py-1 md:py-1.5 flex justify-center items-center gap-2 md:gap-2.5">
                      <div className="text-center justify-start text-white text-sm md:text-2xl font-semibold font-['Pretendard'] leading-6 md:leading-10">SESSION 2</div>
                    </div>
                  </div>
                  <div className="justify-start text-white text-lg md:text-4xl font-bold font-['Pretendard'] leading-7 md:leading-10">CES 2026 화제 기술들의 미래 해부하기</div>
                </div>
                <div className="self-stretch flex flex-col gap-1 md:gap-2 pl-0 md:pl-[181px]">
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 미래 산업을 이끌 핵심 기술들의 진화 방향 </div>
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 화려한 발표 뒤, 진짜 기술력을 확인하는 방법</div>
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 10분 만에 완성하는 기술 트렌드 분석</div>
                </div>
              </div>
              {/* 연사 이미지 - 모바일 */}
              <div className="flex gap-3 mt-3 md:hidden">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_5.png" alt="최덕형 리드" />
                  <div className="text-center text-white/60 text-[10px] font-normal font-['Pretendard']">AI데이터전략팀</div>
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">최덕형 리드</div>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_6.png" alt="이상우 수석 컨설턴트" />
                  <div className="text-center text-white/60 text-[10px] font-normal font-['Pretendard']">AI데이터전략팀</div>
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">이상우 수석 컨설턴트</div>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_7.png" alt="김태규 수석 컨설턴트" />
                  <div className="text-center text-white/60 text-[10px] font-normal font-['Pretendard']">AX전략팀</div>
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">김태규 수석 컨설턴트</div>
                </div>
              </div>
              {/* 연사 이미지 - 데스크톱 */}
              <div className="hidden md:block w-48 h-40 left-[202px] top-[328.71px] absolute"><img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_5.png" alt="최덕형 리드" /></div>
              <div className="hidden md:block w-48 h-40 left-[412px] top-[328.71px] absolute"><img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_6.png" alt="이상우 수석 컨설턴트" /></div>
              <div className="hidden md:block w-48 h-40 left-[622px] top-[328.71px] absolute"><img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_7.png" alt="김태규 수석 컨설턴트" /></div>
              <div className="hidden md:block left-[232px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px"><div className="text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">AI데이터전략팀</div><div className="text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>최덕형 리드</div></div>
              <div className="hidden md:block left-[399px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px"><div className="text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">AI데이터전략팀</div><div className="text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>이상우 수석 컨설턴트</div></div>
              <div className="hidden md:block left-[624px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px"><div className="text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">AX전략팀</div><div className="text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>김태규 수석 컨설턴트</div></div>
            </div>

            {/* SESSION 3 카드 */}
            <div className="self-stretch md:h-[581px] relative bg-black/25 rounded-xl md:rounded-2xl overflow-hidden p-4 md:p-0">
              <div className="md:w-[775px] md:left-[40px] md:top-[40px] md:absolute inline-flex flex-col justify-start items-start gap-4 md:gap-6">
                <div className="inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-3 md:gap-8">
                  <div className="relative inline-flex rounded-full md:rounded-[41px] p-[1px]" style={{ background: 'linear-gradient(to right, #B0F176, #05E7DE)' }}>
                    <div className="bg-gray-800 rounded-full md:rounded-[41px] px-3 md:px-4 py-1 md:py-1.5 flex justify-center items-center gap-2 md:gap-2.5">
                      <div className="text-center justify-start text-white text-sm md:text-2xl font-semibold font-['Pretendard'] leading-6 md:leading-10">SESSION 3</div>
                    </div>
                  </div>
                  <div className="justify-start text-white text-lg md:text-4xl font-bold font-['Pretendard'] leading-7 md:leading-10">기술연구 AX 전환 사례 | 고객 사례</div>
                </div>
                <div className="self-stretch flex flex-col gap-1 md:gap-2 pl-0 md:pl-[181px]">
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 직면하고 있던 과제들</div>
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 기술연구 AX를 도입하게 된 이유</div>
                  <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">- 도입 전 vs 도입 후 결과 비교</div>
                </div>
              </div>
              {/* 연사 이미지 - 모바일 */}
              <div className="flex gap-3 mt-3 md:hidden">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_8.png" alt="기업 R&D 담당자" />
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">기업 R&D 담당자</div>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <img className="w-16 h-14 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_9.png" alt="변리사" />
                  <div className="text-center text-white text-xs font-bold font-['Pretendard'] whitespace-nowrap">변리사</div>
                </div>
              </div>
              {/* 연사 이미지 - 데스크톱 */}
              <div className="hidden md:block w-48 h-40 left-[428px] top-[328.71px] absolute"><img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_8.png" alt="기업 R&D 담당자" /></div>
              <div className="hidden md:block w-48 h-40 left-[622px] top-[328.71px] absolute"><img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_9.png" alt="변리사" /></div>
              <div className="hidden md:block left-[432.50px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px"><div className="text-center text-white font-bold font-['Pretendard'] leading-8" style={{ fontSize: '23px' }}>기업 R&D 담당자</div></div>
              <div className="hidden md:block left-[688px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px"><div className="text-center text-white font-bold font-['Pretendard'] leading-8" style={{ fontSize: '23px' }}>변리사</div></div>
            </div>

            {/* SESSION 4 카드 */}
            <div className="self-stretch md:h-64 relative bg-black/25 rounded-xl md:rounded-2xl overflow-hidden p-4 md:p-0">
              <div className="md:w-[775px] md:left-[40px] md:top-[40px] md:absolute inline-flex flex-col justify-start items-start gap-4 md:gap-6">
                <div className="inline-flex flex-col md:flex-row justify-start items-start md:items-center gap-3 md:gap-8">
                  <div className="relative inline-flex rounded-full md:rounded-[41px] p-[1px]" style={{ background: 'linear-gradient(to right, #B0F176, #05E7DE)' }}>
                    <div className="bg-gray-800 rounded-full md:rounded-[41px] px-3 md:px-4 py-1 md:py-1.5 flex justify-center items-center gap-2 md:gap-2.5">
                      <div className="text-center justify-start text-white text-sm md:text-2xl font-semibold font-['Pretendard'] leading-6 md:leading-10">SESSION 4</div>
                    </div>
                  </div>
                  <div className="justify-start text-white text-lg md:text-4xl font-bold font-['Pretendard'] leading-7 md:leading-10">실시간 Q&A</div>
                </div>
                <div className="self-stretch flex flex-col gap-1 md:gap-2 pl-0 md:pl-[181px]">
                  <div className="flex flex-col justify-start items-start gap-0 text-white/80 font-medium font-['Pretendard'] leading-7 md:leading-10 text-sm md:text-[28px]">
                    <div>&quot;우리 회사의 기술연구 AX, 어떻게 시작할까?&quot;</div>
                    <div>궁금한 내용을 연사분들께 실시간으로 질문해주세요!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ===== 이벤트 섹션 ===== */}
      <div className="w-full">
        <div className="w-full max-w-[1000px] mx-auto md:h-[2856px] relative overflow-hidden px-5 md:px-0 py-10 md:py-0 bg-slate-200 md:bg-slate-200">
        {/* 로고 */}
        <div className="md:w-72 md:h-9 md:left-[72px] md:top-[120px] md:absolute mb-3 md:mb-0">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png" 
            alt="keywert Insight" 
            className="h-5 md:h-full object-contain"
          />
        </div>
        {/* WEBINAR EVENT 타이틀 */}
        <div className="md:left-[72px] md:top-[221px] md:absolute justify-start mb-6 md:mb-0">
          <span className="text-gray-700 text-4xl md:text-9xl font-bold font-['Gmarket_Sans_TTF']">WEBINAR<br /></span>
          <span className="text-teal-600 text-4xl md:text-9xl font-bold font-['Gmarket_Sans_TTF']">EVENT</span>
        </div>
        {/* 선물 아이콘 - 데스크톱만 */}
        <div className="hidden md:block h-28 px-9 py-3.5 absolute bg-white/5 rounded-[37.91px] inline-flex justify-center items-center gap-3 overflow-hidden" style={{ left: '685px', top: '131px' }}>
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_6_new.png" 
            alt="Gift" 
            className="object-contain"
            style={{ width: '147px', height: '109px' }}
          />
        </div>
        {/* EVENT 1 */}
        <div className="md:w-[689px] md:left-[72px] md:top-[635px] md:absolute inline-flex flex-col justify-start items-start gap-4 md:gap-6 mb-6 md:mb-0">
          <div className="px-4 md:px-6 py-1.5 md:py-3 bg-gray-700 rounded-full md:rounded-[76px] inline-flex justify-center items-center gap-2 md:gap-2.5 overflow-hidden">
            <div className="justify-start text-white text-lg md:text-3xl font-bold font-['Pretendard']">EVENT 1</div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-2 md:gap-4">
            <div className="self-stretch justify-start text-black text-2xl md:text-5xl font-bold font-['Pretendard']">사전 등록 이벤트 </div>
            <div className="self-stretch justify-start text-black text-sm md:text-3xl font-normal font-['Pretendard'] leading-[22px] md:leading-[48px]">
              본 웨비나 사전 등록 후 참석해 주신 분들 중 추첨을 통해 총 100분께 커피 기프티콘을 드립니다.
            </div>
          </div>
        </div>
        {/* 메가커피 카드 */}
        <div className="md:w-[856px] md:h-56 md:left-[72px] md:top-[928px] md:absolute bg-yellow-400 rounded-[20px] md:rounded-[32px] overflow-hidden relative p-4 md:p-0 mb-6 md:mb-0 min-h-[96px] md:min-h-0 flex md:block">
          <div className="w-40 h-40 -right-[102px] -bottom-20 md:w-[519px] md:h-[519px] md:left-[444px] md:top-[22px] md:right-auto md:bottom-auto absolute bg-yellow-300 rounded-full" style={{ left: '214px', top: '16px' }} />
          <img className="absolute right-2 -bottom-2 w-24 h-24 md:right-auto md:bottom-auto md:w-[250px] md:h-[250px] md:left-[550px] md:bottom-[-20px] object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_megacoffee.png" alt="메가MGC커피" />
          <div className="md:w-80 md:left-[40px] md:top-[68px] md:absolute inline-flex flex-col justify-start items-start gap-1 md:gap-3 pr-28 md:pr-0">
            <div className="justify-start text-black text-lg md:text-4xl font-bold font-['Pretendard']">메가MGC커피 기프티콘</div>
            <div className="justify-start text-black text-sm md:text-3xl font-medium font-['Pretendard']">사전등록자 추첨 100명</div>
          </div>
        </div>
        {/* EVENT 2 */}
        <div className="md:left-[72px] md:top-[1248px] md:absolute inline-flex flex-col justify-start items-start gap-4 md:gap-6 mb-6 md:mb-0">
          <div className="px-4 md:px-6 py-1.5 md:py-3 bg-gray-700 rounded-full md:rounded-[76px] inline-flex justify-center items-center gap-2 md:gap-2.5 overflow-hidden">
            <div className="justify-start text-white text-lg md:text-3xl font-bold font-['Pretendard']">EVENT 2</div>
          </div>
          <div className="flex flex-col justify-start items-start gap-2 md:gap-4">
            <div className="self-stretch justify-start text-black text-2xl md:text-5xl font-bold font-['Pretendard']">웨비나 적극 참여 이벤트</div>
            <div className="self-stretch justify-start text-black text-sm md:text-3xl font-normal font-['Pretendard'] leading-[22px] md:leading-[48px]">적극적으로 참여해주시는 분들에게 소정의 상품을 드립니다.</div>
          </div>
        </div>
        {/* QnA 질문자 카드 */}
        <div className="md:w-[856px] md:h-64 md:left-[72px] md:top-[1493px] md:absolute bg-stone-600 rounded-[20px] md:rounded-[32px] overflow-hidden relative p-4 md:p-0 mb-4 md:mb-0 min-h-[100px] md:min-h-0 flex md:block">
          <div className="md:left-[40px] md:top-[56px] md:absolute inline-flex flex-col justify-start items-start gap-1.5 md:gap-3 md:pr-[420px]">
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3 flex-wrap">
              <div className="px-2 md:px-3.5 py-0.5 md:py-1 bg-black/25 rounded-lg flex justify-center items-center overflow-hidden">
                <div className="text-white text-xs md:text-2xl font-bold font-['Pretendard']">5명 추첨</div>
              </div>
              <div className="text-white text-base md:text-4xl font-bold font-['Pretendard']">QnA 질문자</div>
            </div>
            <div className="justify-start pr-24 md:pr-0">
              <span className="text-white text-xs md:text-3xl font-medium font-['Pretendard'] leading-4 md:leading-10">
                Q&A 세션에서 좋은 질문을 해주신 분들 중{'\n'}추첨을 통해{' '}
              </span>
              <span className="text-white text-xs md:text-3xl font-bold font-['Pretendard'] leading-4 md:leading-10">BBQ 기프티콘</span>
              <span className="text-white text-xs md:text-3xl font-medium font-['Pretendard'] leading-4 md:leading-10">을 드립니다.</span>
            </div>
          </div>
          <img className="absolute right-0 -bottom-3 w-24 h-24 md:left-[550px] md:bottom-[-50px] md:w-96 md:h-80 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_chicken.png" alt="BBQ 치킨" />
        </div>
        {/* 설문조사 작성자 카드 */}
        <div className="md:w-[856px] md:h-72 md:left-[72px] md:top-[1760px] md:absolute bg-amber-800 rounded-[20px] md:rounded-[32px] overflow-hidden relative p-4 md:p-0 mb-6 md:mb-0 min-h-[120px] md:min-h-0 flex md:block">
          <div className="md:left-[40px] md:top-[56px] md:absolute inline-flex flex-col justify-start items-start gap-1.5 md:gap-3 md:pr-[420px]">
            <div className="inline-flex justify-start items-center gap-1.5 md:gap-3 flex-wrap">
              <div className="px-2 md:px-3.5 py-0.5 md:py-1 bg-black/25 rounded-lg flex justify-center items-center overflow-hidden">
                <div className="text-white text-xs md:text-2xl font-bold font-['Pretendard']">5명 추첨</div>
              </div>
              <div className="text-white text-base md:text-4xl font-bold font-['Pretendard']">설문조사 작성자</div>
            </div>
            <div className="justify-start pr-24 md:pr-0">
              <span className="text-white text-xs md:text-3xl font-medium font-['Pretendard'] leading-4 md:leading-10">
                웨비나 참여 후 설문조사를 작성해주신 분들 중{'\n'}추첨을 통해{' '}
              </span>
              <span className="text-white text-xs md:text-3xl font-bold font-['Pretendard'] leading-4 md:leading-10">도미노피자 기프티콘</span>
              <span className="text-white text-xs md:text-3xl font-medium font-['Pretendard'] leading-4 md:leading-10">을 드립니다.</span>
            </div>
            <div className="md:hidden text-white/60 text-[10px] font-normal font-['Pretendard'] leading-4 mt-0">*설문조사는 웨비나 종료 후 작성 가능합니다.</div>
          </div>
          <div className="hidden md:block md:w-[733px] md:left-[40px] md:top-[240px] md:absolute justify-start text-white/60 text-2xl font-normal font-['Pretendard'] leading-9">*설문조사는 웨비나 종료 후 작성 가능합니다.</div>
          <img className="absolute right-0 -bottom-3 w-24 h-24 md:right-auto md:bottom-auto md:left-[520px] md:top-[10px] md:w-[400px] md:h-80 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_pizza.png" alt="도미노피자" />
        </div>
        {/* EVENT 3 */}
        <div className="md:w-[856px] md:left-[72px] md:top-[2163px] md:absolute inline-flex flex-col justify-start items-start gap-6 md:gap-10">
          <div className="flex flex-col justify-start items-start gap-4 md:gap-6">
            <div className="px-4 md:px-6 py-1.5 md:py-3 bg-gray-700 rounded-full md:rounded-[76px] inline-flex justify-center items-center gap-2 md:gap-2.5 overflow-hidden">
              <div className="justify-start text-white text-lg md:text-3xl font-bold font-['Pretendard']">EVENT 3</div>
            </div>
            <div className="flex flex-col justify-start items-start gap-2 md:gap-4">
              <div className="self-stretch justify-start text-black text-2xl md:text-5xl font-bold font-['Pretendard']">특별 혜택 이벤트</div>
              <div className="self-stretch justify-start text-black text-sm md:text-3xl font-normal font-['Pretendard'] leading-[22px] md:leading-[48px]">참석자 한정 특별한 혜택을 모두 드립니다!</div>
            </div>
          </div>
          <div className="self-stretch flex flex-row justify-start items-stretch gap-3 md:gap-4">
            <div className="flex-1 md:w-[420px] p-4 md:p-8 bg-gray-700 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 inline-flex flex-col justify-start items-end gap-3 md:gap-8 overflow-hidden">
              <div className="self-stretch justify-start">
                <span className="text-white text-base md:text-[28px] font-bold font-['Pretendard'] leading-5 md:leading-10">키워트 인사이트 신규회원 대상 </span>
                <span className="text-teal-400 text-base md:text-[28px] font-bold font-['Pretendard'] leading-5 md:leading-10">무료 체험 제공</span>
              </div>
              <img className="w-12 h-12 md:w-32 md:h-32" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_7.png" alt="Benefit" />
            </div>
            <div className="flex-1 md:w-[420px] p-4 md:p-8 bg-gray-700 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 inline-flex flex-col justify-start items-end gap-3 md:gap-8 overflow-hidden">
              <div className="self-stretch justify-start">
                <span className="text-white text-base md:text-[28px] font-bold font-['Pretendard'] leading-5 md:leading-10">웨비나 참여 후 엔터프라이즈용 상담 신청하면 </span>
                <span className="text-teal-400 text-base md:text-[28px] font-bold font-['Pretendard'] leading-5 md:leading-10">특별 견적 제공</span>
              </div>
              <img className="w-12 h-12 md:w-32 md:h-32" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_8.png" alt="Benefit" />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ===== 주의사항/문의사항 섹션 ===== */}
      <div className="w-full">
        <div className="w-full max-w-[1000px] mx-auto px-5 md:px-16 py-12 md:py-28 bg-neutral-50 md:bg-neutral-50 flex flex-col justify-start items-start gap-8 md:gap-16 overflow-hidden">
          <div className="w-full max-w-[856px] mx-auto flex flex-col justify-start items-start gap-6 md:gap-10">
          <div className="self-stretch justify-start text-black/60 text-xl md:text-4xl font-bold font-['Pretendard'] leading-[28px] md:leading-[47.82px]">키워트 인사이트 웨비나 주의사항</div>
          <div className="self-stretch flex flex-col justify-start items-start gap-4 md:gap-8">
            <div className="self-stretch flex flex-col justify-start items-start gap-2.5 md:gap-4">
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-4 md:w-5 self-stretch relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 left-0 top-[8px] md:top-[13px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="justify-start text-black/60 text-xs md:text-3xl font-normal font-['Pretendard'] leading-5 md:leading-10">본 웨비나는 사전 등록을 하신 분에 한하여 참여 가능합니다.</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-4 md:w-5 self-stretch relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 left-0 top-[8px] md:top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-xs md:text-3xl font-normal font-['Pretendard'] leading-5 md:leading-10">웨비나 참여 링크 메일 발송 - 3월 10일</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-4 md:w-5 self-stretch relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 left-0 top-[8px] md:top-[13px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-xs md:text-3xl font-normal font-['Pretendard'] leading-5 md:leading-10">웨비나 참여 링크 메일 및 문자 - 3월 11일</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-4 md:w-5 self-stretch relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 left-0 top-[8px] md:top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-xs md:text-3xl font-normal font-['Pretendard'] leading-5 md:leading-10">본 웨비나는 라이브로 진행되며 사전 등록하신 분들께는 다시보기를 제공합니다.</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-4 md:w-5 self-stretch relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 left-0 top-[8px] md:top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-xs md:text-3xl font-normal font-['Pretendard'] leading-5 md:leading-10">
                  마케팅 정보 활용 동의를 거부할 경우 웨비나 시청, 발표 콘텐츠 수신 등이 제한됩니다.
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-4 md:gap-10">
            <div className="self-stretch justify-start text-black/60 text-xl md:text-4xl font-bold font-['Pretendard'] leading-[28px] md:leading-[47.82px]">문의 사항</div>
            <div className="self-stretch flex flex-col justify-start items-start gap-2.5 md:gap-4">
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-4 md:w-5 self-stretch relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 left-0 top-[8px] md:top-[13px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="justify-start text-black/60 text-xs md:text-3xl font-normal font-['Pretendard'] leading-5 md:leading-10">웨비나와 관련된 문의사항이 있으시면 아래 메일로 통해 문의주시기 바랍니다.</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-4 md:w-5 self-stretch relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 left-0 top-[8px] md:top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-xs md:text-3xl font-normal font-['Pretendard'] leading-5 md:leading-10">메일문의 connect@wert.co.kr</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ===== 푸터 ===== */}
      <div className="w-full h-16 md:h-24 bg-neutral-800 flex items-center justify-center">
        <div className="w-full max-w-[1000px] mx-auto flex items-center justify-center px-5 md:px-0">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo-w.png" 
            alt="keywert Insight" 
            className="h-5 md:h-8 object-contain"
          />
        </div>
      </div>
    </>
  )
}
