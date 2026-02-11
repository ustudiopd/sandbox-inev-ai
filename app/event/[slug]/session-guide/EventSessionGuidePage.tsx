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
    <div
      className="w-full relative flex flex-col min-h-screen"
      style={{
        background: '#F9F9F9',
      }}
    >
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="session-guide" />

        <main
          className="w-full flex justify-center items-start box-border flex-1"
          style={{
            padding: '30px 250px 65px 250px',
          }}
        >
          <div className="flex flex-col justify-center items-center w-full max-w-[1280px] mx-auto">
            <div
              className="flex items-center justify-center"
              style={{
                width: '1421px',
                height: '320px',
                borderRadius: '32px',
                background: `url(${getGcbioImageUrl('Frame 41.png')}) center/cover no-repeat`,
              }}
            >
              <span
                className="font-['Pretendard']"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontFamily: 'Pretendard',
                  fontSize: '44px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-1.1px',
                }}
              >
                세션 안내
              </span>
            </div>
            {/* 첫 번째 섹션: M1 + 허은철 카드 */}
            <div className="flex flex-col items-center">
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
                M1. 대표이사 특강
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
                2026 GCBP Leadership Workshop의 문을 열고
                <br />
                미래를 향한 발걸음을 위한 한마디
              </p>
              <div
                className="flex items-center"
                style={{ marginTop: '42px', gap: '15px' }}
              >
                <img
                  src={getGcbioImageUrl('page3_person1.png')}
                  alt="허은철 대표이사"
                  className="rounded-full object-cover flex-shrink-0"
                  style={{ width: '216px', height: '216px' }}
                />
                <div
                  className="font-['Pretendard'] flex flex-col justify-center"
                  style={{
                    width: '572.971px',
                    height: '215.794px',
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

            {/* 구분선 아래 100px — 동일 섹션 반복 */}
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
                M1. 대표이사 특강
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
                2026 GCBP Leadership Workshop의 문을 열고
                <br />
                미래를 향한 발걸음을 위한 한마디
              </p>
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
                  className="font-['Pretendard'] flex flex-col justify-center"
                  style={{
                    width: '572.971px',
                    height: '215.794px',
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
                    제목 : GCBP의 더 밝은 미래를 위한 사업 전략
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
                  { image: 'page3_person3.png', name: '유성근 PC 본부장' },
                  { image: 'page3_person4.png', name: '황정운 R&D QM Unit장' },
                  { image: 'page3_person5.png', name: '안기범 SCM 팀장' },
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
                      TItle
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선: 안기범 행 아래 132px */}
            <div style={{ marginTop: '132px', width: '1420px', height: '1px', background: '#EBEBEC' }} />

            {/* 구분선 아래 50px — 크로스 스테이지 ㅣ 무대 프로그램 */}
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
                크로스 스테이지 ㅣ 무대 프로그램
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
                당신이 주연이 될 2026 GCBP
                <br />
                Leadership Workshop의 무대 프로그램
              </p>
              <div
                className="flex items-center"
                style={{ marginTop: '42px', gap: '15px' }}
              >
                <img
                  src={getGcbioImageUrl('page3_person6.png')}
                  alt="황성현 연사"
                  className="rounded-full object-cover flex-shrink-0"
                  style={{ width: '216px', height: '216px' }}
                />
                <div
                  className="font-['Pretendard'] flex flex-col justify-center"
                  style={{
                    maxWidth: '572.971px',
                    height: '215.794px',
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
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
