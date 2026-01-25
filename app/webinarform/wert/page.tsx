"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const highlightPoints = [
  {
    title: "WEBINAR POINT 1",
    description:
      "IP·R&D·특허사무소 등 서로 다른 조직이 실제로 키워트 인사이트를 어떻게 적용하고 있는지 고객사례 중심으로 살펴봅니다.",
  },
  {
    title: "WEBINAR POINT 2",
    description:
      "키워트 인사이트를 도입한 워크플로우와 커뮤니케이션 방식이 어떻게 개선되었는지, 사내 협업 모델까지 공유합니다.",
  },
];

const overviewItems = [
  {
    label: "일시",
    value: "2026년 2월 6일(화) 오후 2시 - 3시 30분",
  },
  {
    label: "장소",
    value: "온라인 LIVE",
  },
  {
    label: "참가비",
    value: "무료",
  },
];

const audience = [
  "특허 리서치·분석 업무를 효율화하고 싶은 IP 담당자 및 특허사무소",
  "연구 초기부터 특허를 고려해 리스크를 줄이고 싶은 R&D 연구원",
  "IP 및 R&D 조직 내 협업과 의사결정을 빠르게 만들고 싶은 담당자",
  "키워트 인사이트 도입을 고민 중인 담당자",
];

const sessions = [
  {
    label: "SESSION 1",
    duration: "약 40분",
    title: "고객사례로 알아보는 AI 특허리서치 활용법",
    bullets: [
      "IP·R&D·특허사무소별 키워트 인사이트 활용사례",
      "조직 간 커뮤니케이션 및 의사결정 개선 사례",
    ],
    speaker: {
      name: "조은비 시니어 매니저",
      role: "워트인텔리전스\n글로벌마켓매니지먼트팀",
      avatar: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/jo.png",
    },
  },
  {
    label: "SESSION 2",
    duration: "약 20분",
    title: "키워트 인사이트가 가장 많이 받는 질문들",
    bullets: [
      "고객 데이터가 AI 학습에 사용되지 않나요?",
      "키워트 인사이트의 보안 구조는 어떻게 되어 있나요?",
      "키워트 인사이트는 ChatGPT·Gemini 같은 범용 AI와\n무엇이 다른가요?",
    ],
    speaker: {
      name: "조경식 팀장",
      role: "워트인텔리전스\n글로벌마켓매니지먼트팀",
      avatar: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/jo2.png",
    },
  },
  {
    label: "SESSION 3",
    duration: "약 20분",
    title: "키워트 인사이트 바로 써보기",
    bullets: [
      "회원가입 및 기본 기능 안내",
      "실무에서 바로 쓰는 핵심 기능 소개",
    ],
    speaker: null,
  },
  {
    label: "SESSION 4",
    duration: "약 10분",
    title: "QnA",
    bullets: [
      "좋은 질문을 해주신 분들 중 추첨으로 선물을 드립니다.",
    ],
    note: "*아래 이벤트 항목 참고",
    speaker: null,
  },
];


const organizationCards = [
  {
    title: "기업 IP팀은?",
    description: "선행조사·유사특허 분석·IP 포트폴리오를 한 번에 분석하고,<br />데이터 기반 IP 전략을 수립합니다.",
    image: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image 51.png",
    imageAlt: "기업 IP팀 활용 사례",
    imageClassName: "self-stretch h-[461.50px] rounded-lg overflow-hidden",
  },
  {
    title: "특허사무소는?",
    description: "선행문헌 조사와 비교 분석을 빠르게 수행하고, 명세서<br />작성과 출원 전략의 완성도를 높입니다.",
    image: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image 52.png",
    imageAlt: "특허사무소 활용 사례",
    imageClassName: "w-[728px] h-96 relative overflow-hidden",
  },
  {
    title: "기업 R&D팀은?",
    description: "연구 초기 단계부터 특허 리스크를 확인하고, 유사 특허<br />분석을 아이디어 확장과 기술 기획으로 연결합니다.",
    image: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image 50.png",
    imageAlt: "기업 R&D팀 활용 사례",
    imageClassName: "w-[728px] h-96",
  },
];

function OrganizationCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % organizationCards.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + organizationCards.length) % organizationCards.length);
  };

  return (
    <div className="left-[72px] top-[1592px] absolute w-[856px]">
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {organizationCards.map((card, index) => (
            <div
              key={index}
              className="w-[856px] h-[820px] p-16 bg-stone-50 rounded-[48px] shadow-[0px_4px_48px_-10px_rgba(0,0,0,0.08)] inline-flex flex-col justify-start items-start gap-2.5 overflow-hidden flex-shrink-0"
            >
              <div className="self-stretch flex-1 flex flex-col justify-between items-center">
                <div className="self-stretch flex flex-col justify-start items-start gap-5">
                  <div className="self-stretch justify-start text-teal-600 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                    {card.title}
                  </div>
                  <div className="self-stretch justify-start text-black/90 font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                    <span dangerouslySetInnerHTML={{ __html: card.description }} />
                  </div>
                </div>
                {card.image ? (
                  <div className={card.imageClassName}>
                    {card.imageClassName.includes('relative') && card.imageClassName.includes('w-[728px]') ? (
                      <img
                        src={card.image}
                        alt={card.imageAlt}
                        className="w-[662.81px] h-[457.40px] left-[32.60px] top-[-3.82px] absolute object-cover rounded-lg"
                      />
                    ) : (
                      <img
                        src={card.image}
                        alt={card.imageAlt}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
                  </div>
                ) : (
                  <div className={card.imageClassName}>
                    <div className="bg-gray-200 rounded-lg flex items-center justify-center w-full h-full">
                      <span className="text-gray-400">이미지 영역</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-4 pointer-events-none">
        <button
          onClick={goToPrev}
          className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center pointer-events-auto hover:bg-white transition-colors"
          aria-label="이전 카드"
        >
          <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goToNext}
          className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center pointer-events-auto hover:bg-white transition-colors"
          aria-label="다음 카드"
        >
          <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {organizationCards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-teal-600 w-8' : 'bg-gray-300'
            }`}
            aria-label={`카드 ${index + 1}로 이동`}
          />
        ))}
      </div>
    </div>
  );
}

export default function WebinarFormWertPage() {
  return (
    <div className="bg-white min-h-screen">
      <div
        className="mx-auto flex flex-col items-start"
        style={{
          display: "flex",
          width: "1000px",
          flexDirection: "column",
          alignItems: "flex-start",
          maxWidth: "100%",
        }}
      >
      {/* Hero Section */}
      <section className="w-[1000px] h-[1488px] relative bg-white overflow-hidden" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        {/* Background Image - Rotated and Blurred */}
        <div className="w-[1972px] h-[1109px] left-[-34px] top-[1530px] absolute origin-top-left -rotate-90 blur-2xl">
          <Image
            src="/storage/v1/object/public/webinar-thumbnails/wert/image 50-1.png"
            alt=""
            width={1972}
            height={1109}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {/* Header with Logo */}
        <div className="w-[1000px] h-28 left-0 top-0 absolute bg-white/60 backdrop-blur-[2px] overflow-hidden">
          <div className="w-80 h-10 left-[338px] top-[40px] absolute overflow-hidden">
            <Image
              src="/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png"
              alt="keywert Insight"
              width={320}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="w-[1000px] h-72 left-0 bottom-0 absolute bg-gradient-to-b from-white/0 to-white" />

        {/* Content Area */}
        <div className="w-[856px] left-[72px] top-[315px] absolute inline-flex flex-col justify-start items-center gap-20">
          <div className="self-stretch flex flex-col justify-start items-center gap-16">
            <div className="w-[623px] flex flex-col justify-start items-center gap-10">
              <div className="self-stretch flex flex-col justify-start items-center gap-8">
                <div className="self-stretch text-center justify-start text-black font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                  실제 고객사례로 알아보는
                </div>
                <div className="self-stretch text-center justify-start text-black font-bold" style={{ fontSize: '96px', fontFamily: 'Pretendard, sans-serif', lineHeight: '117.60px' }}>
                  AI 특허리서치<br /><span style={{ whiteSpace: 'nowrap' }}>실무 활용 웨비나</span>
                </div>
              </div>
              <div className="inline-flex justify-start items-center gap-2">
                <div className="px-6 py-2 bg-black rounded-2xl flex justify-center items-center gap-2.5 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    2026. 02. 06{" "}
                  </div>
                </div>
                <div className="px-6 py-2 bg-black rounded-2xl flex justify-center items-center gap-2.5 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    14:00
                  </div>
                </div>
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-8">
              <div className="self-stretch text-center justify-start text-black font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                IP팀·특허사무소·R&D팀의<br />키워트 인사이트 활용 방식이 궁금하다면,
              </div>
              <div className="self-stretch text-center justify-start text-black font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                2월 6일 웨비나에서 직접 확인하세요.
              </div>
            </div>
          </div>
          <div className="w-96 flex flex-col justify-start items-start gap-8">
            <Link
              href="/event/149403/register"
              className="self-stretch pl-16 pr-10 py-6 bg-[#00A08C] rounded-[200px] inline-flex justify-center items-center gap-6 overflow-hidden"
            >
              <div className="text-center justify-start text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                웨비나 등록하기
              </div>
              <Image
                src="/storage/v1/object/public/webinar-thumbnails/wert/symbol1.png"
                alt=""
                width={14}
                height={20}
                className="w-3.5 h-5 object-contain"
              />
            </Link>
            <Link
              href="/webinar/149404"
              className="self-stretch pl-16 pr-10 py-6 bg-white/60 rounded-[200px] outline outline-2 outline-offset-[-2px] outline-white inline-flex justify-center items-center gap-6 overflow-hidden"
            >
              <div className="text-center justify-start text-stone-900 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                웨비나 시청하기
              </div>
              <Image
                src="/storage/v1/object/public/webinar-thumbnails/wert/symbol1.png"
                alt=""
                width={14}
                height={20}
                className="w-3.5 h-5 object-contain brightness-0"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 - Question & Webinar Points */}
      <section className="w-[1000px] h-[2011px] relative bg-white overflow-hidden">
        <div className="w-[858px] left-[72px] top-[168px] absolute inline-flex flex-col justify-start items-start gap-20">
          <div className="self-stretch flex flex-col justify-start items-center gap-3.5">
            <div className="w-24 h-24 relative">
              <div className="w-[103px] h-[90px] left-[38px] top-[10px] absolute">
                <Image
                  src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/qa2.png"
                  alt="Q&A"
                  width={103}
                  height={90}
                  className="w-full h-full object-contain"
                  quality={100}
                />
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-center gap-12">
              <div className="text-center justify-start text-teal-600 font-bold" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif', lineHeight: '96px' }}>
                "AI 특허리서치가 과연 우리 조직에<br />실질적인 도움이 될까?"
              </div>
              <div className="self-stretch text-center justify-start">
                <span className="text-black/80 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                  AI 특허리서치 활용을 고민하고 있지만<br />이 질문이 남아 있다면,<br />
                </span>
                <span className="text-black/80 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                  이번 웨비나
                </span>
                <span className="text-black/80 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                  가{" "}
                </span>
                <span className="text-black/80 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                  그 해답을 찾는 시간
                </span>
                <span className="text-black/80 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                  이 될 것입니다.
                </span>
              </div>
            </div>
          </div>
          <div className="self-stretch h-0.5 bg-black/5"></div>
          <div className="self-stretch flex flex-col justify-start items-center gap-16">
            <div className="self-stretch flex flex-col justify-start items-center gap-3">
              <div className="self-stretch text-center justify-start text-teal-600 font-bold" style={{ fontSize: '24px', fontFamily: 'Figtree, sans-serif', lineHeight: '40px' }}>
                IN THE WEBINAR
              </div>
              <div className="self-stretch text-center justify-start text-black/80 font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif', lineHeight: '72px' }}>
                이번 웨비나에서는
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className="self-stretch p-16 bg-black rounded-[40px] outline outline-1 outline-black/10 flex flex-col justify-center items-center gap-16">
                <div className="self-stretch justify-start">
                  <span className="text-teal-200 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    WEBINAR
                  </span>
                  <span className="text-teal-200 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    {" "}POINT 1
                  </span>
                </div>
                <div className="self-stretch justify-start">
                  <span className="text-white/90 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    기업의 IP팀, 특허사무소, R&D팀 등{" "}
                  </span>
                  <span className="text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    서로 다른 조직이
                  </span>
                  <span className="text-white/90 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    {" "}키워트 인사이트를 실제 업무에{" "}
                  </span>
                  <span className="text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    어떻게 적용하고 있는지 고객사례를 통해 살펴봅니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch p-16 bg-black rounded-[40px] outline outline-1 outline-black/10 flex flex-col justify-center items-center gap-16">
                <div className="self-stretch justify-start">
                  <span className="text-teal-200 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    WEBINAR
                  </span>
                  <span className="text-teal-200 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    {" "}POINT 2
                  </span>
                </div>
                <div className="self-stretch justify-start">
                  <span className="text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    키워트 인사이트를 활용함
                  </span>
                  <span className="text-white/90 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    으로써 다른 언어를<br />사용하는 부서의{" "}
                  </span>
                  <span className="text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '54px' }}>
                    워크플로우와 커뮤니케이션 방식이 어떻게 개선될 수 있는지도 함께 공유합니다.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Overview, Audience, Agenda & Speaker */}
      <section className="w-[1000px] h-[4564px] relative bg-gradient-to-b from-emerald-900 to-black overflow-hidden">
        {/* OVERVIEW Section */}
        <div className="w-[856px] left-[72px] top-[120px] absolute inline-flex flex-col justify-start items-start gap-16">
          <div className="self-stretch flex flex-col justify-center items-center gap-3">
            <div className="text-center justify-start text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Figtree, sans-serif', lineHeight: '40px' }}>
              OVERVIEW
            </div>
            <div className="text-center justify-start text-white font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif' }}>
              행사 개요
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-4">
            <div className="self-stretch pl-10 pr-16 py-6 bg-white/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-col justify-start items-start gap-6 overflow-hidden">
              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <div className="text-center justify-start text-white font-bold" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                  일        시
                </div>
                <div className="w-0.5 h-5 bg-white/20"></div>
                <div className="text-center justify-start text-white font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                  2026년 2월 6일(화) 오후 2시-3시 30분
                </div>
              </div>
            </div>
            <div className="self-stretch pl-10 pr-16 py-6 bg-white/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-col justify-start items-start gap-2.5 overflow-hidden">
              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <div className="text-center justify-start text-white font-bold" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                  장        소
                </div>
                <div className="w-0.5 h-5 bg-white/20"></div>
                <div className="text-center justify-start text-white font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                  온라인 LIVE
                </div>
              </div>
            </div>
            <div className="self-stretch pl-10 pr-16 py-6 bg-white/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-col justify-start items-start gap-2.5 overflow-hidden">
              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <div className="text-center justify-start text-white font-bold" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                  참  가  비
                </div>
                <div className="w-0.5 h-5 bg-white/20"></div>
                <div className="text-center justify-start text-white font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                  무료
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AUDIENCE Section */}
        <div className="w-[856px] left-[72px] top-[777px] absolute inline-flex flex-col justify-start items-start gap-16">
          <div className="self-stretch flex flex-col justify-center items-center gap-3">
            <div className="text-center justify-start text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Figtree, sans-serif', lineHeight: '40px' }}>
              AUDIENCE
            </div>
            <div className="text-center justify-start text-white font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif' }}>
              참석 대상
            </div>
          </div>
          <div className="self-stretch p-16 bg-white/10 rounded-[48px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-col justify-start items-start gap-8 overflow-hidden">
            <div className="self-stretch inline-flex justify-start items-center gap-6">
              <div className="flex-1 justify-start">
                <span className="text-white/80 font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                  특허 리서치·분석 업무를 효율화하고 싶은<br />
                </span>
                <span className="text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                  IP 담당자 및 특허사무소
                </span>
              </div>
            </div>
            <div className="self-stretch h-px bg-white/20"></div>
            <div className="self-stretch inline-flex justify-start items-center gap-6">
              <div className="flex-1 justify-start">
                <span className="text-white/80 font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                  연구 초기부터 특허를 고려해 리스크를 줄이고 싶은<br />
                </span>
                <span className="text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                  R&D 연구원
                </span>
              </div>
            </div>
            <div className="self-stretch h-px bg-white/20"></div>
            <div className="self-stretch inline-flex justify-start items-center gap-6">
              <div className="flex-1 justify-start">
                <span className="text-white/80 font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                  IP 및 R&D 조직 내 협업과 의사결정을<br />
                </span>
                <span className="text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                  빠르게 만들고 싶은 담당자
                </span>
              </div>
            </div>
            <div className="self-stretch h-px bg-white/20"></div>
            <div className="self-stretch inline-flex justify-start items-center gap-6">
              <div className="flex-1 justify-start text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                키워트 인사이트 도입을 고민 중인 담당자
              </div>
            </div>
          </div>
        </div>

        {/* AGENDA & SPEAKER Section */}
        <div className="w-[856px] left-[72px] top-[1782px] absolute inline-flex flex-col justify-start items-start gap-16">
          <div className="self-stretch flex flex-col justify-start items-center gap-3">
            <div className="self-stretch text-center justify-start text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Figtree, sans-serif', lineHeight: '40px' }}>
              AGENDA & SPEAKER
            </div>
            <div className="self-stretch text-center justify-start text-white font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif' }}>
              세션 소개 및 발표연사
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-6">
            {sessions.map((session, index) => (
              <div
                key={session.label}
                className="self-stretch p-16 bg-white/10 rounded-[48px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-col justify-start items-start gap-12 overflow-hidden"
              >
                <div className={`${index === 0 ? 'w-[662px]' : 'self-stretch'} flex flex-col justify-start items-start gap-10`}>
                  <div className="inline-flex justify-start items-center gap-2">
                    <div className="px-4 py-2 bg-teal-500 rounded-lg flex justify-center items-center gap-2.5 overflow-hidden">
                      <div className="justify-start text-white font-bold" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif' }}>
                        {session.label}
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-teal-500/10 rounded-lg flex justify-center items-center gap-2.5 overflow-hidden">
                      <div className="justify-start text-teal-500 font-bold" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif' }}>
                        {session.duration}
                      </div>
                    </div>
                  </div>
                  <div className="self-stretch flex flex-col justify-start items-start gap-10">
                    <div className="self-stretch justify-start text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                      {session.title}
                    </div>
                    <div className={`${index === 0 || index === 2 ? 'w-[636px]' : 'self-stretch'} flex flex-col justify-start items-start gap-6`}>
                      {session.bullets.map((bullet, bulletIndex) => {
                        const isMultiLine = bullet.includes('\n');
                        const parts = bullet.split('\n');
                        return (
                          <div
                            key={bulletIndex}
                            className={isMultiLine ? 'self-stretch flex flex-col justify-center items-start' : index === 0 && bulletIndex === 0 ? 'self-stretch inline-flex justify-start items-start gap-4' : 'inline-flex justify-start items-start gap-4'}
                          >
                            {isMultiLine ? (
                              <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
                                {parts.map((part, partIndex) => (
                                  <div key={partIndex} className="self-stretch inline-flex justify-start items-center gap-4">
                                    {partIndex === 0 && (
                                      <div className="w-10 h-10 relative flex-shrink-0 flex items-center justify-center">
                                        <Image
                                          src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/check_icon.png"
                                          alt="check"
                                          width={40}
                                          height={40}
                                          className="w-full h-full object-contain"
                                          quality={100}
                                        />
                                      </div>
                                    )}
                                    {partIndex > 0 && <div className="w-10 h-10 relative"></div>}
                                    <div className="flex-1 justify-start text-white/80 font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif' }}>
                                      {part}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div className="w-10 h-10 relative flex-shrink-0 flex items-center justify-center">
                                  <Image
                                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/check_icon.png"
                                    alt="check"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-contain"
                                    quality={100}
                                  />
                                </div>
                                <div className="justify-start text-white/80 font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif' }}>
                                  {bullet}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {session.note && (
                        <div className="self-stretch inline-flex justify-start items-center gap-4">
                          <div className="w-10 h-10 relative"></div>
                          <div className="flex-1 justify-start text-white/40 font-normal" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif', lineHeight: '24px' }}>
                            {session.note}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {session.speaker && (
                  <>
                    <div className="self-stretch h-px bg-white/20"></div>
                    <div className="inline-flex justify-start items-center gap-12">
                      <div className="w-56 h-48 relative">
                        <Image
                          src={session.speaker.avatar}
                          alt={session.speaker.name}
                          width={224}
                          height={192}
                          className="w-full h-full object-contain"
                          quality={100}
                        />
                      </div>
                      <div className="w-64 inline-flex flex-col justify-start items-start gap-4">
                        <div className="justify-start text-white/80 font-normal whitespace-pre-line" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif', lineHeight: '36px' }}>
                          {session.speaker.role}
                        </div>
                        <div className="self-stretch justify-start text-white font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '24px' }}>
                          {session.speaker.name}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 - About keywert Insight */}
      <section className="w-[1000px] h-[2556px] relative bg-lime-50 overflow-hidden">
        {/* About keywert Insight Section */}
        <div className="w-[856px] left-[72px] top-[120px] absolute inline-flex flex-col justify-start items-start gap-16">
          <div className="self-stretch flex flex-col justify-center items-center gap-3">
            <div className="text-center justify-start text-teal-600 font-bold" style={{ fontSize: '30px', fontFamily: 'Figtree, sans-serif', lineHeight: '40px' }}>
              ABOUT keywert Insight
            </div>
            <div className="text-center justify-start text-black/80 font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif' }}>
              AI 특허리서치<br />'키워트 인사이트'
            </div>
          </div>
          <div className="self-stretch px-16 py-16 bg-stone-50 rounded-[48px] shadow-[0px_4px_48px_-10px_rgba(0,0,0,0.08)] flex flex-col justify-start items-start gap-16 overflow-hidden">
            <div className="self-stretch flex flex-col justify-start items-center gap-16">
              <div className="self-stretch flex flex-col justify-start items-start gap-6">
                <div className="w-80 h-10 relative overflow-hidden">
                  <Image
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png"
                    alt="keywert Insight"
                    width={320}
                    height={40}
                    className="w-full h-full object-contain"
                    quality={100}
                  />
                </div>
                <div className="self-stretch justify-start">
                  <span className="text-black/80 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '52.50px' }}>
                    대규모 특허 데이터를 학습한{" "}
                  </span>
                  <span className="text-black/80 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '52.50px' }}>
                    특허AI
                  </span>
                  <span className="text-black/80 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '52.50px' }}>
                    로 할루시네이션 없이{" "}
                  </span>
                  <span className="text-black/80 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '52.50px' }}>
                    특허검색부터 분석, R&D 전략
                  </span>
                  <span className="text-black/80 font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '52.50px' }}>
                    까지 제공하는<br />서비스입니다.
                  </span>
                </div>
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-6">
              <div className="self-stretch inline-flex justify-between items-center">
                <div className="text-center justify-start text-black/80 font-semibold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                  특허 문헌
                </div>
                <div className="text-center justify-start">
                  <span className="text-teal-600 font-bold" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    1.7
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                    건
                  </span>
                </div>
              </div>
              <div className="self-stretch h-0.5 bg-black/10"></div>
              <div className="self-stretch inline-flex justify-between items-center">
                <div className="text-center justify-start text-black/80 font-semibold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                  특허 문장
                </div>
                <div className="text-center justify-start">
                  <span className="text-teal-600 font-bold" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    2,500
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                    개
                  </span>
                </div>
              </div>
              <div className="self-stretch h-0.5 bg-black/10"></div>
              <div className="self-stretch inline-flex justify-between items-center">
                <div className="text-center justify-start text-black/80 font-semibold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                  특허 도면
                </div>
                <div className="text-center justify-start">
                  <span className="text-teal-600 font-bold" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    16
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                    장
                  </span>
                </div>
              </div>
              <div className="self-stretch h-0.5 bg-black/10"></div>
              <div className="self-stretch inline-flex justify-between items-center">
                <div className="text-center justify-start text-black/80 font-semibold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                  가공 데이터
                </div>
                <div className="text-center justify-start">
                  <span className="text-teal-600 font-bold" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    1.5
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider" style={{ fontSize: '60px', fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif' }}>
                    건
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="left-[240px] top-[1376px] absolute text-center justify-start text-black/80 font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif', lineHeight: '72px' }}>
          키워트 인사이트,<br />각 조직은 이렇게 활용합니다
        </div>

        {/* Organization Cards Carousel */}
        <OrganizationCarousel />
      </section>

      {/* Section 5 - Event */}
      <section className="w-[1000px] h-[1867px] relative bg-gradient-to-br from-teal-500 to-teal-800 overflow-hidden">
        <div className="w-[856px] left-[72px] top-[120px] absolute inline-flex flex-col justify-start items-start gap-24">
          <div className="self-stretch flex flex-col justify-center items-center gap-3">
            <div className="text-center justify-start text-green-200 font-bold" style={{ fontSize: '30px', fontFamily: 'Figtree, sans-serif', lineHeight: '40px' }}>
              EVENT
            </div>
            <div className="text-center justify-start text-white font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif' }}>
              웨비나 참여 이벤트
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-end gap-20">
            {/* Event 1 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-10">
              <div className="self-stretch flex flex-col justify-center items-center gap-10">
                <div className="px-6 py-1 bg-white/25 rounded-[48px] inline-flex justify-center items-center gap-2.5 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                    Event 1
                  </div>
                </div>
                <div className="self-stretch flex flex-col justify-start items-center gap-6">
                  <div className="justify-start text-white font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                    QnA 이벤트
                  </div>
                  <div className="text-center justify-start">
                    <span className="text-white font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                      웨비나에서{" "}
                    </span>
                    <span className="text-white font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                      좋은 질문을 해주신 분들 중
                    </span>
                    <span className="text-white font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                      {" "}추첨을 통해<br />선물을 드립니다.
                    </span>
                  </div>
                </div>
              </div>
              <div className="self-stretch h-56 p-10 bg-black/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 inline-flex justify-center items-center gap-2.5 overflow-hidden">
                <div className="flex-1 justify-start text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                  스타벅스 아메리카노 Tall<br />기프티콘 증정
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-[854px] h-0 outline outline-1 outline-offset-[-0.50px] outline-white/20"></div>

            {/* Event 2 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-10">
              <div className="self-stretch flex flex-col justify-center items-center gap-10">
                <div className="px-6 py-1 bg-white/25 rounded-[32px] inline-flex justify-center items-center gap-2.5 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold" style={{ fontSize: '24px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                    Event 2
                  </div>
                </div>
                <div className="self-stretch flex flex-col justify-center items-center gap-6">
                  <div className="text-center justify-start text-neutral-100 font-bold" style={{ fontSize: '48px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px' }}>
                    특별 혜택 이벤트
                  </div>
                  <div className="text-center justify-start">
                    <span className="text-white font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                      참석자 한정{" "}
                    </span>
                    <span className="text-white font-bold" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                      특별한 혜택을 모두
                    </span>
                    <span className="text-white font-normal" style={{ fontSize: '30px', fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}>
                      {" "}드립니다!
                    </span>
                  </div>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start flex-wrap content-start">
                {/* 1달 무료 체험 */}
                <div className="w-[856px] h-56 p-10 bg-gradient-to-r from-black/5 to-black/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex justify-center items-center gap-2.5 overflow-hidden">
                  <div className="flex-1 justify-start">
                    <span className="text-white font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                      키워트 인사이트 신규회원 대상<br />
                    </span>
                    <span className="text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                      1달 무료 체험 제공
                    </span>
                  </div>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image 49.png"
                    alt="1달 무료 체험"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                {/* 특별 견적 */}
                <div className="w-[856px] h-56 p-10 bg-black/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex justify-center items-center gap-2.5 overflow-hidden">
                  <div className="flex-1 justify-start">
                    <span className="text-white font-normal" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                      웨비나 참여 후 엔터프라이즈용<br />
                    </span>
                    <span className="text-white font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '60px' }}>
                      상담 신청하면 특별 견적 제공
                    </span>
                  </div>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image 48.png"
                    alt="특별 견적"
                    className="w-36 h-48 object-contain"
                  />
                </div>
                {/* Plus Icon Circle */}
                <div className="w-16 h-16 bg-white/25 rounded-full border border-white/20 backdrop-blur-[2.75px] flex items-center justify-center">
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/icon_plus.png"
                    alt="plus"
                    className="w-7 h-7 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coffee Image - Centered */}
        <img
          className="w-32 h-56 left-[712px] top-[645px] absolute object-contain"
          src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image_2.png"
          alt="스타벅스 커피"
        />
      </section>

      {/* Section 6 - Notice & Contact */}
      <section className="w-[1000px] px-16 py-28 bg-neutral-50 inline-flex flex-col justify-start items-start gap-16 overflow-hidden">
        <div className="self-stretch flex flex-col justify-start items-start gap-10">
          <div className="self-stretch justify-start text-black/60 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '47.82px' }}>
            키워트 인사이트 유즈케이스 웨비나 주의사항
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-8">
            {/* 일반 주의사항 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-start gap-2">
                <div className="w-5 flex-shrink-0 relative">
                  <div className="w-2 h-2 left-0 top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    본 웨비나는{" "}
                  </span>
                  <span className="text-black/60 font-bold" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    무료
                  </span>
                  <span className="text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    이며,{" "}
                  </span>
                  <span className="text-black/60 font-bold" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    사전등록 하신 분
                  </span>
                  <span className="text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    에 한하여 참여 가능합니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-2">
                <div className="w-5 flex-shrink-0 relative">
                  <div className="w-2 h-2 left-0 top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    신청자에게는{" "}
                  </span>
                  <span className="text-black/60 font-bold" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    2월 4일(수) 및 2월 5일(목)에 리마인드 메일 및 문자가 발송<br />
                  </span>
                  <span className="text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                    됩니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-2">
                <div className="w-5 flex-shrink-0 relative">
                  <div className="w-2 h-2 left-0 top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                  업무용 이메일을 자성하지 않으실 경우 웨비나 참가가 제한될 수 있습니다.
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-2">
                <div className="w-5 flex-shrink-0 relative">
                  <div className="w-2 h-2 left-0 top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                  Q&A 이벤트는 중복 참여가 불가하며, 2월 13일(금)에 경품이 발송됩니다.
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-2">
                <div className="w-5 flex-shrink-0 relative">
                  <div className="w-2 h-2 left-0 top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                  잘못된 개인정보 입려으로 경품을 못받으실 경우 당사는 책임지지 않습니다.
                </div>
              </div>
            </div>
            {/* 중요 주의사항 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-start gap-3">
                <div className="w-[24px] h-[24px] flex-shrink-0 flex items-start pt-2">
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/notice.png"
                    alt="주의"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 justify-start text-orange-600 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                  본 웨비나는 라이브로 진행되며 녹화본은 별도 제공하지 않습니다.
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-3">
                <div className="w-[24px] h-[24px] flex-shrink-0 flex items-start pt-2">
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/notice.png"
                    alt="주의"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 justify-start text-orange-600 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                  마케팅 활용 정보 동의를 거부한 경우, 웨비나 시청 및 콘텐츠 수신 등이<br />제한됩니다.
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-3">
                <div className="w-[24px] h-[24px] flex-shrink-0 flex items-start pt-2">
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/notice.png"
                    alt="주의"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 justify-start text-orange-600 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                  본 웨비나는 관련 종사자 우선이며, 비관련 분야는 참석이 제한될 수 있습니다.
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 문의 사항 */}
        <div className="self-stretch flex flex-col justify-start items-start gap-10">
          <div className="self-stretch justify-start text-black/60 font-bold" style={{ fontSize: '36px', fontFamily: 'Pretendard, sans-serif', lineHeight: '47.82px' }}>
            문의 사항
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-4">
            <div className="self-stretch inline-flex justify-start items-start gap-2">
              <div className="w-5 flex-shrink-0 relative">
                <div className="w-2 h-2 left-0 top-[14px] absolute bg-black/60 rounded-full"></div>
              </div>
              <div className="flex-1 justify-start text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                웨비나와 관련된 문의사항이 있으시면 아래 연락처를 통해 문의주시기 바랍니다.
              </div>
            </div>
            <div className="self-stretch inline-flex justify-start items-start gap-2">
              <div className="w-5 flex-shrink-0 relative">
                <div className="w-2 h-2 left-0 top-[14px] absolute bg-black/60 rounded-full"></div>
              </div>
              <div className="flex-1 justify-start text-black/60 font-normal" style={{ fontSize: '27px', fontFamily: 'Pretendard, sans-serif', lineHeight: '40px', letterSpacing: '-0.4px' }}>
                메일문의 crm@wert.co.kr
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-[1000px] h-24 bg-neutral-800 flex items-center justify-center">
        <img
          src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo-w.png"
          alt="wert intelligence"
          className="h-6 object-contain"
        />
      </footer>
      </div>
    </div>
  );
}
