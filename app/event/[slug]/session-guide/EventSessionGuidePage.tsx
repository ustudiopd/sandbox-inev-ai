'use client'

import Image from 'next/image'
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
          className="w-full flex justify-center items-center box-border flex-1"
          style={{
            padding: '150px 250px 145px 250px',
          }}
        >
          <div className="flex flex-col justify-center items-center w-full max-w-[1280px]">
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
                marginBottom: '24px',
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
              }}
            >
              2026 GCBP Leadership Workshop의 문을 열고
              <br />
              미래를 향한 발걸음을 위한 한마디
            </p>
            <div
              style={{
                width: '1280px',
                height: '290px',
                background: '#F0F0F0',
                marginTop: '120px',
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ marginLeft: '150px', marginTop: '-98px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <div className="relative flex-shrink-0" style={{ width: '305px', height: '392px' }}>
                  <Image
                    src={getGcbioImageUrl('person1.png')}
                    alt="허은철 대표이사"
                    fill
                    className="object-contain"
                    sizes="305px"
                  />
                </div>
                <div style={{ width: '145px', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <p
                className="font-['Pretendard']"
                style={{
                  color: '#111',
                  fontFamily: 'Pretendard',
                  fontSize: '24px',
                  fontStyle: 'normal',
                  fontWeight: 700,
                  lineHeight: '140%',
                  letterSpacing: '-0.48px',
                  textAlign: 'left',
                  margin: 0,
                  marginBottom: '12px',
                }}
              >
                허은철 / 대표이사
              </p>
              <p
                className="font-['Pretendard']"
                style={{
                  color: '#111',
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '140%',
                  letterSpacing: '-0.32px',
                  textAlign: 'left',
                  margin: 0,
                  marginBottom: '48px',
                }}
              >
                특강: 2026 GCBP 리더들의 마음가짐 (더미 텍스트)
              </p>
              <p
                className="font-['Pretendard']"
                style={{
                  color: '#111',
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '140%',
                  letterSpacing: '-0.28px',
                  textAlign: 'left',
                  margin: 0,
                }}
              >
                2026년 새로운 GCBP 리더들이 가져야 할 마음가짐과
                <br />
                협업을 통한 새로운 도전
              </p>
                </div>
              </div>
            </div>
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
                marginTop: '127px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              M2. 2026 GCBP 사업전략 발표
            </h2>
            <div
              style={{
                width: '1280px',
                height: '290px',
                background: '#F0F0F0',
                marginTop: '120px',
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ marginLeft: '150px', marginTop: '-98px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <div className="relative flex-shrink-0" style={{ width: '282px', height: '376px' }}>
                  <Image
                    src={getGcbioImageUrl('person2.png')}
                    alt="배백식 전략 사업 개발 실장"
                    fill
                    className="object-contain"
                    sizes="282px"
                  />
                </div>
                <div style={{ width: '145px', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '50px' }}>
                  <p
                    className="font-['Pretendard']"
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '24px',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      lineHeight: '140%',
                      letterSpacing: '-0.48px',
                      textAlign: 'left',
                      margin: 0,
                      marginBottom: '12px',
                    }}
                  >
                    배백식 / 전략 사업 개발 실장
                  </p>
                  <p
                    className="font-['Pretendard']"
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                      textAlign: 'left',
                      margin: 0,
                      marginBottom: '30px',
                    }}
                  >
                    제목 : GCBP의 더 밝은 미래를 위한 사업 전략
                  </p>
                  <p
                    className="font-['Pretendard']"
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      textAlign: 'left',
                      margin: 0,
                    }}
                  >
                    2026년 , 더 나아가 앞으로의 미래를 위해 GCBP의
                    <br />
                    미래를 위한 사업 전략
                    <br />
                    <br />
                    1.000000
                    <br />
                    2.000000
                    <br />
                    3.000000
                  </p>
                </div>
              </div>
            </div>
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
                marginTop: '127px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              M3. GCBP 우수사례발표
            </h2>
            <p
              className="font-['Pretendard']"
              style={{
                width: '644px',
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
                marginTop: '700px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              크로스 스테이지 ㅣ 무대 프로그램
            </h2>
            <p
              className="font-['Pretendard']"
              style={{
                width: '644px',
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
            <p
              className="font-['Pretendard']"
              style={{
                alignSelf: 'stretch',
                textAlign: 'center',
                fontFamily: 'Pretendard',
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
                background: 'linear-gradient(90deg, #FB0B1D 46.5%, #FFD623 50.1%, #009B39 53.7%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginTop: '70px',
              }}
            >
              초청연사
            </p>
            <div
              style={{
                width: '1280px',
                height: '290px',
                background: '#F0F0F0',
                marginTop: '130px',
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ marginLeft: '150px', marginTop: '-76.7px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <div className="relative flex-shrink-0" style={{ width: '342px', height: '340px' }}>
                  <Image
                    src={getGcbioImageUrl('person3.png')}
                    alt="황성현 연사"
                    fill
                    className="object-contain"
                    sizes="342px"
                  />
                </div>
                <div style={{ width: '145px', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '50px' }}>
                  <p
                    className="font-['Pretendard']"
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '24px',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      lineHeight: '140%',
                      letterSpacing: '-0.48px',
                      textAlign: 'left',
                      margin: 0,
                      marginBottom: '12px',
                    }}
                  >
                    황성현 / 연사
                  </p>
                  <p
                    className="font-['Pretendard']"
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '140%',
                      letterSpacing: '-0.32px',
                      textAlign: 'left',
                      margin: 0,
                      marginBottom: '30px',
                      display: 'flex',
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>강연 주제: </span>
                    <span style={{ fontWeight: 500 }}>
                      조직의 사일로 현상을 극복하고 공동의 목표를
                      <br />
                      달성할 수 있도록 리더들에게 마인드 셋
                    </span>
                  </p>
                  <p
                    className="font-['Pretendard']"
                    style={{
                      color: '#111',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '140%',
                      letterSpacing: '-0.28px',
                      textAlign: 'left',
                      margin: 0,
                    }}
                  >
                    현) 퀸텀사이트 대표
                    <br />
                    현) 한글과 컴퓨터 사외이사
                    <br />
                    전) 카카오 인사총괄 부사장
                    <br />
                    전) 구글코리아 인사총괄
                  </p>
                </div>
              </div>
            </div>
            <div
              style={{
                width: '1420px',
                height: '1px',
                background: '#242424',
                marginTop: '100px',
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
