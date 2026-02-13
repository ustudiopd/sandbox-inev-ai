'use client'

import Image from 'next/image'
import { Bebas_Neue } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

const LINE_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width={8} height={305} viewBox="0 0 8 305" fill="none" className="flex-shrink-0 block" style={{ marginTop: 24 }}>
    <path d="M3.32807 304.354C3.52334 304.549 3.83992 304.549 4.03518 304.354L7.21716 301.172C7.41242 300.976 7.41242 300.66 7.21716 300.464C7.0219 300.269 6.70532 300.269 6.51005 300.464L3.68163 303.293L0.8532 300.464C0.657938 300.269 0.341356 300.269 0.146094 300.464C-0.0491686 300.66 -0.0491686 300.976 0.146094 301.172L3.32807 304.354ZM3.68164 0L3.18164 -2.18557e-08L3.18163 304L3.68163 304L4.18163 304L4.18164 2.18557e-08L3.68164 0Z" fill="black" />
  </svg>
)

const ARROW_DOWN_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-[#111] w-6 h-[30px]" style={{ width: 24, height: 30 }}>
    <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PROGRAM_ITEMS = [
  { num: '01', circleFill: '#EC1F23', title: '역사의 주인공', body: <>모든 리더가 주연이 되어 직접 GC녹십자의 히스토리인<br />&apos;필모그래피&apos;를 따라가보세요!<br />우리 모두가 함께 만든 필모그래피의 주연은<br />바로 당신입니다.</>, tip: '*TIP : 삐!! 앗 부딪히지 않게 조심조심 움직이셔야 합니다!', image: 'page4_program2.png' },
  { num: '02', circleFill: '#006FB7', title: '모두가 주인공', body: <>모든 리더가 주연이 되어 하나의 GC녹십자를 만들어갑니다.<br />포토 키오스크 앞에서 사진을 촬영 후 출력되는 사진을 나누어<br />한 장은 포토월에, 한 장은 개인 소장하세요!</>, tip: '*Tip : 촬영된 이미지로 사원증 이미지를 바꿔보는 것은 어때요?', image: 'page4_program3.png' },
  { num: '03', circleFill: '#45B652', title: '홀인원 주인공', body: <>골프 퍼팅샷을 통해 GC녹십자가 달성한 3억불과<br />앞으로 달성할 4억불, 5억불 홀에 공을 차례로 넣는<br />퍼팅 골프 게임.</>, tip: '*TIP : 골프는 자세와 호흡이라고 배웠습니다. 실력 발휘 부탁드립니다.', image: 'page4_program4.png' },
  { num: '04', circleFill: '#F5D327', title: '오늘의 주인공', body: <>주연인 당신을 위해 준비한<br />레드카펫과 프레스월을 모티브로 한 포토존 공간으로</>, tip: '*TIP : 우리의 주연은 바로 당신! 포즈는 자신감!', image: 'page4_program5.png' },
  { num: '05', circleFill: '#EC1F23', title: '럭키 드로우', body: <>진짜 주연으로 거듭나는 순간은<br />놓칠 수 없는 경품의 당첨 순간 아닐까요?<br />다양한 경품과 함께하는 럭키드로우입니다.</>, tip: <>*TIP : 체험 프로그램에 모두 참여하시면 응모기회가 한번 더 생긴다는 사실!<br className="hidden md:inline" /> 놓치지 마세요</>, image: 'page4_program6.png' },
]

interface EventExperienceProgramPageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  /** URL 경로의 slug (헤더 링크가 현재 주소와 맞도록) */
  pathSlug?: string
}

