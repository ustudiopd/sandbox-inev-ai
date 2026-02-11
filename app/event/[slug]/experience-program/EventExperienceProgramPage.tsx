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

const PROGRAM_ITEMS = [
  { num: '01', circleFill: '#EC1F23', title: '역사의 주인공', body: <>모든 리더가 주연이 되어 직접 GC녹십자의 히스토리인<br />&apos;필모그래피&apos;를 따라가보세요!<br />우리 모두가 함께 만든 필모그래피의 주연은<br />바로 당신입니다.</>, tip: '*TIP : 삐!! 앗 부딪히지 않게 조심조심 움직이셔야 합니다!', image: 'page4_program2.png' },
  { num: '02', circleFill: '#45B652', title: '모두가 주인공', body: <>모든 리더가 주연이 되어 하나의 GC녹십자를 만들어갑니다.<br />포토 키오스크 앞에서 사진을 촬영 후 출력되는 사진을 나누어<br />한 장은 포토월에, 한 장은 개인 소장하세요!</>, tip: '*Tip : 촬영된 이미지로 사원증 이미지를 바꿔보는 것은 어때요?', image: 'page4_program3.png' },
  { num: '03', circleFill: '#F5D327', title: '홀인원 주인공', body: <>골프 퍼팅샷을 통해 GC녹십자가 달성한 3억불과<br />앞으로 달성할 4억불, 5억불 홀에 공을 차례로 넣는<br />퍼팅 골프 게임.</>, tip: '*TIP : 골프는 자세와 호흡이라고 배웠습니다. 실력 발휘 부탁드립니다.', image: 'page4_program4.png' },
  { num: '04', circleFill: '#006FB7', title: '오늘의 주인공', body: <>주연인 당신을 위해 준비한<br />레드카펫과 프레스월을 모티브로 한 포토존 공간으로</>, tip: '*TIP : 우리의 주연은 바로 당신! 포즈는 자신감!', image: 'page4_program5.png' },
  { num: '05', circleFill: '#EC1F23', title: '럭키 드로우', body: <>진짜 주연으로 거듭나는 순간은<br />놓칠 수 없는 경품의 당첨 순간 아닐까요?<br />다양한 경품과 함께하는 럭키드로우입니다.</>, tip: '*TIP : 체험 프로그램에 모두 참여하시면 응모기회가 한번 더 생긴다는 사실! 놓치지 마세요', image: 'page4_program6.png' },
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
    <div className="w-full relative flex flex-col min-h-screen bg-[#F9F9F9] overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="experience-program" />
        <div className="w-full flex justify-center" style={{ marginTop: 30 }}>
          <div className="relative w-full flex justify-center">
            <Image
              src={getGcbioImageUrl('page4_top.png')}
              alt=""
              width={1421}
              height={320}
              className="max-w-full h-auto object-cover object-center"
              unoptimized
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{ width: 1421, maxWidth: '100%', left: '50%', transform: 'translateX(-50%)' }}
            >
              <h1
                className="font-['Pretendard'] self-stretch"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontSize: 44,
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.88px',
                }}
              >
                체험 이벤트
              </h1>
              <p
                className="font-['Pretendard'] self-stretch mt-6"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontSize: 24,
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '140%',
                  letterSpacing: '-0.48px',
                }}
              >
                체험 이벤트에 모두 참여하시면 럭키드로우 추첨권 1장을 더 드립니다! 확률을 높여보세요!
              </p>
            </div>
          </div>
        </div>

        {/* 체험 프로그램 5개: 원+구분선 일직선 가운데 정렬, 블록 간 17px */}
        <section className="w-full flex flex-col items-center" style={{ marginTop: 170 }}>
          <div className="w-full flex flex-col items-center" style={{ width: 64 + 79 + 420 + 80 + 565 }}>
            {PROGRAM_ITEMS.map((item, index) => (
              <div
                key={item.num}
                className="flex flex-row items-start w-full"
                style={{ marginTop: index === 0 ? 0 : 17 }}
              >
                {/* 원 + 원 아래 24px에 세로 구분선 */}
                <div className="flex-shrink-0 flex flex-col items-center">
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
                  {index < PROGRAM_ITEMS.length - 1 ? LINE_SVG : null}
                </div>

                {/* 텍스트 블록: 원으로부터 79px 오른쪽, 32px 위 (박스만 넓혀 글자 잘림 방지) */}
                <div
                  className="flex-shrink-0 flex flex-col"
                  style={{ marginLeft: 79, marginTop: -32, minWidth: 347, maxWidth: 420 }}
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
                    className="font-['Pretendard'] mt-5"
                    style={{
                      color: '#111',
                      fontSize: 16,
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                      maxWidth: 420,
                    }}
                  >
                    {item.body}
                  </p>
                  <p
                    className="font-['Pretendard']"
                    style={{
                      marginTop: 17,
                      color: '#949494',
                      fontSize: 14,
                      fontStyle: 'normal',
                      fontWeight: 300,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      maxWidth: 400,
                    }}
                  >
                    {item.tip}
                  </p>
                </div>

                {/* 이미지: 텍스트로부터 80px 오른쪽, 565×270 */}
                <div className="flex-shrink-0 overflow-hidden" style={{ marginLeft: 80, marginTop: -60, width: 565, height: 270 }}>
                  <Image
                    src={getGcbioImageUrl(item.image)}
                    alt=""
                    width={565}
                    height={270}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 200 }} aria-hidden />
        </section>
      </div>
    </div>
  )
}
