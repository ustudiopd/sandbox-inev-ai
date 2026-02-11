'use client'

import { Bebas_Neue } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

interface EventOverviewPageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  /** URL 경로의 slug (헤더 링크가 현재 주소와 맞도록) */
  pathSlug?: string
}

export default function EventOverviewPage({ event, pathSlug }: EventOverviewPageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <div
      className="w-full relative flex flex-col"
      style={{
        minHeight: '3576px',
        background: '#FFFFFF',
      }}
    >
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="overview" />

        {/* 본문 레이아웃: width 1920px, padding 150px 250px 145px 250px, 가운데 정렬 */}
        <main
          className="w-full flex justify-center items-center box-border flex-1"
          style={{
            padding: '150px 250px 145px 250px',
          }}
        >
          <div
            className="relative flex flex-col justify-center items-start w-full"
            style={{ marginTop: '-550px' }}
          >
          {/* 배경 블록: 1920x1054, #F2F2F2, TIME TABLE 섹션 뒤에 보이도록 */}
          <div
            className="absolute z-0"
            style={{
              left: -250,
              top: 550,
              width: 1920,
              height: 1010,
              background: '#F2F2F2',
            }}
            aria-hidden
          />

          <div className="relative z-10">
          {/* 1. 초대의 글 + 본문 */}
          <div className="flex flex-col items-start gap-2 mb-10">
            <h1
              className="font-['Pretendard']"
              style={{
                color: '#111',
                fontSize: '17px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '150%',
                letterSpacing: '-0.48px',
              }}
            >
              초대의 글
            </h1>
            <p
              className="font-['Pretendard']"
              style={{
                width: '640px',
                color: '#111',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '150%',
                letterSpacing: '-0.32px',
              }}
            >
              조연에서 주연으로 나아가기 위한 힘은 개인에게서 나오지 않습니다. 국내와 글로벌, R&D와 생산, 영업과
              지원이 하나의 GCBP로 연결될 때 건강산업의 글로벌 리더라는 비전은 현실이 됩니다. 이번 리더십 워크샵
              에서 리더의 협업이 만들어낸 성과와 실패를 통해, 그 결과와 가능성을 함께 확인하고자 합니다.
            </p>
          </div>

          {/* 파란 원: 144x144, #006FB7 (겹침 시 앞에 표시) */}
          <div
            className="absolute z-10 flex-shrink-0"
            style={{ left: 852, top: 0 }}
            aria-hidden
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144" fill="none">
              <circle cx="72" cy="72" r="72" fill="#006FB7" />
            </svg>
          </div>

          {/* 회색 Photo 원: 294x294, #5E5E5E, 파란 원과 살짝 겹침 */}
          <div
            className="absolute z-0 flex flex-shrink-0 items-center justify-center rounded-full"
            style={{
              left: 916,
              top: 60,
              width: 294,
              height: 294,
              background: '#5E5E5E',
            }}
            aria-hidden
          >
            <span
              className="font-['Pretendard'] text-white"
              style={{
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '150%',
                letterSpacing: '-0.48px',
              }}
            >
              Photo
            </span>
          </div>

          {/* 빨간 원: 144x144, #EC1F23, 회색 원 오른쪽 40px */}
          <div
            className="absolute z-10 flex-shrink-0"
            style={{ left: 1210 + 40, top: 40 }}
            aria-hidden
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144" fill="none">
              <circle cx="72" cy="72" r="72" fill="#EC1F23" />
            </svg>
          </div>

          {/* stroke 원: 62x62, 노란 원 뒤(아래·왼쪽) 살짝 겹침 */}
          <div
            className="absolute z-0 flex-shrink-0"
            style={{ left: 1015, top: 435 }}
            aria-hidden
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62" fill="none">
              <circle cx="31" cy="31" r="30.5" stroke="#111111" strokeWidth={1} />
            </svg>
          </div>

          {/* 노란 원: 108x108, #F5D327, 회색 Photo 아래 25px · page1_photo1 왼쪽 42px */}
          <div
            className="absolute z-10 flex-shrink-0"
            style={{ left: 1207 - 42 - 108, top: 60 + 294 + 25 }}
            aria-hidden
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108" fill="none">
              <circle cx="54" cy="54" r="54" fill="#F5D327" />
            </svg>
          </div>

          {/* page1_photo1: 빨간 원 아래 64px, 210x210 원형 */}
          <div
            className="absolute flex-shrink-0 rounded-full"
            style={{
              left: 1207,
              top: 40 + 144 + 64,
              width: 210,
              height: 210,
              background: `url(${getGcbioImageUrl('page1_photo1.png')}) lightgray -32.243px 0px / 125% 100% no-repeat`,
            }}
            aria-hidden
          />

          {/* 2. 워크샵 타이틀 */}
          <h2
            className={bebasNeue.className}
            style={{
              height: '75px',
              alignSelf: 'stretch',
              color: '#111',
              fontSize: '70px',
              fontStyle: 'normal',
              fontWeight: 700,
              lineHeight: '130%',
              letterSpacing: '-0.7px',
              marginBottom: '48px',
            }}
          >
            2026 GCBP LEADERSHIP WORKSHOP
          </h2>

          {/* 3. 행사 정보 */}
          <div
            className="font-['Pretendard'] flex flex-col gap-0"
            style={{
              color: '#111',
              fontSize: '24px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '140%',
              letterSpacing: '-0.48px',
            }}
          >
            <span>DATE | 2026.03.05. (목)</span>
            <span>LOCATION | 노보텔 앰배서더 서울 용산 한라홀(3F)</span>
            <span>주제 | Cross Functional Collaboration</span>
            <span>대상 | GC 녹십자 리더</span>
            <span>
              문의 | 운영사무국 (
              <a href="tel:010-7161-1418" className="hover:opacity-80">
                tel.010-7161-1418
              </a>
              )
            </span>
          </div>

          {/* 4. TIME TABLE 섹션 제목 - 문의 210px 아래 */}
          <div
            className={bebasNeue.className}
            style={{
              marginTop: '210px',
              color: '#111',
              fontSize: '50px',
              fontStyle: 'normal',
              fontWeight: 700,
              lineHeight: '120%',
              letterSpacing: '-1px',
            }}
          >
            <span className="block">2026 GCBP</span>
            <span className="block">LEADERSHIP WORKSHOP</span>
            <span className="block">TIME TABLE</span>
          </div>

          {/* 타임테이블 SVG - 확대 시 선명, TIME TABLE과 10px 간격 */}
          <div className="relative w-full max-w-[1420px] mt-2.5 bg-[#d3d3d3] overflow-hidden" style={{ aspectRatio: '142/63' }}>
            <img
              src={getGcbioImageUrl('Timetable.svg')}
              alt="2026 GCBP Leadership Workshop 타임테이블"
              className="w-full h-full object-contain"
            />
            {/* 오버레이: 같은 크기, 가운데 "스케쥴 변경 예정" */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-[rgba(10,10,10,0.7)]"
              aria-hidden
            >
              <span
                className="font-['Pretendard'] text-center text-white"
                style={{
                  fontSize: '45px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-1px',
                }}
              >
                스케쥴 변경 예정
              </span>
            </div>
          </div>

          {/* 네이버 지도 영역 - 타임테이블 아래 250px */}
          <div
            className="w-full max-w-[1420px] mt-[250px] flex items-center justify-center"
            style={{
              height: '700px',
              background: '#444',
            }}
          >
            <span
              className="font-['Pretendard']"
              style={{
                color: '#FFF',
                textAlign: 'center',
                fontSize: '40px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-1px',
              }}
            >
              네이버 지도
            </span>
          </div>

          {/* 버튼 두 개 - 네이버 지도 박스 아래 50px, 합쳐서 1420px 이하 */}
          <div className="w-full max-w-[1420px] mt-[50px] flex flex-nowrap">
            <div
              className="flex justify-center items-center flex-1 min-w-0 max-w-[710px]"
              style={{
                padding: '19px 0',
                border: '2px solid #242424',
                background: '#111',
              }}
            >
              <span
                className="font-['Pretendard']"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                대중교통으로 오시는 길
              </span>
            </div>
            <div
              className="flex justify-center items-center flex-1 min-w-0 max-w-[710px]"
              style={{
                padding: '19px 0',
                border: '2px solid #242424',
              }}
            >
              <span
                className="font-['Pretendard']"
                style={{
                  color: '#FFF',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                공항에서 오시는 길
              </span>
            </div>
          </div>

          {/* 지하철 이용 안내 - 버튼 행 아래 60px, 지하철 이용(24px) | 44px | 용산역·설명, 신용산역·설명 */}
          <div className="w-full max-w-[1420px] mt-[60px] flex flex-nowrap items-start gap-[44px]">
            <span
              className="font-['Pretendard'] shrink-0"
              style={{
                color: '#111',
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
              }}
            >
              지하철 이용
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex flex-nowrap items-baseline gap-2.5">
                <span
                  className="font-['Pretendard'] shrink-0"
                  style={{
                    color: '#111',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '140%',
                    letterSpacing: '-0.32px',
                  }}
                >
                  용산역
                </span>
                <span
                  className="font-['Pretendard'] min-w-0"
                  style={{
                    color: '#111',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                    letterSpacing: '-0.32px',
                  }}
                >
                  1호선 용산역 3번 출구에서 도보 3분 거리에 위치하여 있습니다.
                </span>
              </div>
              <div className="flex flex-nowrap items-baseline gap-2.5 mt-3.5">
                <span
                  className="font-['Pretendard'] shrink-0"
                  style={{
                    color: '#111',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '140%',
                    letterSpacing: '-0.32px',
                  }}
                >
                  신용산역
                </span>
                <span
                  className="font-['Pretendard'] min-w-0"
                  style={{
                    color: '#111',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                    letterSpacing: '-0.32px',
                  }}
                >
                  4호선 신용산역 5번 출구에서 도보 10분 거리에 위치하여 있습니다.
                </span>
              </div>
            </div>
          </div>

          {/* 구분선 - 신용산역 아래 60px */}
          <div
            className="w-full max-w-[1420px] mt-[60px]"
            style={{
              height: '1px',
              background: '#242424',
            }}
          />

          {/* 버스 이용 안내 - 선 아래 60px, 버스 이용 | 65px | 노선 목록 */}
          <div className="w-full max-w-[1420px] mt-[60px] flex flex-nowrap items-start gap-[65px]">
            <span
              className="font-['Pretendard'] shrink-0"
              style={{
                color: '#111',
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
              }}
            >
              버스 이용
            </span>
            <div className="flex flex-col min-w-0 gap-0">
              <span
                className="font-['Pretendard']"
                style={{
                  color: '#111',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                가산/여의도 방면 5012번
              </span>
              <span
                className="font-['Pretendard']"
                style={{
                  color: '#111',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                신사/압구정 방면 400번
              </span>
              <span
                className="font-['Pretendard']"
                style={{
                  color: '#111',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                서울역 방면 505번
              </span>
            </div>
          </div>

          {/* 구분선 - 버스 이용(서울역 방면 505번) 아래 60px */}
          <div
            className="w-full max-w-[1420px] mt-[60px]"
            style={{
              height: '1px',
              background: '#242424',
            }}
          />
          </div>
        </div>
        </main>
      </div>
    </div>
  )
}