export default function EventExperienceProgramPage({ event, pathSlug }: EventExperienceProgramPageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <>
      <div className="relative w-full">
        {/* 배너 이미지 */}
        <div className="relative w-full flex justify-center items-center overflow-hidden" style={{ width: '100%', height: '360px' }}>
          <Image
            src={getGcbioImageUrl('banner2.png')}
            alt=""
            width={1927}
            height={360}
            className="w-full h-full object-cover object-center"
            unoptimized
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingTop: '70px' }}>
            <span
              style={{
                alignSelf: 'stretch',
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'Pretendard, sans-serif',
                fontSize: '44px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.88px',
              }}
            >
              체험 이벤트
            </span>
            <div
              className="px-4 flex flex-col md:flex-row md:items-center md:justify-center md:gap-1"
              style={{
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 'clamp(12px, 3vw, 22px)',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
                marginTop: 24,
              }}
            >
              <span>체험 이벤트에 모두 참여하시면 럭키드로우 추첨권 1장을 더 드립니다!</span>
              <span>확률을 높여보세요!</span>
            </div>
          </div>
        </div>
        {/* 헤더 - 배너 위에 오버레이 */}
        <div className="absolute top-0 left-0 right-0 z-50 w-full">
          <Event222152Header slug={slug} variant="experience-program" />
        </div>
      </div>
      <div className="w-full relative flex flex-col min-h-screen bg-[#F9F9F9] overflow-x-hidden">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0 relative overflow-visible">

        {/* 체험 프로그램 5개: 원+구분선 일직선 가운데 정렬, 블록 간 17px */}
        <section className="w-full flex flex-col items-center relative overflow-visible mt-[70px] md:mt-[170px]">
          {/* deco_c.png 이미지 */}
          <div
            className="absolute pointer-events-none hidden md:block"
            style={{
              left: '20px',
              top: '-120px',
              width: '272px',
              height: '475.685px',
              opacity: 0.1,
            }}
          >
            <Image
              src={getGcbioImageUrl('deco_c.png')}
              alt=""
              width={272}
              height={475.685}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
          {/* deco_R.png 이미지 */}
          <div
            className="absolute pointer-events-none hidden md:block"
            style={{
              left: 'calc(100% - 370px)',
              top: '270px',
              width: '294.233px',
              height: '403.555px',
              opacity: 0.1,
            }}
          >
            <Image
              src={getGcbioImageUrl('deco_R.png')}
              alt=""
              width={294.233}
              height={403.555}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
          {/* deco_O.png 이미지 */}
          <div
            className="absolute pointer-events-none hidden md:block"
            style={{
              left: '-50px',
              top: '890px',
              width: '258px',
              height: '392.77px',
              opacity: 0.1,
            }}
          >
            <Image
              src={getGcbioImageUrl('deco_O.png')}
              alt=""
              width={258}
              height={392.77}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
          {/* deco_S2.png 이미지 */}
          <div
            className="absolute pointer-events-none hidden md:block"
            style={{
              left: 'calc(100% - 230px)',
              top: '1510px',
              width: '278px',
              height: '351.294px',
              opacity: 0.1,
            }}
          >
            <Image
              src={getGcbioImageUrl('deco_S2.png')}
              alt=""
              width={278}
              height={351.294}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
          <div className="w-full flex flex-col items-center mx-auto" style={{ width: 64 + 79 + 420 + 80 + 565, maxWidth: '100%' }}>
            {PROGRAM_ITEMS.map((item, index) => (
              <div
                key={item.num}
                className="flex flex-col md:flex-row items-center md:items-start w-full max-w-full"
                style={{ marginTop: index === 0 ? 0 : 17 }}
              >
                {/* 모바일: 숫자 원 → 텍스트 → 이미지 → 화살표 순. PC: 원+구분선 가운데 정렬 */}
                <div className="flex flex-col w-full md:w-auto flex-shrink-0 items-center order-1">
                  <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={64} height={64} viewBox="0 0 64 64" fill="none" className="flex-shrink-0 block">
                      <circle cx="32" cy="32" r="32" fill={item.circleFill} />
                    </svg>
                    <span
                      className={`${bebasNeue.className} absolute inset-0 flex items-center justify-center text-white`}
                      style={{
                        fontSize: 34,
                        fontStyle: 'normal',
                        fontWeight: 700,
                        lineHeight: '140%',
                        letterSpacing: '-0.68px',
                        marginTop: 1,
                      }}
                    >
                      {item.num}
                    </span>
                  </div>
                  <span className="hidden md:flex md:justify-center md:w-full">{index < PROGRAM_ITEMS.length - 1 ? LINE_SVG : null}</span>
                </div>

                {/* 텍스트 블록: 모바일 원 아래·가운데 정렬, PC 원 오른쪽·왼쪽 정렬 */}
                <div
                  className="flex-shrink-0 flex flex-col w-full min-w-0 max-w-full md:max-w-[420px] mt-4 md:mt-0 md:ml-[79px] md:-mt-8 order-2 text-center md:text-left"
                >
                  <h2
                    className="font-['Pretendard']"
                    style={{
                      color: '#111',
                      fontSize: 24,
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '140%',
                      letterSpacing: '-0.48px',
                    }}
                  >
                    {item.title}
                  </h2>
                  <p
                    className="font-['Pretendard'] mt-5 w-full max-w-full text-sm sm:text-base"
                    style={{
                      color: '#111',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                    }}
                  >
                    {item.body}
                  </p>
                  <p
                    className="font-['Pretendard'] mt-4 text-xs sm:text-sm text-[#949494] font-light leading-[140%] tracking-[-0.28px] max-w-full"
                  >
                    {item.tip}
                  </p>
                </div>

                {/* 이미지: 모바일 텍스트 아래, PC 텍스트 오른쪽 */}
                <div className={`flex-shrink-0 flex items-center justify-center w-full max-w-full md:max-w-[565px] mt-4 md:mt-0 md:ml-[80px] md:-mt-[60px] aspect-[565/270] md:w-[565px] md:h-[270px] order-3 ${item.image === 'page4_program3.png' ? 'relative z-10' : ''}`}>
                  <Image
                    src={getGcbioImageUrl(item.image)}
                    alt=""
                    width={565}
                    height={270}
                    className="w-full h-full object-contain object-center"
                    unoptimized
                  />
                </div>

                {/* 모바일 전용: 이미지 아래 화살표 (마지막 항목 제외) */}
                {index < PROGRAM_ITEMS.length - 1 && (
                  <div className="flex justify-center w-full mt-4 md:hidden order-4" aria-hidden>
                    {ARROW_DOWN_SVG}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ height: 200 }} aria-hidden />
        </section>
        </div>
      </div>
    </>
  )
}
