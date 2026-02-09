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
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayName = days[date.getDay()]
      
      return {
        date: `${year}. ${month}. ${day}`,
        day: dayName,
        time: '14:00',
      }
    }
    return {
      date: '2026. 03. 12',
      day: 'Thu',
      time: '14:00',
    }
  }

  const eventDate = formatEventDate()

  const heroBgImageUrl = 'https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_section1_bg.png'

  return (
    <>
      <div className="w-full h-[754px] relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBgImageUrl})` }}>
        <div className="w-[1000px] mx-auto h-full relative">
        </div>
      </div>
      <div className="w-full bg-slate-100">
        <div className="w-[1000px] mx-auto h-[1178px] relative overflow-hidden">
        <div className="left-[72px] top-[120px] absolute justify-start text-teal-600 text-4xl font-bold font-['Pretendard'] leading-[60px]">이번 웨비나에서는.</div>
        <div className="w-[838px] left-[72px] top-[212px] absolute inline-flex flex-col justify-start items-start gap-16">
          <div className="self-stretch flex flex-col justify-start items-start gap-24">
            <div className="self-stretch flex flex-col justify-start items-start gap-6">
              <div className="self-stretch justify-start text-black text-3xl font-normal font-['Pretendard'] leading-[48px]">
                피지컬 AI, 핵융합, 첨단바이오 등  CES를 흔드는 기술은 매년 바뀌지만, 시장을 지배하는 기업은 명확합니다. 바로 기술의 방향을 먼저<br />
                읽은 기업이죠.
              </div>
              <div className="self-stretch justify-start text-black text-3xl font-normal font-['Pretendard'] leading-[48px]">
                하지만 아직도 많은 기업들이  시간과 리소스가 많이 드는 과거의<br />
                기술연구 방식에 머물러 있습니다. 이 한계를 넘어서는 방법은<br />
                기술연구 AX 입니다.
              </div>
              <div className="self-stretch justify-start text-black text-3xl font-normal font-['Pretendard'] leading-[48px]">
                이미 앞서가는 기업들은 기술연구 AX를 통해 연구의 속도와 정확도를 높이며, 기술 인사이트를 전략으로 전환하고 있습니다.
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-0 text-teal-600 text-3xl font-bold font-['Pretendard'] leading-[48px]">
              <div>이번 웨비나에서 기술연구 AX를 통해</div>
              <div>CES 2026를 넘어 CES2027를 지배할 기술의</div>
              <div>진짜 미래를 가장 먼저 확인하세요!</div>
            </div>
          </div>
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_kewert.png" 
            alt="Keywert" 
            className="w-28 h-20 object-contain"
          />
        </div>
        </div>
      </div>
      <div className="w-full h-[1812px] relative bg-gradient-to-b from-slate-200 to-stone-50 overflow-hidden">
        <div className="w-[1000px] mx-auto h-full relative">
        <div className="w-[456px] left-[72px] top-[127px] absolute inline-flex flex-col justify-start items-start gap-3">
          <div className="self-stretch justify-start text-teal-600 text-3xl font-bold font-['Pretendard']">미래를 선점하는 기업의 비밀</div>
          <div className="self-stretch justify-start text-black/80 text-5xl font-bold font-['Pretendard']">이런 분들께 추천합니다</div>
        </div>
        <div className="w-[856px] left-[72px] top-[299px] absolute inline-flex flex-col justify-start items-start gap-4">
          <div className="self-stretch p-10 bg-white/80 rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_2.png" 
                  alt="연구개발 담당자" 
                  className="w-16 h-16 object-contain"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard']" style={{ fontSize: '28px' }}>경쟁사보다 먼저 기술 트렌드를  파악하고 싶은</div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard']" style={{ fontSize: '28px' }}>연구개발 담당자</div>
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch p-10 bg-white/80 rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_3.png" 
                  alt="의사결정권자" 
                  className="w-16 h-16 object-contain"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard']" style={{ fontSize: '28px' }}>조직의 기술연구 방식이 여전히 과거에  머물러 있다고 느끼는</div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard']" style={{ fontSize: '28px' }}>의사결정권자</div>
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch p-10 bg-white/80 rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_4.png" 
                  alt="사업기획·전략 담당자" 
                  className="w-16 h-16 object-contain"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard']" style={{ fontSize: '28px' }}>미래기술 전략을 수립해야 하는 </div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard']" style={{ fontSize: '28px' }}>사업기획·전략  담당자</div>
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch p-10 bg-white/80 rounded-[19px] outline outline-1 outline-offset-[-1px] outline-black/10 flex flex-col justify-center items-start gap-2.5 overflow-hidden">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <img 
                  src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_5.png" 
                  alt="대학교 교수 및 대학원생" 
                  className="w-16 h-16 object-contain"
                />
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-4">
                  <div className="self-stretch justify-start text-black/60 font-normal font-['Pretendard']" style={{ fontSize: '28px' }}>최신 기술 동향을 연구에  반영하고 싶은</div>
                  <div className="self-stretch justify-start text-black/80 font-bold font-['Pretendard']" style={{ fontSize: '28px' }}>대학교 교수 및  대학원생</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-screen md:left-[calc(-50vw+500px)] h-16 top-[1748px] absolute bg-gray-700 rounded-tl-[64px] rounded-tr-[64px] md:rounded-none md:rounded-tl-[64px] md:rounded-tr-[64px]" />
        <div className="w-56 left-[112px] top-[1400px] absolute inline-flex flex-col justify-start items-center gap-7">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" 
            alt="File icon" 
            className="w-40 h-28 object-contain"
          />
          <div className="inline-flex justify-start items-center gap-3.5">
            <div className="w-4 h-4 bg-yellow-500 rounded-full" />
            <div className="text-center justify-start text-black text-3xl font-medium font-['Pretendard']">모빌리티</div>
          </div>
        </div>
        <div className="w-56 left-[378px] top-[1400px] absolute inline-flex flex-col justify-start items-center gap-7">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" 
            alt="File icon" 
            className="w-40 h-28 object-contain"
          />
          <div className="inline-flex justify-start items-center gap-3.5">
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <div className="text-center justify-start text-black text-3xl font-medium font-['Pretendard']">피지컬 AI</div>
          </div>
        </div>
        <div className="w-56 left-[644px] top-[1400px] absolute inline-flex flex-col justify-start items-center gap-7">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" 
            alt="File icon" 
            className="w-40 h-28 object-contain"
          />
          <div className="inline-flex justify-start items-center gap-3.5">
            <div className="w-4 h-4 bg-yellow-400 rounded-full" />
            <div className="text-center justify-start text-black text-3xl font-medium font-['Pretendard']"> 디지털 헬스</div>
          </div>
        </div>
        <div className="w-56 left-[378.12px] top-[1193px] absolute inline-flex flex-col justify-start items-center gap-7">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" 
            alt="File icon" 
            className="w-40 h-28 object-contain"
          />
          <div className="inline-flex justify-start items-center gap-3.5">
            <div className="w-4 h-4 bg-red-600 rounded-full" />
            <div className="text-center justify-start text-black text-3xl font-medium font-['Pretendard']">첨단 바이오</div>
          </div>
        </div>
        <div className="w-56 left-[644.24px] top-[1193px] absolute inline-flex flex-col justify-start items-center gap-7">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" 
            alt="File icon" 
            className="w-40 h-28 object-contain"
          />
          <div className="inline-flex justify-start items-center gap-3.5">
            <div className="w-4 h-4 bg-blue-600 rounded-full" />
            <div className="text-center justify-start text-black text-3xl font-medium font-['Pretendard']">공간 컴퓨팅</div>
          </div>
        </div>
        <div className="w-56 left-[112px] top-[1193px] absolute inline-flex flex-col justify-start items-center gap-7">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_file.png" 
            alt="File icon" 
            className="w-40 h-28 object-contain"
          />
          <div className="inline-flex justify-start items-center gap-3.5">
            <div className="w-4 h-4 bg-purple-600 rounded-full" />
            <div className="text-center justify-start text-black text-3xl font-medium font-['Pretendard']">핵융합</div>
          </div>
        </div>
        </div>
      </div>
      <div className="w-full h-[3140px] relative bg-gray-700 overflow-hidden">
        <div className="w-[1000px] mx-auto h-full relative">
        <div className="w-[856px] left-[72px] top-[72px] absolute inline-flex flex-col justify-start items-start gap-3">
          <div className="justify-start text-white text-3xl font-bold font-['Pretendard']">미래를 선점하는 기업의 비밀</div>
          <div className="inline-flex justify-start items-center gap-2.5 flex-nowrap whitespace-nowrap">
            <div className="justify-start text-white text-5xl font-bold font-['Pretendard']">기술연구 AX로</div>
            <div 
              className="justify-start text-5xl font-bold font-['Pretendard']"
              style={{
                background: 'radial-gradient(circle, #B2F174 0%, #02E7E0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              CES 2027
            </div>
            <div className="justify-start text-white text-5xl font-bold font-['Pretendard']">지배하기</div>
          </div>
        </div>
        <div className="w-[856px] left-[72px] top-[658px] absolute inline-flex flex-col justify-start items-start gap-12">
          <div className="self-stretch px-6 py-3 bg-gradient-to-r from-lime-300 to-cyan-400 rounded-2xl flex flex-col justify-start items-start gap-2.5 overflow-hidden">
            <div className="self-stretch inline-flex justify-between items-center">
              <div className="w-96 flex justify-start items-center gap-2">
                <div className="w-7 h-7 bg-black rounded-full" />
                <div className="w-2.5 h-6 text-center justify-start text-lime-300 text-xl font-bold font-['Pretendard']">2</div>
                <div className="justify-start text-black text-3xl font-bold font-['Pretendard']">프로그램 소개</div>
              </div>
              <div className="text-center justify-start text-green-200 text-2xl font-bold font-['Figtree'] leading-10">PROGRAM</div>
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            <div className="self-stretch h-36 relative bg-black/25 rounded-2xl overflow-hidden">
              <div className="left-[40px] top-[40px] absolute inline-flex justify-start items-center gap-8">
                <div className="w-40 px-4 py-1.5 bg-white/10 rounded-[41px] outline outline-1 outline-offset-[-1px] outline-lime-300 flex justify-center items-center gap-2.5 overflow-hidden">
                  <div className="text-center justify-start text-white text-2xl font-semibold font-['Pretendard'] leading-10">인  사  말</div>
                </div>
                <div className="text-right justify-start text-white text-4xl font-bold font-['Pretendard'] leading-10">웨비나 소개 및 세션 안내</div>
              </div>
            </div>
            <div className="self-stretch h-[603px] relative bg-black/25 rounded-2xl overflow-hidden">
              <div className="w-[775px] left-[40px] top-[40px] absolute inline-flex flex-col justify-start items-start gap-6">
                <div className="inline-flex justify-start items-center gap-8">
                  <div className="w-40 px-4 py-1.5 bg-white/10 rounded-[41px] outline outline-1 outline-offset-[-1px] outline-lime-300 flex justify-center items-center gap-2.5 overflow-hidden">
                    <div className="text-center justify-start text-white text-2xl font-semibold font-['Pretendard'] leading-10">SESSION 1</div>
                  </div>
                  <div className="text-right justify-start text-white text-4xl font-bold font-['Pretendard'] leading-10">앞서가는 기업의 비밀 : 기술연구 AX</div>
                </div>
                <div className="self-stretch inline-flex justify-start items-center gap-8">
                  <div className="w-40 h-14 px-4 py-1.5 opacity-0 bg-white/10 rounded-[41px] border border-white/10" />
                  <div className="w-[522px] inline-flex flex-col justify-start items-start gap-2">
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 왜 기술연구는 과거에 머물러 있나</div>
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 기술연구 AX란 무엇인가</div>
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10 whitespace-nowrap" style={{ fontSize: '28px' }}>- 앞서가는 기업들이 기술연구 AX로 번환한 이유</div>
                  </div>
                </div>
              </div>
              <div className="w-48 h-40 left-[40px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_1.png" alt="윤정호 CEO" />
              </div>
              <div className="w-48 h-40 left-[234px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_2.png" alt="장영진 COO" />
              </div>
              <div className="w-48 h-40 left-[428px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_3.png" alt="나호열 CTO" />
              </div>
              <div className="w-48 h-40 left-[622px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_4.png" alt="조용상 CPO" />
              </div>
              <div className="w-28 h-8 left-[43px] top-[502px] absolute" />
              <div className="w-28 left-[69px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>윤정호 CEO</div>
              </div>
              <div className="w-28 left-[255px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>장영진 COO</div>
              </div>
              <div className="w-28 left-[460px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>나호열 CTO</div>
              </div>
              <div className="w-28 left-[661px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="self-stretch text-center text-white/60 text-base font-normal font-['Pretendard'] leading-5">워트인텔리전스</div>
                <div className="self-stretch text-center text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>조용상 CPO</div>
              </div>
            </div>
            <div className="self-stretch h-[603px] relative bg-black/25 rounded-2xl overflow-hidden">
              <div className="w-[775px] left-[40px] top-[40px] absolute inline-flex flex-col justify-start items-start gap-6">
                <div className="inline-flex justify-start items-center gap-8">
                  <div className="w-40 px-4 py-1.5 bg-white/10 rounded-[41px] outline outline-1 outline-offset-[-1px] outline-lime-300 flex justify-center items-center gap-2.5 overflow-hidden">
                    <div className="text-center justify-start text-white text-2xl font-semibold font-['Pretendard'] leading-10">SESSION 2</div>
                  </div>
                  <div className="text-right justify-start text-white text-4xl font-bold font-['Pretendard'] leading-10">CES 2026 화제 기술들의 미래 해부하기</div>
                </div>
                <div className="self-stretch inline-flex justify-start items-center gap-8">
                  <div className="w-40 h-14 px-4 py-1.5 opacity-0 bg-white/10 rounded-[41px] border border-white/10" />
                  <div className="w-[522px] inline-flex flex-col justify-start items-start gap-2">
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 미래 산업을 이끌 핵심 기술들의 진화 방향 </div>
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 화려한 발표 뒤, 진짜 기술력을 확인하는 방법</div>
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 10분 만에 완성하는 기술 트렌드 분석</div>
                  </div>
                </div>
              </div>
              <div className="w-48 h-40 left-[202px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_5.png" alt="최덕형 리드" />
              </div>
              <div className="w-48 h-40 left-[412px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_6.png" alt="이상우 수석 컨설턴트" />
              </div>
              <div className="w-48 h-40 left-[622px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_7.png" alt="김태규 수석 컨설턴트" />
              </div>
              <div className="left-[232px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="text-center justify-start text-white/60 text-base font-normal font-['Pretendard'] leading-5">AI데이터전략팀</div>
                <div className="text-center justify-start text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>최덕형 리드</div>
              </div>
              <div className="left-[399px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="text-center justify-start text-white/60 text-base font-normal font-['Pretendard'] leading-5">AI데이터전략팀</div>
                <div className="text-center justify-start text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>이상우 수석 컨설턴트</div>
              </div>
              <div className="left-[624px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="text-center justify-start text-white/60 text-base font-normal font-['Pretendard'] leading-5">AX전략팀</div>
                <div className="text-center justify-start text-white font-bold font-['Pretendard'] leading-8 whitespace-nowrap" style={{ fontSize: '23px' }}>김태규 수석 컨설턴트</div>
              </div>
            </div>
            <div className="self-stretch h-[581px] relative bg-black/25 rounded-2xl overflow-hidden">
              <div className="w-[775px] left-[40px] top-[40px] absolute inline-flex flex-col justify-start items-start gap-6">
                <div className="inline-flex justify-start items-center gap-8">
                  <div className="w-40 px-4 py-1.5 bg-white/10 rounded-[41px] outline outline-1 outline-offset-[-1px] outline-lime-300 flex justify-center items-center gap-2.5 overflow-hidden">
                    <div className="text-center justify-start text-white text-2xl font-semibold font-['Pretendard'] leading-10">SESSION 3</div>
                  </div>
                  <div className="text-right justify-start text-white text-4xl font-bold font-['Pretendard'] leading-10">기술연구 AX 전환 사례 | 고객 사례</div>
                </div>
                <div className="self-stretch inline-flex justify-start items-center gap-8">
                  <div className="w-40 h-14 px-4 py-1.5 opacity-0 bg-white/10 rounded-[41px] border border-white/10" />
                  <div className="w-[522px] inline-flex flex-col justify-start items-start gap-2">
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 직면하고 있던 과제들</div>
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 기술연구 AX를 도입하게 된 이유</div>
                    <div className="self-stretch justify-start text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>- 도입 전 vs 도입 후 결과 비교</div>
                  </div>
                </div>
              </div>
              <div className="w-48 h-40 left-[428px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_8.png" alt="기업 R&D 담당자" />
              </div>
              <div className="w-48 h-40 left-[622px] top-[328.71px] absolute">
                <img className="absolute object-contain" style={{ width: '194px', height: '166px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_person_9.png" alt="변리사" />
              </div>
              <div className="left-[432.50px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="text-center justify-start text-white font-bold font-['Pretendard'] leading-8" style={{ fontSize: '23px' }}>기업 R&D 담당자</div>
              </div>
              <div className="left-[688px] top-[510px] absolute inline-flex flex-col justify-center items-center gap-px">
                <div className="text-center justify-start text-white font-bold font-['Pretendard'] leading-8" style={{ fontSize: '23px' }}>변리사</div>
              </div>
            </div>
            <div className="self-stretch h-64 relative bg-black/25 rounded-2xl overflow-hidden">
              <div className="w-[775px] left-[40px] top-[40px] absolute inline-flex flex-col justify-start items-start gap-6">
                <div className="inline-flex justify-start items-center gap-8">
                  <div className="w-40 px-4 py-1.5 bg-white/10 rounded-[41px] outline outline-1 outline-offset-[-1px] outline-lime-300 flex justify-center items-center gap-2.5 overflow-hidden">
                    <div className="text-center justify-start text-white text-2xl font-semibold font-['Pretendard'] leading-10">SESSION 4</div>
                  </div>
                  <div className="text-right justify-start text-white text-4xl font-bold font-['Pretendard'] leading-10">실시간 Q&A</div>
                </div>
                <div className="self-stretch inline-flex justify-start items-center gap-8">
                  <div className="w-40 h-14 px-4 py-1.5 opacity-0 bg-white/10 rounded-[41px] border border-white/10" />
                  <div className="flex-1 inline-flex flex-col justify-start items-start gap-2">
                    <div className="flex flex-col justify-start items-start gap-0 text-white/80 font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>
                      <div>&quot;우리 회사의 기술연구 AX, 어떻게 시작할까?&quot;</div>
                      <div>궁금한 내용을 연사분들께 실시간으로 질문해주세요!</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-[856px] left-[72px] top-[262px] absolute inline-flex flex-col justify-start items-center gap-12">
          <div className="self-stretch px-6 py-3 bg-gradient-to-r from-lime-300 to-cyan-400 rounded-2xl flex flex-col justify-start items-start gap-2.5 overflow-hidden">
            <div className="self-stretch inline-flex justify-between items-center">
              <div className="w-96 flex justify-start items-center gap-2">
                <div className="w-7 h-7 bg-black rounded-full" />
                <div className="w-2.5 h-6 text-center justify-start text-lime-300 text-xl font-bold font-['Pretendard']">1</div>
                <div className="justify-start text-black text-3xl font-bold font-['Pretendard']">행사 정보</div>
              </div>
              <div className="text-center justify-start text-green-200 text-2xl font-bold font-['Figtree'] leading-10">OVERVIEW</div>
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-4">
            <div className="self-stretch h-11 inline-flex justify-start items-center gap-6">
              <div className="text-center justify-start text-white text-2xl font-bold font-['Pretendard'] leading-10">일&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;시</div>
              <div className="w-0.5 h-5 bg-white/20" />
              <div className="text-center justify-start text-white text-3xl font-bold font-['Pretendard'] leading-10">2026년 3월 12일(목) 오후2시 - 4시 30분</div>
            </div>
            <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-white/20" />
            <div className="self-stretch h-11 inline-flex justify-start items-center gap-6">
              <div className="text-center justify-start text-white text-2xl font-bold font-['Pretendard'] leading-10">장&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;소</div>
              <div className="w-0.5 h-5 bg-white/20" />
              <div className="text-center justify-start text-white text-3xl font-bold font-['Pretendard'] leading-10">온라인 LIVE</div>
            </div>
            <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-white/20" />
            <div className="self-stretch h-11 inline-flex justify-start items-center gap-6">
              <div className="text-center justify-start text-white text-2xl font-bold font-['Pretendard'] leading-10">참  가  비</div>
              <div className="w-0.5 h-5 bg-white/20" />
              <div className="text-center justify-start text-white text-3xl font-bold font-['Pretendard'] leading-10">무료</div>
            </div>
          </div>
        </div>
        </div>
      </div>
      <div className="w-full h-[2856px] relative bg-slate-200 overflow-hidden">
        <div className="w-[1000px] mx-auto h-full relative">
        <div className="w-[856px] h-56 left-[72px] top-[928px] absolute bg-yellow-400 rounded-[32px] overflow-hidden">
          <div className="w-[519px] h-[519px] left-[444px] top-[22px] absolute bg-yellow-300 rounded-full" />
          <img className="absolute object-contain" style={{ width: '250px', height: '250px', left: '550px', bottom: '-20px' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_megacoffee.png" alt="메가MGC커피" />
          <div className="w-80 left-[40px] top-[68px] absolute inline-flex flex-col justify-start items-start gap-3">
            <div className="self-stretch justify-start text-black text-4xl font-bold font-['Pretendard'] whitespace-nowrap">메가MGC커피 기프티콘</div>
            <div className="self-stretch justify-start text-black text-3xl font-medium font-['Pretendard']" style={{ fontSize: '24px' }}>사전등록자 추첨 100명</div>
          </div>
        </div>
        <div className="w-[689px] left-[72px] top-[635px] absolute inline-flex flex-col justify-start items-start gap-6">
          <div className="px-6 py-3 bg-gray-700 rounded-[76px] inline-flex justify-center items-center gap-2.5 overflow-hidden">
            <div className="justify-start text-white text-3xl font-bold font-['Pretendard']">EVENT 1</div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-4">
            <div className="self-stretch justify-start text-black text-5xl font-bold font-['Pretendard']">사전 등록 이벤트 </div>
            <div className="self-stretch justify-start text-black text-3xl font-normal font-['Pretendard'] leading-[48px]">
              본 웨비나 사전 등록 후 참석해 주신 분들 중 추첨을 통해<br />
              총 100분께 커피 기프티콘을 드립니다.
            </div>
          </div>
        </div>
        <div className="left-[72px] top-[1248px] absolute inline-flex flex-col justify-start items-start gap-6">
          <div className="px-6 py-3 bg-gray-700 rounded-[76px] inline-flex justify-center items-center gap-2.5 overflow-hidden">
            <div className="justify-start text-white text-3xl font-bold font-['Pretendard']">EVENT 2</div>
          </div>
          <div className="w-[733px] flex flex-col justify-start items-start gap-4">
            <div className="self-stretch justify-start text-black text-5xl font-bold font-['Pretendard']">웨비나 적극 참여 이벤트</div>
            <div className="self-stretch justify-start text-black text-3xl font-normal font-['Pretendard'] leading-[48px]" style={{ fontSize: '24px' }}>적극적으로 참여해주시는 분들에게 소정의 상품을 드립니다.</div>
          </div>
        </div>
        <div className="left-[72px] top-[221px] absolute justify-start">
          <span className="text-gray-700 text-9xl font-bold font-['Gmarket_Sans_TTF']">WEBINAR<br /></span>
          <span className="text-teal-600 text-9xl font-bold font-['Gmarket_Sans_TTF']">EVENT</span>
        </div>
        <div className="w-72 h-9 left-[72px] top-[120px] absolute">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png" 
            alt="keywert Insight" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="h-28 px-9 py-3.5 absolute bg-white/5 rounded-[37.91px] inline-flex justify-center items-center gap-3 overflow-hidden" style={{ left: '690px', top: '147px' }}>
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_6_new.png" 
            alt="Gift" 
            className="object-contain"
            style={{ width: '147px', height: '109px' }}
          />
        </div>
        <div className="w-[856px] left-[72px] top-[2163px] absolute inline-flex flex-col justify-start items-start gap-10">
          <div className="flex flex-col justify-start items-start gap-6">
            <div className="px-6 py-3 bg-gray-700 rounded-[76px] inline-flex justify-center items-center gap-2.5 overflow-hidden">
              <div className="justify-start text-white text-3xl font-bold font-['Pretendard']">EVENT 3</div>
            </div>
            <div className="w-[733px] flex flex-col justify-start items-start gap-4">
              <div className="self-stretch justify-start text-black text-5xl font-bold font-['Pretendard']">특별 혜택 이벤트</div>
              <div className="self-stretch justify-start text-black text-3xl font-normal font-['Pretendard'] leading-[48px]" style={{ fontSize: '24px' }}>참석자 한정 특별한 혜택을 모두 드립니다!</div>
            </div>
          </div>
          <div className="self-stretch inline-flex justify-start items-center gap-4">
            <div className="w-96 p-10 bg-gray-700 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 inline-flex flex-col justify-start items-end gap-10 overflow-hidden">
              <div className="self-stretch justify-start">
                <span className="text-white text-3xl font-bold font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>키워트 인사이트 신규회원 대상 </span>
                <span className="text-teal-400 text-3xl font-bold font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>무료 체험 제공</span>
              </div>
              <img className="w-32 h-32 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_7.png" alt="Benefit" />
            </div>
            <div className="w-96 p-10 bg-gray-700 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 inline-flex flex-col justify-start items-end gap-10 overflow-hidden">
              <div className="self-stretch justify-start">
                <span className="text-white text-3xl font-bold font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>웨비나 참여 후 엔터프라이즈용 상담 신청하면 </span>
                <span className="text-teal-400 text-3xl font-bold font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>특별 견적 제공</span>
              </div>
              <img className="w-32 h-32 object-contain" src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_icon_8.png" alt="Benefit" />
            </div>
          </div>
        </div>
        <div className="w-[856px] h-64 left-[72px] top-[1493px] absolute bg-stone-600 rounded-[32px] overflow-hidden">
          <div className="left-[40px] top-[56px] absolute inline-flex flex-col justify-start items-start gap-3">
            <div className="self-stretch inline-flex justify-start items-center gap-3">
              <div className="self-stretch px-3.5 py-1 bg-black/25 rounded-lg flex justify-center items-center gap-2.5 overflow-hidden">
                <div className="justify-start text-white text-2xl font-bold font-['Pretendard']">5명 추첨</div>
              </div>
              <div className="justify-start text-white text-4xl font-bold font-['Pretendard']">QnA 질문자</div>
            </div>
            <div className="justify-start">
              <span className="text-white text-3xl font-medium font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>
                Q&A 세션에서 좋은 질문을 해주신 분들 중<br />
                추첨을 통해{' '}
              </span>
              <span className="text-white text-3xl font-bold font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>BBQ 기프티콘</span>
              <span className="text-white text-3xl font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>을 드립니다.</span>
            </div>
          </div>
          <img className="w-80 h-72 absolute object-contain" style={{ left: '550px', bottom: '-20px' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_chicken.png" alt="BBQ 치킨" />
        </div>
        <div className="w-[856px] h-72 left-[72px] top-[1760px] absolute bg-amber-800 rounded-[32px] overflow-hidden">
          <div className="left-[40px] top-[56px] absolute inline-flex flex-col justify-start items-start gap-3">
            <div className="self-stretch inline-flex justify-start items-center gap-3">
              <div className="self-stretch px-3.5 py-1 bg-black/25 rounded-lg flex justify-center items-center gap-2.5 overflow-hidden">
                <div className="justify-start text-white text-2xl font-bold font-['Pretendard']">5명 추첨</div>
              </div>
              <div className="justify-start text-white text-4xl font-bold font-['Pretendard']">설문조사 작성자</div>
            </div>
            <div className="justify-start">
              <span className="text-white text-3xl font-medium font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>
                웨비나 참여 후 설문조사를 작성해주신 분들 중<br />
                추첨을 통해{' '}
              </span>
              <span className="text-white text-3xl font-bold font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>도미노피자 기프티콘</span>
              <span className="text-white text-3xl font-medium font-['Pretendard'] leading-10" style={{ fontSize: '28px' }}>을 드립니다.</span>
            </div>
          </div>
          <div className="w-[733px] left-[40px] top-[211px] absolute justify-start text-white/60 text-2xl font-normal font-['Pretendard'] leading-9">*설문조사는 웨비나 종료 후 작성 가능합니다.</div>
          <img className="w-96 h-72 absolute object-contain" style={{ left: '520px', top: '41px' }} src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/0312_pizza.png" alt="도미노피자" />
        </div>
        </div>
      </div>
      <div className="w-full px-16 py-28 bg-neutral-50 flex flex-col justify-start items-start gap-16 overflow-hidden">
        <div className="w-[856px] mx-auto flex flex-col justify-start items-start gap-10">
          <div className="self-stretch justify-start text-black/60 text-4xl font-bold font-['Pretendard'] leading-[47.82px]">키워트 인사이트 웨비나 주의사항</div>
          <div className="self-stretch flex flex-col justify-start items-start gap-8">
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-5 self-stretch relative">
                  <div className="w-2 h-2 left-0 top-[13px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="justify-start text-black/60 text-3xl font-normal font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>본 웨비나는 사전 등록을 하신 분에 한하여 참여 가능합니다.</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-5 self-stretch relative">
                  <div className="w-2 h-2 left-0 top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-3xl font-normal font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>웨비나 참여 링크 메일 발송 - 3월 10일</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-5 self-stretch relative">
                  <div className="w-2 h-2 left-0 top-[13px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-3xl font-normal font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>웨비나 참여 링크 메일 및 문자 - 3월 11일</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-5 self-stretch relative">
                  <div className="w-2 h-2 left-0 top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-3xl font-normal font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>본 웨비나는 라이브로 진행되며 사전 등록하신 분들께는 다시보기를 제공합니다.</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-5 self-stretch relative">
                  <div className="w-2 h-2 left-0 top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-3xl font-normal font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>
                  마케팅 정보 활용 동의를 거부할 경우 웨비나 시청, 발표 콘텐츠 수신 등이<br />
                  제한됩니다.
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-10">
            <div className="self-stretch justify-start text-black/60 text-4xl font-bold font-['Pretendard'] leading-[47.82px]">문의 사항</div>
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-5 self-stretch relative">
                  <div className="w-2 h-2 left-0 top-[13px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="justify-start text-black/60 text-3xl font-normal font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>웨비나와 관련된 문의사항이 있으시면 아래 메일로 통해 문의주시기 바랍니다.</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start">
                <div className="w-5 self-stretch relative">
                  <div className="w-2 h-2 left-0 top-[17px] absolute bg-black/60 rounded-full" />
                </div>
                <div className="flex-1 justify-start text-black/60 text-3xl font-normal font-['Pretendard'] leading-10" style={{ fontSize: '24px' }}>메일문의 connect@wert.co.kr</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-24 bg-neutral-800 flex items-center justify-center">
        <div className="w-[1000px] mx-auto flex items-center justify-center">
          <img 
            src="https://gbkivxdlebdtfudexbga.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo-w.png" 
            alt="keywert Insight" 
            className="h-8 object-contain"
          />
        </div>
      </div>
    </>
  )
}
