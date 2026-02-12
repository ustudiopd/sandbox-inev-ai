'use client'

import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

interface EventSessionGuidePageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  /** URL 경로의 slug (헤더 링크가 현재 주소와 맞도록) */
  pathSlug?: string
}

export default function EventSessionGuidePage({ event, pathSlug }: EventSessionGuidePageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <div className="w-full relative flex flex-col min-h-screen bg-[#F9F9F9] overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="session-guide" />

        <main className="w-full flex justify-center items-start box-border flex-1 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[250px] pt-6 sm:pt-8 pb-12 sm:pb-16">
          <div className="flex flex-col justify-center items-center w-full max-w-[1280px] mx-auto min-w-0">
            <div
              className="w-full max-w-[1421px] aspect-[1421/320] min-h-[200px] sm:min-h-[280px] flex items-center justify-center rounded-2xl sm:rounded-[32px] bg-cover bg-center"
              style={{ backgroundImage: `url(${getGcbioImageUrl('Frame 41.png')})` }}
            >
              <span className="font-['Pretendard'] text-white text-center text-2xl sm:text-3xl md:text-[44px] font-semibold leading-[140%] tracking-[-1.1px] px-4">
                세션 안내
              </span>
            </div>
            {/* 첫 번째 섹션: M1 + 허은철 카드 */}
            <div className="flex flex-col items-center w-full max-w-[860px]">
              <h2
                className="font-['Pretendard'] w-full text-[#111] text-center text-2xl sm:text-3xl md:text-[44px] font-semibold leading-[140%] tracking-[-0.88px] mt-12 sm:mt-16 md:mt-20"
              >
                M1. 대표이사 특강
              </h2>
              <p className="font-['Pretendard'] text-[#111] text-center text-lg sm:text-xl md:text-2xl font-medium leading-[140%] tracking-[-0.48px] mt-6">
                2026 GCBP Leadership Workshop의 문을 열고
                <br />
                미래를 향한 발걸음을 위한 한마디
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-4 mt-8 sm:mt-10 w-full max-w-[860px]">
                <img
                  src={getGcbioImageUrl('page3_person10.png')}
                  alt="허은철 대표이사"
                  className="rounded-full object-cover flex-shrink-0 w-40 h-40 sm:w-52 sm:h-52 md:w-[216px] md:h-[216px]"
                />
                <div
                  className="font-['Pretendard'] flex flex-col justify-center flex-shrink-0"
                  style={{
                    width: '620px',
                    minWidth: '620px',
                    height: '240px',
                    borderRadius: '744.118px',
                    background: '#F0F0F0',
                    paddingLeft: '88px',
                    paddingRight: '24px',
                    paddingTop: '11px',
                  }}
                >
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '24px',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      lineHeight: '140%',
                      letterSpacing: '-0.48px',
                    }}
                  >
                    허은철 / 대표이사
                  </div>
                  <div style={{ height: '5px' }} />
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                    }}
                  >
                    특강: 2026 GCBP 리더들의 마음가짐 (더미 텍스트)
                  </div>
                  <div style={{ height: '21px' }} />
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                    }}
                  >
                    2026년 새로운 GCBP 리더들이 가져야 할 마음가짐과
                    <br />
                    협업을 통한 새로운 도전
                  </div>
                </div>
              </div>
            </div>

            {/* 구분선: 첫 번째 섹션(허은철) 아래 142px — 두 번째 섹션(배백식) 위 */}
            <div
              style={{
                marginTop: '142px',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '1420px',
                  maxWidth: '100%',
                  height: '1px',
                  minHeight: '1px',
                  background: '#EBEBEC',
                  flexShrink: 0,
                }}
              />
            </div>

            {/* 구분선 아래 100px — 배백식 섹션 (M2) */}
            <div style={{ marginTop: '50px' }} className="flex flex-col items-center">
              <h2
                className="font-['Pretendard']"
                style={{
                  width: '644px',
                  color: '#111',
                  textAlign: 'center',
                  fontFamily: 'Pretendard',
                  fontSize: '44px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.88px',
                  marginTop: '80px',
                }}
              >
                M2. 2026 GCBP 사업전략 발표
              </h2>
              <div
                className="flex items-center"
                style={{ marginTop: '42px', gap: '15px' }}
              >
                <img
                  src={getGcbioImageUrl('page3_person2.png')}
                  alt="대표이사 특강"
                  className="rounded-full object-cover flex-shrink-0"
                  style={{ width: '216px', height: '216px' }}
                />
                <div
                  className="font-['Pretendard'] flex flex-col justify-center flex-shrink-0"
                  style={{
                    width: '620px',
                    minWidth: '620px',
                    height: '240px',
                    borderRadius: '744.118px',
                    background: '#F0F0F0',
                    paddingLeft: '88px',
                    paddingRight: '24px',
                    paddingTop: '11px',
                  }}
                >
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '24px',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      lineHeight: '140%',
                      letterSpacing: '-0.48px',
                    }}
                  >
                    배백식 / 전략 사업 개발 실장
                  </div>
                  <div style={{ height: '5px' }} />
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                    }}
                  >
                    Title : GCBP 중장기 전략 방향
                  </div>
                  <div style={{ height: '21px' }} />
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                    }}
                  >
                    2026년 , 더 나아가 앞으로의 미래를 위해 GCBP의
                    <br />
                    미래를 위한 사업 전략
                  </div>
                  <div style={{ height: '10px' }} />
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                    }}
                  >
                    1.000000  |  2.000000  |  3.000000
                  </div>
                </div>
              </div>
            </div>

            {/* 구분선: 배백식 섹션 아래 142px — M3 섹션 위, 가운데 정렬 */}
            <div
              style={{
                marginTop: '142px',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '1420px',
                  maxWidth: '100%',
                  height: '1px',
                  minHeight: '1px',
                  background: '#EBEBEC',
                  flexShrink: 0,
                }}
              />
            </div>

            {/* M3. GCBP 우수사례발표 — 구분선 아래 50px */}
            <div className="flex flex-col items-center" style={{ marginTop: '50px' }}>
              <h2
                className="font-['Pretendard']"
                style={{
                  width: '644px',
                  color: '#111',
                  textAlign: 'center',
                  fontFamily: 'Pretendard',
                  fontSize: '44px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.88px',
                  marginTop: '80px',
                }}
              >
                M3. GCBP 우수사례발표
              </h2>
              <p
                className="font-['Pretendard']"
                style={{
                  color: '#111',
                  textAlign: 'center',
                  fontFamily: 'Pretendard',
                  fontSize: '24px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '140%',
                  letterSpacing: '-0.48px',
                  marginTop: '24px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                우수사례 공유를 통한 협업 레벨업
              </p>
              <div
                style={{
                  marginTop: '55px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '40px',
                  alignSelf: 'stretch',
                }}
              >
                {[
                  { image: 'page3_person7.png', name: '유성근 PC 본부장', title: 'TItle' },
                  { image: 'page3_person8.png', name: '황정운 R&D QM Unit장', title: 'TItle' },
                  { image: 'page3_person9.png', name: '안기범 SCM 팀장', title: 'Title : 부문, 최적화를 넘어, 전체 최적화로' },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={getGcbioImageUrl(row.image)}
                      alt={row.name}
                      style={{
                        width: '160px',
                        height: '90px',
                        objectFit: 'cover',
                        marginRight: '11px',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      className="font-['Pretendard']"
                      style={{
                        display: 'inline-flex',
                        width: '240px',
                        height: '90px',
                        padding: '0 26px 0 24px',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '200px',
                        background: '#EBEBEC',
                        color: '#000',
                        textAlign: 'center',
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '140%',
                        letterSpacing: '-0.32px',
                      }}
                    >
                      {row.name}
                    </div>
                    <div
                      className="font-['Pretendard']"
                      style={{
                        marginLeft: '10px',
                        display: 'flex',
                        width: '423px',
                        height: '90px',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '200px',
                        border: '1px solid #CACACA',
                        color: '#000',
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.32px',
                      }}
                    >
                      {row.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선: 안기범 행 아래 132px */}
            <div style={{ marginTop: '132px', width: '1420px', height: '1px', background: '#EBEBEC' }} />

            {/* 구분선 아래 50px — M4 협업 인사이트(특강) */}
            <div className="flex flex-col items-center" style={{ marginTop: '50px' }}>
              <h2
                className="font-['Pretendard']"
                style={{
                  width: '796px',
                  color: '#111',
                  textAlign: 'center',
                  fontFamily: 'Pretendard',
                  fontSize: '44px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.88px',
                  marginTop: '80px',
                }}
              >
                M4. 협업 인사이트(특강)
                <br />
                Cross Functional Collaboration 명사 특강
              </h2>
              <div
                className="flex items-center"
                style={{ marginTop: '42px', gap: '15px' }}
              >
                <img
                  src={getGcbioImageUrl('page3_person11.png')}
                  alt="황성현 연사"
                  className="rounded-full object-cover flex-shrink-0"
                  style={{ width: '216px', height: '216px' }}
                />
                <div
                  className="font-['Pretendard'] flex flex-col justify-center flex-shrink-0"
                  style={{
                    width: '620px',
                    minWidth: '620px',
                    height: '240px',
                    borderRadius: '744.118px',
                    background: '#F0F0F0',
                    paddingLeft: '88px',
                    paddingRight: '24px',
                    paddingTop: '11px',
                  }}
                >
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '24px',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      lineHeight: '140%',
                      letterSpacing: '-0.48px',
                    }}
                  >
                    황성현 / 연사
                  </div>
                  <div style={{ height: '5px' }} />
                  <div
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                    }}
                  >
                    강연 주제:{' '}
                    <span
                      style={{
                        color: '#111',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '140%',
                        letterSpacing: '-0.32px',
                      }}
                    >
                      조직의 사일로 현상을 극복하고 공동의 목표를 달성
                      <br />
                      할 수 있도록 리더들에게 마인드 셋
                    </span>
                  </div>
                  <div style={{ height: '21px' }} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '32px',
                    }}
                  >
                    <div
                      className="font-['Pretendard']"
                      style={{
                        color: '#111',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.28px',
                      }}
                    >
                      현) 퀸텀사이트 대표
                      <br />
                      현) 한글과 컴퓨터 사외이사
                    </div>
                    <div
                      className="font-['Pretendard']"
                      style={{
                        color: '#111',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.28px',
                      }}
                    >
                      전) 카카오 인사총괄 부사장
                      <br />
                      전) 구글코리아 인사총괄
                    </div>
                  </div>
                </div>
              </div>
              {/* 황성현 카드 아래 120px — 구분선 */}
              <div style={{ marginTop: '120px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '1420px', maxWidth: '100%', height: '1px', background: '#EBEBEC' }} />
              </div>
              {/* 구분선 아래 102px — M4 미니 워크숍 */}
              <div style={{ marginTop: '102px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h2
                  className="font-['Pretendard']"
                  style={{
                    width: '644px',
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
                  M4. 협업 인사이트(미니 워크숍)
                </h2>
                <p
                  className="font-['Pretendard']"
                  style={{
                    marginTop: '24px',
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
                  협업 실폐사례 Case Study 및 토의(Cross Mindset 도출)
                </p>
              </div>
              {/* 부제 아래 60px — 플레이스홀더 + 비디오 카드 */}
              <div
                style={{
                  marginTop: '60px',
                  marginBottom: '220px',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '864px',
                    height: '509px',
                    borderRadius: '8px',
                    background: '#D9D9D9',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <span
                    className="font-['Bebas_Neue']"
                    style={{
                      color: '#000',
                      textAlign: 'center',
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: '32px',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      lineHeight: '100%',
                      letterSpacing: '-0.64px',
                    }}
                  >
                    일정 전달 예정
                  </span>
                </div>
                {/* 비디오 카드 3개 — 세로 배치, 16px 간격 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                {/* 540×159 비디오 카드 1 */}
                <div
                  style={{
                    width: '540px',
                    height: '159px',
                    borderRadius: '8px',
                    backgroundImage: `url(${getGcbioImageUrl('page3_session1.png')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '24px',
                      top: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span
                      className="font-['Bebas_Neue']"
                      style={{
                        color: '#FFF',
                        fontFamily: '"Bebas Neue", sans-serif',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 700,
                        lineHeight: '100%',
                      }}
                    >
                      Video 01
                    </span>
                    <span
                      className="font-['Pretendard']"
                      style={{
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '100%',
                        letterSpacing: '-0.32px',
                      }}
                    >
                      천 명이 한 자리에서 일하는 회사!
                    </span>
                    <p
                      className="font-['Pretendard']"
                      style={{
                        width: '492px',
                        margin: 0,
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '13px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.26px',
                      }}
                    >
                      같은 팀 아니면 이야기 한 마디 나누기도 힘들죠? 그런데 여기 전 직원이 한 팀처럼 소통하며 일하는 회사가 있습니다. 비결이 뭘까요?
                    </p>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: '433px',
                      top: '24px',
                      display: 'inline-flex',
                      padding: '5px 14px',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '100px',
                      border: '1px solid #FFF',
                    }}
                  >
                    <span
                      className="font-['Pretendard']"
                      style={{
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '100%',
                      }}
                    >
                      Play
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="9"
                      viewBox="0 0 13 9"
                      fill="none"
                      style={{ display: 'block' }}
                    >
                      <path
                        d="M0.5 4.5H12M12 4.5L7 0.5M12 4.5L7 8.5"
                        stroke="white"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {/* 540×159 비디오 카드 2 */}
                <div
                  style={{
                    width: '540px',
                    height: '159px',
                    borderRadius: '8px',
                    backgroundImage: `url(${getGcbioImageUrl('page3_session2.png')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '24px',
                      top: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span
                      className="font-['Bebas_Neue']"
                      style={{
                        color: '#FFF',
                        fontFamily: '"Bebas Neue", sans-serif',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 700,
                        lineHeight: '100%',
                      }}
                    >
                      Video 02
                    </span>
                    <span
                      className="font-['Pretendard']"
                      style={{
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '100%',
                        letterSpacing: '-0.32px',
                      }}
                    >
                      지나친 내부 경쟁이 기업을 맟니다! 지금 당장 '협업 지수'를 높여라!
                    </span>
                    <p
                      className="font-['Pretendard']"
                      style={{
                        width: '492px',
                        margin: 0,
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '13px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.26px',
                      }}
                    >
                      경쟁이 있어야 발전이 있다! 하지만 경쟁도 지나치면 독이 되는 법이죠? 경쟁의 긍정적인 에너지를 그대로 가져 가면서도 부정적인 요소는 막는 방법, 어디 없을까요?
                    </p>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: '433px',
                      top: '24px',
                      display: 'inline-flex',
                      padding: '5px 14px',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '100px',
                      border: '1px solid #FFF',
                    }}
                  >
                    <span
                      className="font-['Pretendard']"
                      style={{
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '100%',
                      }}
                    >
                      Play
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="9"
                      viewBox="0 0 13 9"
                      fill="none"
                      style={{ display: 'block' }}
                    >
                      <path
                        d="M0.5 4.5H12M12 4.5L7 0.5M12 4.5L7 8.5"
                        stroke="white"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {/* 540×159 비디오 카드 3 */}
                <div
                  style={{
                    width: '540px',
                    height: '159px',
                    borderRadius: '8px',
                    backgroundImage: `url(${getGcbioImageUrl('page3_session3.png')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '24px',
                      top: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span
                      className="font-['Bebas_Neue']"
                      style={{
                        color: '#FFF',
                        fontFamily: '"Bebas Neue", sans-serif',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 700,
                        lineHeight: '100%',
                      }}
                    >
                      Video 03
                    </span>
                    <span
                      className="font-['Pretendard']"
                      style={{
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '100%',
                        letterSpacing: '-0.32px',
                      }}
                    >
                      업무 협조를 잘 받아내는 것도 능력이다! 요청의 기술 3가지
                    </span>
                    <p
                      className="font-['Pretendard']"
                      style={{
                        width: '492px',
                        margin: 0,
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '13px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.26px',
                      }}
                    >
                      업무를 하다 보면 동료나 상사게에, 또 타 부서에 협조를 요청해야 하는 일이 비일비재하죠. 그런제 누구는 매번 척척 협조를 잘 구해내는 반면 누구는 그렇지 못한데요. 왜 그럴까요? 요청의 기술 세 가지를 기억하세요.
                    </p>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: '433px',
                      top: '24px',
                      display: 'inline-flex',
                      padding: '5px 14px',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '100px',
                      border: '1px solid #FFF',
                    }}
                  >
                    <span
                      className="font-['Pretendard']"
                      style={{
                        color: '#FFF',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '100%',
                      }}
                    >
                      Play
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="9"
                      viewBox="0 0 13 9"
                      fill="none"
                      style={{ display: 'block' }}
                    >
                      <path
                        d="M0.5 4.5H12M12 4.5L7 0.5M12 4.5L7 8.5"
                        stroke="white"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
