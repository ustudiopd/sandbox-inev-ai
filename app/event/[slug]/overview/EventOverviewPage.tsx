'use client'

import { useState } from 'react'
import { Bebas_Neue } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

type TransportTab = 'publicTransport' | 'airport'

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
  const [transportTab, setTransportTab] = useState<TransportTab>('publicTransport')

  return (
    <div className="w-full relative flex flex-col min-h-screen bg-white">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="overview" />

        {/* 본문 레이아웃: width 1920px, padding 50px 250px 145px 250px (상단 100px 축소), 가운데 정렬 */}
        <main className="w-full flex justify-center items-center box-border flex-1 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[250px] pt-0 sm:pt-0 md:pt-[50px] pb-12 md:pb-[145px] overflow-x-hidden">
          <div className="relative flex flex-col justify-center items-start w-full max-w-[1420px] mx-auto min-w-0">
          {/* 배경 블록: #F2F2F2 — 반응형 full width */}
          <div className="absolute z-0 top-[550px] bottom-0 h-[1240px] min-h-0 bg-[#F2F2F2] w-screen left-1/2 -translate-x-1/2" aria-hidden />

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
              className="font-['Pretendard'] w-full max-w-[640px] text-[#111] text-base font-medium"
              style={{
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
              lineHeight: '120%',
            }}
          >
            <span className="block" style={{ fontWeight: 700 }}>
              2026 GCBP
            </span>
            <span className="block" style={{ fontWeight: 300, color: '#444' }}>
              LEADERSHIP WORKSHOP
            </span>
            <span className="block" style={{ fontWeight: 300, color: '#444' }}>
              TIME TABLE
            </span>
          </div>

          {/* 타임테이블 - TIME TABLE 제목 아래 41px */}
          <div className="flex flex-col w-full max-w-[1420px] mt-[41px]">
            {/* 헤더 행 */}
            <div className="flex">
              {[
                { width: 254, label: '테마' },
                { width: 244, label: '세션' },
                { width: 430, label: '세부내용' },
                { width: 215, label: '연사' },
                { width: 104, label: '진행기간' },
                { width: 173, label: '시간', noRightBorder: true },
              ].map((col) => (
                <div
                  key={col.label}
                  className="flex justify-center items-center shrink-0 font-['Pretendard'] text-center whitespace-nowrap"
                  style={{
                    boxSizing: 'border-box',
                    width: col.width,
                    height: 48,
                    padding: '6px 16px',
                    gap: 10,
                    borderTop: '2px solid #949494',
                    borderRight: col.noRightBorder ? undefined : '1px solid #949494',
                    borderBottom: '1px solid #949494',
                    background: '#E4E4E4',
                    color: '#111',
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: '140%',
                    letterSpacing: '-0.32px',
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>
            {/* 데이터 행 16개: 테마 3·4, 5·세션5, 6·7·8, 9·세션9, 11·세션11, 테마13·14, 세션13·14, 15·세션15 병합 */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: '254px 244px 430px 215px 104px 173px',
                gridTemplateRows: 'repeat(16, 48px)',
              }}
            >
              {(() => {
                const skipCol0Rows = [3, 6, 7, 13] // 테마 열만 비움 (Cross the Border 2행, Cross Functions 3행, Cross the Network 2행)
                const skipCol0And1Rows = [13] // Cross the Network: 13행은 테마·세션 병합으로 비움
                const themeSessionMergeRows = [4, 8, 10, 14] // 테마+세션 가로 병합 행
                const cellStyle = {
                  boxSizing: 'border-box' as const,
                  borderRight: '1px solid #E9E9E9',
                  borderBottom: '1px solid #E9E9E9',
                  background: '#FFF',
                }
                const tableCellTextStyle = {
                  color: '#000',
                  textAlign: 'center' as const,
                  fontFamily: 'Pretendard',
                  fontSize: 16,
                  fontStyle: 'normal' as const,
                  fontWeight: 500,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }
                const themeLabels: Record<number, string> = {
                  0: 'Pre-Event Engagement',
                  1: 'Opening',
                  2: 'Cross the Border',
                  4: '중식',
                  5: 'Cross Functions',
                  8: 'Break Time & Casual Networking',
                  9: 'Cross the Process',
                  10: 'Break Time & Casual Networking',
                  11: 'Cross the Process',
                  12: 'Cross the Network',
                  14: 'Lucky Draw',
                  15: 'Closing',
                }
                const sessionLabels: Record<number, string> = {
                  0: '행사 안내',
                  1: '오프닝 세레모니',
                  2: 'M1. 대표이사 메시지',
                  3: 'M2. GCBP 전사 전략 공유',
                  5: 'M3. GCBP 우수사례 공유',
                  6: '',
                  7: '',
                  9: 'M4. 협업 인사이트(특강)',
                  11: 'M4. 협업 인사이트(미니 워크숍)',
                  12: 'M5. 리더 간 상호 네트워킹',
                  15: '행사 마무리 & 랩업',
                }
                const detailLabels: Record<number, string> = {
                  0: '행사 등록 및 안내, 체험 프로그램 참여, 네트워킹',
                  1: '오프닝 영상, 행사 취지 및 개요, 식순 소개',
                  2: '대표이사 특강',
                  3: '2026 GCBP 사업전략 발표',
                  4: '중식(Lunch Box), 체험 프로그램 참여',
                  5: 'GCBP 협업 우수사례 공유 1 (영업/생산)',
                  6: 'GCBP 협업 우수사례 공유 2 (R&D)',
                  7: 'GCBP 협업 우수사례 공유 3 (영업/생산)',
                  8: 'Break Time, 체험 프로그램 참여, 네트워킹',
                  9: 'Cross Functional Collaboration 명사 특강',
                  10: 'Break Time, 체험 프로그램 참여, 네트워킹',
                  11: '협업 실패사례 Case Study 및 토의(Cross Mindset 도출)',
                  12: '단체사진 촬영 및 석식 만찬(뷔페)',
                  13: '레크레이션',
                  14: '럭키 드로우',
                  15: '폐회사',
                }
                const speakerLabels: Record<number, string> = {
                  0: '-',
                  1: '-',
                  2: '허은철 대표이사',
                  3: '배백식 전략사업개발실장',
                  4: '-',
                  5: '유성곤 PC본부장',
                  6: '황정운 R&D QM Unit장',
                  7: '안기범 SCM팀장',
                  8: '-',
                  9: '황성현 퀀텀인사이트 대표',
                  10: '-',
                  11: '외부 강사 & 퍼실리테이터',
                  12: '-',
                  13: '-',
                  14: '외부 MC',
                  15: '사회자',
                }
                const durationLabels: Record<number, string> = {
                  0: '-',
                  1: '5m',
                  2: '20m',
                  3: '30m',
                  4: '1h 20m',
                  5: '20m',
                  6: '20m',
                  7: '20m',
                  8: '20m',
                  9: '1h 30m',
                  10: '20m',
                  11: '2h',
                  12: '1h',
                  13: '20m',
                  14: '40m',
                  15: '10m',
                }
                const timeLabels: Record<number, string> = {
                  0: '09:00-10:15',
                  1: '10:15-10:20',
                  2: '10:20-10:40',
                  3: '10:40-11:10',
                  4: '11:10-12:30',
                  5: '12:30-12:50',
                  6: '12:50-13:10',
                  7: '13:10-13:30',
                  8: '13:30-13:50',
                  9: '13:50-15:20',
                  10: '15:20-15:40',
                  11: '15:40-17:40',
                  12: '17:50-18:50',
                  13: '17:50-18:50',
                  14: '17:50-18:50',
                  15: '17:50-18:50',
                }
                const renderCell = (
                  key: string,
                  style: React.CSSProperties,
                  content?: string,
                  isDetailColumn?: boolean
                ) =>
                  content !== undefined ? (
                    <div
                      key={key}
                      className="shrink-0 flex items-center"
                      style={{
                        ...style,
                        ...(isDetailColumn
                          ? {
                              justifyContent: 'flex-start',
                              paddingLeft: 12,
                            }
                          : { justifyContent: 'center' }),
                      }}
                    >
                      <span
                        style={{
                          ...tableCellTextStyle,
                          ...(isDetailColumn
                            ? { textAlign: 'left' as const }
                            : {}),
                        }}
                      >
                        {content}
                      </span>
                    </div>
                  ) : (
                    <div key={key} className="shrink-0" style={style} />
                  )
                const items: React.ReactNode[] = []
                for (let rowIndex = 0; rowIndex < 16; rowIndex++) {
                  if (skipCol0And1Rows.includes(rowIndex)) {
                    const contents = [
                      detailLabels[rowIndex],
                      speakerLabels[rowIndex],
                      durationLabels[rowIndex],
                      timeLabels[rowIndex],
                    ]
                    for (let colIndex = 3; colIndex <= 6; colIndex++) {
                      items.push(
                        renderCell(
                          `${rowIndex}-${colIndex}`,
                          {
                            ...cellStyle,
                            gridColumn: colIndex,
                            gridRow: rowIndex + 1,
                            height: 48,
                          },
                          contents[colIndex - 3],
                          colIndex === 3
                        )
                      )
                    }
                  } else if (skipCol0Rows.includes(rowIndex)) {
                    const dataContents = [
                      detailLabels[rowIndex],
                      speakerLabels[rowIndex],
                      durationLabels[rowIndex],
                      timeLabels[rowIndex],
                    ]
                    // 6·7행: 세션 열은 5행과 병합되어 있으므로 세션 칸 생략, 세부내용~시간만(그리드 col 3~6)
                    const skipSessionCol = rowIndex === 6 || rowIndex === 7
                    const startCol = skipSessionCol ? 2 : 1
                    for (let colIndex = startCol; colIndex <= 5; colIndex++) {
                      const content =
                        colIndex === 1
                          ? sessionLabels[rowIndex]
                          : dataContents[colIndex - 2]
                      items.push(
                        renderCell(
                          `${rowIndex}-${colIndex}`,
                          {
                            ...cellStyle,
                            gridColumn: colIndex + 1,
                            gridRow: rowIndex + 1,
                            height: 48,
                          },
                          content,
                          colIndex === 2
                        )
                      )
                    }
                  } else if (themeSessionMergeRows.includes(rowIndex)) {
                    items.push(
                      renderCell(
                        `${rowIndex}-merge`,
                        {
                          ...cellStyle,
                          gridColumn: '1 / span 2',
                          gridRow: rowIndex + 1,
                          height: 48,
                        },
                        themeLabels[rowIndex]
                      )
                    )
                    const mergeDataContents = [
                      detailLabels[rowIndex],
                      speakerLabels[rowIndex],
                      durationLabels[rowIndex],
                      timeLabels[rowIndex],
                    ]
                    for (let colIndex = 3; colIndex <= 6; colIndex++) {
                      items.push(
                        renderCell(
                          `${rowIndex}-${colIndex}`,
                          {
                            ...cellStyle,
                            gridColumn: colIndex,
                            gridRow: rowIndex + 1,
                            height: 48,
                          },
                          mergeDataContents[colIndex - 3],
                          colIndex === 3
                        )
                      )
                    }
                  } else {
                    for (let colIndex = 0; colIndex < 6; colIndex++) {
                      if ((rowIndex === 6 || rowIndex === 7) && colIndex === 1) continue
                      const isThemeRowSpan2 = rowIndex === 2 && colIndex === 0
                      const isThemeRowSpan3 = rowIndex === 5 && colIndex === 0
                      const isSessionRowSpan3 = rowIndex === 5 && colIndex === 1
                      const isThemeRowSpan2Row12 = rowIndex === 12 && colIndex === 0
                      const isSessionRowSpan2 = rowIndex === 12 && colIndex === 1
                      const rowSpan =
                        isThemeRowSpan2 || isThemeRowSpan2Row12
                          ? 'span 2'
                          : isThemeRowSpan3 || isSessionRowSpan3
                            ? 'span 3'
                            : isSessionRowSpan2
                              ? 'span 2'
                              : rowIndex + 1
                      const mergedHeight =
                        isThemeRowSpan2 || isThemeRowSpan2Row12 || isSessionRowSpan2
                          ? 96
                          : (isThemeRowSpan3 || isSessionRowSpan3)
                            ? 144
                            : null
                      const dataContent =
                        colIndex === 2
                          ? detailLabels[rowIndex]
                          : colIndex === 3
                            ? speakerLabels[rowIndex]
                            : colIndex === 4
                              ? durationLabels[rowIndex]
                              : colIndex === 5
                                ? timeLabels[rowIndex]
                                : undefined
                      const content =
                        colIndex === 0
                          ? themeLabels[rowIndex]
                          : colIndex === 1
                            ? sessionLabels[rowIndex]
                            : dataContent
                      items.push(
                        renderCell(
                          `${rowIndex}-${colIndex}`,
                          {
                            ...cellStyle,
                            gridColumn:
                              rowIndex === 6 || rowIndex === 7
                                ? colIndex === 0 ? 1 : colIndex + 1
                                : colIndex + 1,
                            gridRow: rowSpan,
                            ...(mergedHeight
                              ? {
                                  minHeight: mergedHeight,
                                  height: '100%',
                                  width: '100%',
                                  alignSelf: 'stretch',
                                  display: 'flex',
                                  justifyContent:
                                    colIndex === 2 ? 'flex-start' : 'center',
                                  alignItems: 'center',
                                  ...(colIndex === 2
                                    ? { paddingLeft: 12 }
                                    : {}),
                                }
                              : { height: 48 }),
                          },
                          content,
                          colIndex === 2
                        )
                      )
                    }
                  }
                }
                return items
              })()}
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

          {/* 버튼 두 개 - 네이버 지도 박스 아래 50px, 탭 전환 */}
          <div className="w-full max-w-[1420px] mt-[50px] flex flex-nowrap">
            <button
              type="button"
              onClick={() => setTransportTab('publicTransport')}
              className="flex justify-center items-center flex-1 min-w-0 max-w-[710px] cursor-pointer font-['Pretendard']"
              style={{
                width: 710,
                padding: '19px 0',
                borderTop: '2px solid #949494',
                borderBottom: '2px solid #949494',
                borderLeft: 'none',
                borderRight: 'none',
                background: transportTab === 'publicTransport' ? '#111' : 'transparent',
                color: transportTab === 'publicTransport' ? '#FFF' : '#111',
                textAlign: 'center',
                fontSize: 16,
                fontStyle: 'normal',
                fontWeight: transportTab === 'publicTransport' ? 600 : 500,
                lineHeight: '140%',
                letterSpacing: '-0.32px',
              }}
            >
              대중교통으로 오시는 길
            </button>
            <button
              type="button"
              onClick={() => setTransportTab('airport')}
              className="flex justify-center items-center flex-1 min-w-0 max-w-[710px] cursor-pointer font-['Pretendard']"
              style={{
                width: 710,
                padding: '19px 0',
                borderTop: '2px solid #949494',
                borderBottom: '2px solid #949494',
                borderLeft: 'none',
                borderRight: 'none',
                background: transportTab === 'airport' ? '#111' : 'transparent',
                color: transportTab === 'airport' ? '#FFF' : '#111',
                textAlign: 'center',
                fontSize: 16,
                fontStyle: 'normal',
                fontWeight: transportTab === 'airport' ? 600 : 500,
                lineHeight: '140%',
                letterSpacing: '-0.32px',
              }}
            >
              공항에서 오시는 길
            </button>
          </div>

          {transportTab === 'publicTransport' && (
          <>
          {/* 리무진 버스 안내 - 버튼 행 바로 아래, 왼쪽 정렬 */}
          <div className="w-full max-w-[1420px] flex flex-nowrap">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 200,
                height: 120,
                padding: 14,
                gap: 10,
                borderBottom: '1px solid #949494',
                background: '#E9E9E9',
              }}
            >
              <div
                className="flex flex-col justify-center shrink-0 font-['Pretendard']"
                style={{
                  width: 172,
                  height: 92,
                  color: '#111',
                  fontSize: 16,
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                리무진 버스 (No.6030 / 약 1시간 30분)
              </div>
            </div>
            <div
              className="flex items-center shrink-0 font-['Pretendard']"
              style={{
                width: 1220,
                height: 120,
                padding: '14px 16px',
                gap: 10,
                borderBottom: '1px solid #949494',
                color: '#111',
                fontSize: 14,
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.28px',
                textAlign: 'left',
              }}
            >
              <span>
                -탑승: 인천공항 터미널 1 (1층) 6B & 터미널 2 (B1) 트래픽 센터 #32
                <br />
                -하차: 서울드래곤시티 (이비스 스타일 측면 출입구)
                <br />
                -요금: 성인 17,000원 / 어린이(6~13세) 12,000원 / 5세 이하 무료
                <br />
                *티켓 구매 및 버스 스케줄 문의: 프론트 데스크
              </span>
            </div>
          </div>

          {/* 자가용 안내 - 리무진 버스 행 바로 아래 */}
          <div className="w-full max-w-[1420px] flex flex-nowrap">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 200,
                height: 70,
                padding: 14,
                gap: 10,
                borderBottom: '1px solid #949494',
                background: '#E9E9E9',
              }}
            >
              <div
                className="flex flex-col justify-center shrink-0 font-['Pretendard']"
                style={{
                  width: 172,
                  height: 46,
                  color: '#111',
                  fontSize: 16,
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                자가용 (57 km / 약 55분)
              </div>
            </div>
            <div
              className="flex items-center shrink-0 font-['Pretendard']"
              style={{
                width: 1220,
                height: 70,
                padding: '14px 16px',
                gap: 10,
                borderBottom: '1px solid #949494',
                color: '#111',
                fontSize: 14,
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.28px',
                textAlign: 'left',
              }}
            >
              <span>
                -인천공항 → 북인천IC → 김포공항IC → 방화대교 → 강변북로 → 원효로
                → 용산전자상가 사거리 → 서울드래곤시티
              </span>
            </div>
          </div>

          {/* 열차/지하철 안내 - 자가용 행 바로 아래 */}
          <div className="w-full max-w-[1420px] flex flex-nowrap">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 200,
                height: 120,
                padding: 14,
                gap: 10,
                borderBottom: '1px solid #949494',
                background: '#E9E9E9',
              }}
            >
              <div
                className="flex flex-col justify-center shrink-0 font-['Pretendard']"
                style={{
                  width: 172,
                  height: 46,
                  color: '#111',
                  fontSize: 16,
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                열차/지하철 (약 1시간 15분 / 급행)
              </div>
            </div>
            <div
              className="flex items-center shrink-0 font-['Pretendard']"
              style={{
                width: 1220,
                height: 120,
                padding: '14px 16px',
                gap: 10,
                borderBottom: '1px solid #949494',
                color: '#111',
                fontSize: 14,
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.28px',
                textAlign: 'left',
              }}
            >
              <span>
                -탑승: 인천공항 AREX 역
                <br />
                -환승: 서울역 1호선
                <br />
                -하차: 용산역 1호선 (3번 출구) ※ 도보 3분
                <br />
                -요금: 9,250원 (급행)
              </span>
            </div>
          </div>

          {/* 택시 안내 - 열차/지하철 행 바로 아래 */}
          <div className="w-full max-w-[1420px] flex flex-nowrap">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 200,
                height: 70,
                padding: 14,
                gap: 10,
                borderBottom: '2px solid #949494',
                background: '#E9E9E9',
              }}
            >
              <div
                className="shrink-0 font-['Pretendard']"
                style={{
                  width: 172,
                  color: '#111',
                  fontSize: 16,
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                택시 (57 km / 약 55분)
              </div>
            </div>
            <div
              className="flex items-center shrink-0 font-['Pretendard']"
              style={{
                width: 1220,
                height: 70,
                padding: '14px 16px',
                gap: 10,
                borderBottom: '2px solid #949494',
                color: '#111',
                fontSize: 14,
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.28px',
                textAlign: 'left',
              }}
            >
              <span>-요금: 약 45,000원~50,000원 (일반)</span>
            </div>
          </div>

          {/* 버스 탑승 안내 - 택시 행 아래 50px, 좌우 2열(20px 간격) */}
          <div
            className="w-full max-w-[1420px] flex flex-nowrap"
            style={{ marginTop: 50, gap: 20 }}
          >
            {/* 왼쪽 블록 */}
            <div className="flex flex-col shrink-0">
              <div
                className="flex items-center font-['Pretendard']"
                style={{
                  width: 700,
                  height: 50,
                  padding: '0 30px',
                  gap: 10,
                  borderTop: '2px solid #949494',
                  borderBottom: '1px solid #949494',
                  background: '#E4E4E4',
                  color: '#000',
                  fontSize: 16,
                  fontStyle: 'normal',
                  fontWeight: 700,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                버스 탑승 안내
              </div>
              <div
                className="font-['Pretendard'] shrink-0"
                style={{
                  width: 700,
                  height: 280,
                  padding: '20px 30px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  borderBottom: '1px solid #949494',
                  background: '#F9F9F9',
                }}
              >
                <span
                  style={{
                    width: 640,
                    flexShrink: 0,
                    color: '#000',
                    fontSize: 14,
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                    letterSpacing: '-0.28px',
                  }}
                >
                  행사명 : 2026 GCBP Leadership Workshopt
                  <br />
                  일시 : 3월 5일(목), 1day
                  <br />
                  오실 때 : 출발지 :GC녹십자 오창공장 앞(탑승시간 :00:00) / 도착지
                  : 서울 용산 드래곤시티
                  <br />
                  가실 때 : 출발지 : 서울 용산 드래곤시티(탑승시간 :00:00)
                  <br />
                  도착지 : GC 녹십자 오창공장 앞
                </span>
              </div>
            </div>
            {/* 오른쪽 블록 - 호텔 주차장 안내 */}
            <div className="flex flex-col shrink-0">
              <div
                className="flex items-center font-['Pretendard']"
                style={{
                  width: 700,
                  height: 50,
                  padding: '0 30px',
                  gap: 10,
                  borderTop: '2px solid #949494',
                  borderBottom: '1px solid #949494',
                  background: '#E4E4E4',
                  color: '#000',
                  fontSize: 16,
                  fontStyle: 'normal',
                  fontWeight: 700,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                호텔 주차장 안내
              </div>
              <div
                className="font-['Pretendard'] shrink-0 flex flex-col"
                style={{
                  width: 700,
                  height: 280,
                  padding: '20px 30px',
                  alignItems: 'flex-start',
                  gap: 2,
                  borderBottom: '1px solid #949494',
                  background: '#F9F9F9',
                }}
              >
                <span
                  style={{
                    width: 640,
                    flexShrink: 0,
                    color: '#000',
                    fontSize: 14,
                    fontStyle: 'normal',
                    fontWeight: 700,
                    lineHeight: '140%',
                    letterSpacing: '-0.28px',
                  }}
                >
                  노보텔엠버서더 서울 용산 지하 주차장 이용(무료)
                </span>
                <span
                  style={{
                    width: 640,
                    flexShrink: 0,
                    color: '#000',
                    fontSize: 14,
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                    letterSpacing: '-0.28px',
                  }}
                >
                  이용 방법 : - 포이어 통해 차량 번호 입력 (포이어 위치 : 1층
                  메인 로비)
                </span>
                <span
                  style={{
                    width: 640,
                    flexShrink: 0,
                    color: '#000',
                    fontSize: 14,
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                    letterSpacing: '-0.28px',
                  }}
                >
                  지하 주차장 가는 길
                </span>
                <div style={{ marginTop: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getGcbioImageUrl('page1_location.png')}
                    alt="호텔 주차장 위치"
                    width={704}
                    height={176}
                    style={{
                      width: 704,
                      height: 176,
                      display: 'block',
                      objectFit: 'cover',
                      borderRadius: 16,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          {transportTab === 'airport' && (
          <div className="w-full max-w-[1420px] flex flex-nowrap font-['Pretendard']">
            {/* 왼쪽 고정 열: 인천국제공항 */}
            <div
              className="flex items-center shrink-0"
              style={{
                width: 200,
                height: 386,
                padding: 14,
                gap: 10,
                borderTop: '1px solid #949494',
                borderBottom: '2px solid #949494',
                background: '#E9E9E9',
              }}
            >
            <div
              className="flex flex-col justify-center shrink-0"
              style={{
                width: 172,
                height: 92,
                  color: '#111',
                  fontSize: 16,
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                }}
              >
                인천국제공항
              </div>
            </div>
            {/* 오른쪽: 수단·안내 테이블 */}
            <div
              className="flex flex-col min-w-0 flex-1"
              style={{
                borderTop: '1px solid #949494',
                borderBottom: 'none',
                borderLeft: 'none',
                borderRight: 'none',
              }}
            >
              {[
                {
                  method: '자가용 (57 km / 약 55분)',
                  detail:
                    '-인천공항 → 북인천IC → 김포공항IC → 방화대교 → 강변북로 → 원효로 → 용산전자상가 사거리 → 서울드래곤시티',
                  methodHeight: 70,
                },
                {
                  method: '열차/지하철 (약 1시간 15분 / 급행)',
                  detail:
                    '-탑승: 인천공항 AREX 역\n-환승: 서울역 1호선\n-하차: 용산역 1호선 (3번 출구) ※ 도보 3분\n-요금: 9,250원 (급행)',
                  methodHeight: 120,
                },
                {
                  method: '리무진 버스 (No. 6001 / 약 1시간 30분)',
                  detail:
                    '-탑승: 인천공항 제1터미널 1층 5B 정류소 / 제2터미널 지하 1층 29번 승차홈\n-하차: 신용산역, 용산역 3번 출구 옆 공중보행교를 따라 도보 이동\n-요금: 성인 17,000원 / 어린이(6~13세) 12,000원 / 5세 이하 무료\n*티켓 구매 및 버스 스케줄 문의: 프론트 데스크',
                  methodHeight: 120,
                },
                {
                  method: '택시 (57 km / 약 55분)',
                  detail: '-요금: 약 45,000원~50,000원 (일반)',
                  methodHeight: 70,
                },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex flex-nowrap"
                  style={{
                    borderBottom:
                      i < 3
                        ? '1px solid #949494'
                        : '2px solid #949494',
                  }}
                >
                  <div
                    className="flex items-center shrink-0"
                    style={{
                      width: 200,
                      height: row.methodHeight,
                      padding: '14px 16px',
                      gap: 10,
                      borderRight: '1px solid #949494',
                      borderLeft: '1px solid #949494',
                      background: '#FFF',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      className="shrink-0"
                      style={{
                        width: 168,
                        color: '#111',
                        fontSize: 14,
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '140%',
                        letterSpacing: '-0.28px',
                      }}
                    >
                      {row.method}
                    </span>
                  </div>
                  <div
                    className="flex items-center min-w-0 flex-1"
                    style={{
                      height: row.methodHeight,
                      padding: '19px 16px 14px',
                      background: '#FFF',
                      color: '#111',
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      whiteSpace: 'pre-line',
                      textAlign: 'left',
                      boxSizing: 'border-box',
                    }}
                  >
                    {row.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
          </div>
        </div>
        </main>
      </div>
    </div>
  )
}
