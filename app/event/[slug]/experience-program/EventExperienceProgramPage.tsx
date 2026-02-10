'use client'

import { Outfit } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

const outfit = Outfit({ weight: '500', subsets: ['latin'], display: 'swap' })

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
    <div
      className="w-full relative flex flex-col min-h-screen"
      style={{
        background: '#F9F9F9',
      }}
    >
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="experience-program" />

        <main
          className="w-full flex justify-center items-center box-border flex-1"
          style={{
            padding: '150px 250px 145px 250px',
          }}
        >
          <div
            className="flex flex-col justify-center items-center w-full self-stretch"
            style={{ marginTop: '-30px' }}
          >
            <h1
              className="font-['Pretendard'] self-stretch"
              style={{
                color: '#111',
                textAlign: 'center',
                fontFamily: 'Pretendard',
                fontSize: '44px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.88px',
              }}
            >
              체험 이벤트
            </h1>
            <p
              className="font-['Pretendard'] mt-6"
              style={{
                color: '#111',
                textAlign: 'center',
                fontFamily: 'Pretendard',
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
              }}
            >
              체험 이벤트에 모두 참여하시면 럭키드로우 추첨권 1장을 더 드립니다! 확률을 높여보세요!
            </p>

            {/* 이미지 + 다크 박스 섹션: 부제 아래 70px, 가운데 정렬 */}
            <div
              className="flex flex-col sm:flex-row justify-center items-center flex-shrink-0"
              style={{ marginTop: '70px', gap: 0 }}
            >
              {/* 왼쪽: 이미지 640x340, cover */}
              <div
                className="relative flex-shrink-0 overflow-hidden bg-[#d3d3d3]"
                style={{
                  width: 640,
                  height: 340,
                  backgroundImage: `url(${getGcbioImageUrl('page3_program_2.png')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: '50%',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              {/* 오른쪽: 다크 박스 - 콘텐츠 그룹 가로 가운데 정렬 */}
              <div
                className="flex flex-shrink-0 flex-col justify-center items-center"
                style={{
                  width: 640,
                  height: 340,
                  padding: '91px 80px',
                  gap: 20,
                  background: '#242424',
                }}
              >
                <div
                  className="flex flex-col items-start"
                  style={{ transform: 'translate(-50px, -5px)', maxWidth: 328 }}
                >
                  <div className="flex w-full max-w-[328px] flex-col items-start" style={{ gap: 0 }}>
                  <span
                    className={outfit.className}
                    style={{
                      color: '#949494',
                      fontSize: '42px',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.84px',
                    }}
                  >
                    01
                  </span>
                  <span
                    style={{
                      marginTop: -2,
                      color: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: '24px',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '140%',
                      letterSpacing: '-0.48px',
                    }}
                  >
                    역사의 주인공
                  </span>
                  </div>
                <p
                  className="font-['Pretendard'] m-0 w-full max-w-[328px]"
                  style={{
                    marginTop: 18,
                    color: '#FFF',
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '140%',
                    letterSpacing: '-0.32px',
                    textAlign: 'left',
                  }}
                >
                  모든 리더가 주연이 되어 직접 GC녹십자의 히스토리인
                  <br />
                  &apos;필모그래피&apos;를 따라가보세요!
                  <br />
                  우리 모두가 함께 만든 필모그래피의 주연은
                  <br />
                  바로 당신입니다.
                </p>
                <p
                  className="font-['Pretendard'] m-0 w-full max-w-[328px]"
                  style={{
                    marginTop: 8,
                    color: '#F0F0F0',
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 200,
                    lineHeight: '140%',
                    letterSpacing: '-0.28px',
                    textAlign: 'left',
                  }}
                >
                  *TIP : 삐!! 앗 부딪히지 않게 조심조심 움직이셔야 합니다!
                </p>
                </div>
              </div>
            </div>

            {/* 두 번째 블록: 70px 간격 */}
            <div
              className="flex flex-col sm:flex-row justify-center items-center flex-shrink-0"
              style={{ marginTop: '70px', gap: 0 }}
            >
              <div
                className="relative flex-shrink-0 overflow-hidden bg-[#d3d3d3]"
                style={{
                  width: 640,
                  height: 340,
                  backgroundImage: `url(${getGcbioImageUrl('page3_program_3.png')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: '50%',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <div
                className="flex flex-shrink-0 flex-col justify-center items-center"
                style={{
                  width: 640,
                  height: 340,
                  padding: '91px 80px',
                  gap: 20,
                  background: '#242424',
                }}
              >
                <div
                  className="flex flex-col items-start"
                  style={{ transform: 'translate(-30px, -5px)', maxWidth: 480 }}
                >
                  <div className="flex w-full max-w-[480px] flex-col items-start" style={{ gap: 0 }}>
                    <span
                      className={outfit.className}
                      style={{
                        color: '#949494',
                        fontSize: '42px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.84px',
                      }}
                    >
                      02
                    </span>
                    <span
                      style={{
                        marginTop: -2,
                        color: '#FFF',
                        fontFamily: 'Pretendard',
                        fontSize: '24px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '140%',
                        letterSpacing: '-0.48px',
                      }}
                    >
                      모두가 주인공
                    </span>
                  </div>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 18,
                      color: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                      textAlign: 'left',
                    }}
                  >
                    모든 리더가 주연이 되어 하나의 GC녹십자를 만들어갑니다.
                    <br />
                    포토 키오스크 앞에서 사진을 촬영 후 출력되는 사진을 나누어
                    <br />
                    한 장은 포토월에, 한 장은 개인 소장하세요!
                  </p>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 8,
                      color: '#F0F0F0',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 200,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      textAlign: 'left',
                    }}
                  >
                    *Tip : 촬영된 이미지로 사원증 이미지를 바꿔보는 것은 어때요?
                  </p>
                </div>
              </div>
            </div>

            {/* 세 번째 블록: 70px 간격 */}
            <div
              className="flex flex-col sm:flex-row justify-center items-center flex-shrink-0"
              style={{ marginTop: '70px', gap: 0 }}
            >
              <div
                className="relative flex-shrink-0 overflow-hidden bg-[#d3d3d3]"
                style={{
                  width: 640,
                  height: 340,
                  backgroundImage: `url(${getGcbioImageUrl('page3_program_4.png')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: '50%',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <div
                className="flex flex-shrink-0 flex-col justify-center items-center"
                style={{
                  width: 640,
                  height: 340,
                  padding: '91px 80px',
                  gap: 20,
                  background: '#242424',
                }}
              >
                <div
                  className="flex flex-col items-start"
                  style={{ transform: 'translate(-31px, -5px)', maxWidth: 480 }}
                >
                  <div className="flex w-full max-w-[480px] flex-col items-start" style={{ gap: 0 }}>
                    <span
                      className={outfit.className}
                      style={{
                        color: '#949494',
                        fontSize: '42px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.84px',
                      }}
                    >
                      03
                    </span>
                    <span
                      style={{
                        marginTop: -2,
                        color: '#FFF',
                        fontFamily: 'Pretendard',
                        fontSize: '24px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '140%',
                        letterSpacing: '-0.48px',
                      }}
                    >
                      홀인원 주인공
                    </span>
                  </div>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 18,
                      color: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                      textAlign: 'left',
                    }}
                  >
                    골프 퍼팅샷을 통해 GC녹십자가 달성한 3억불과
                    <br />
                    앞으로 달성할 4억불, 5억불 홀에 공을 차례로 넣는
                    <br />
                    퍼팅 골프 게임.
                  </p>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 8,
                      color: '#F0F0F0',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 200,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      textAlign: 'left',
                    }}
                  >
                    *TIP : 골프는 자세와 호흡이라고 배웠습니다. 실력 발휘 부탁드립니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 네 번째 블록: 70px 간격 */}
            <div
              className="flex flex-col sm:flex-row justify-center items-center flex-shrink-0"
              style={{ marginTop: '70px', gap: 0 }}
            >
              <div
                className="relative flex-shrink-0 overflow-hidden bg-[#d3d3d3]"
                style={{
                  width: 640,
                  height: 340,
                  backgroundImage: `url(${getGcbioImageUrl('page3_program_5.png')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: '50%',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <div
                className="flex flex-shrink-0 flex-col justify-center items-center"
                style={{
                  width: 640,
                  height: 340,
                  padding: '91px 80px',
                  gap: 20,
                  background: '#242424',
                }}
              >
                <div
                  className="flex flex-col items-start"
                  style={{ transform: 'translate(-56px, -5px)', maxWidth: 480 }}
                >
                  <div className="flex w-full max-w-[480px] flex-col items-start" style={{ gap: 0 }}>
                    <span
                      className={outfit.className}
                      style={{
                        color: '#949494',
                        fontSize: '42px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.84px',
                      }}
                    >
                      04
                    </span>
                    <span
                      style={{
                        marginTop: -2,
                        color: '#FFF',
                        fontFamily: 'Pretendard',
                        fontSize: '24px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '140%',
                        letterSpacing: '-0.48px',
                      }}
                    >
                      오늘의 주인공
                    </span>
                  </div>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 18,
                      color: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                      textAlign: 'left',
                    }}
                  >
                    주연인 당신을 위해 준비한
                    <br />
                    레드카펫과 프레스월을 모티브로 한 포토존 공간으로
                  </p>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 8,
                      color: '#F0F0F0',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 200,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      textAlign: 'left',
                    }}
                  >
                    *TIP : 우리의 주연은 바로 당신! 포즈는 자신감!
                  </p>
                </div>
              </div>
            </div>

            {/* 다섯 번째 블록: 70px 간격 */}
            <div
              className="flex flex-col sm:flex-row justify-center items-center flex-shrink-0"
              style={{ marginTop: '70px', gap: 0 }}
            >
              <div
                className="relative flex-shrink-0 overflow-hidden bg-[#d3d3d3]"
                style={{
                  width: 640,
                  height: 340,
                  backgroundImage: `url(${getGcbioImageUrl('page3_program_6.png')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: '50%',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <div
                className="flex flex-shrink-0 flex-col justify-center items-center"
                style={{
                  width: 640,
                  height: 340,
                  padding: '91px 80px',
                  gap: 20,
                  background: '#242424',
                }}
              >
                <div
                  className="flex flex-col items-start"
                  style={{ transform: 'translate(21px, -5px)', maxWidth: 480 }}
                >
                  <div className="flex w-full max-w-[480px] flex-col items-start" style={{ gap: 0 }}>
                    <span
                      className={outfit.className}
                      style={{
                        color: '#949494',
                        fontSize: '42px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.84px',
                      }}
                    >
                      05
                    </span>
                    <span
                      style={{
                        marginTop: -2,
                        color: '#FFF',
                        fontFamily: 'Pretendard',
                        fontSize: '24px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '140%',
                        letterSpacing: '-0.48px',
                      }}
                    >
                      럭키 드로우
                    </span>
                  </div>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 18,
                      color: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                      textAlign: 'left',
                    }}
                  >
                    진짜 주연으로 거듭나는 순간은
                    <br />
                    놓칠 수 없는 경품의 당첨 순간 아닐까요?
                    <br />
                    다양한 경품과 함께하는 럭키드로우입니다.
                  </p>
                  <p
                    className="font-['Pretendard'] m-0 w-full max-w-[480px]"
                    style={{
                      marginTop: 8,
                      color: '#F0F0F0',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 200,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      textAlign: 'left',
                    }}
                  >
                    *TIP : 체험 프로그램에 모두 참여하시면 응모기회가 한번 더 생긴다는 사실! 놓치지 마세요
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
