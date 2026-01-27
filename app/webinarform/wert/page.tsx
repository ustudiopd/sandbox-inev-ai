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
    value: "2026년 2월 6일(금) 오후 2시 - 3시 30분",
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
    duration: "약 15분",
    title: "키워트 인사이트 소개",
    titleMobile: "키워트 인사이트 소개",
    bullets: [
      "AI 특허리서치 '키워트 인사이트' 특징",
      "특허 특화 AI '플루토LM'의 차별점",
    ],
    speaker: {
      name: "조경식 이사",
      role: "워트인텔리전스\n그로스실",
      avatar: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/jo2.png",
    },
  },
  {
    label: "SESSION 2",
    duration: "약 30분",
    title: "고객사례로 알아보는 AI 특허리서치 활용법",
    titleMobile: "고객사례로 알아보는\nAI 특허리서치 활용법",
    bullets: [
      "IP·R&D·특허사무소별 키워트 인사이트 활용사례",
      "조직 간 커뮤니케이션 및 의사결정 개선 사례",
    ],
    speaker: {
      name: "조은비 책임",
      role: "워트인텔리전스\n그로스실",
      avatar: "https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/jo.png",
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
    <div className="w-full relative mx-auto overflow-x-hidden">
      <div className="relative overflow-x-hidden overflow-y-hidden">
        {/* Mobile Carousel */}
        <div
          className="flex lg:hidden transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(calc(-${currentIndex} * 100%))`
          }}
        >
          {organizationCards.map((card, index) => (
            <div
              key={index}
              className="w-full min-w-full mr-0 h-auto p-6 bg-stone-50 rounded-2xl shadow-[0px_4px_48px_-10px_rgba(0,0,0,0.08)] flex flex-col justify-start items-start gap-2.5 overflow-x-hidden overflow-y-hidden flex-shrink-0"
            >
              <div className="self-stretch flex-1 flex flex-col justify-start items-start overflow-x-hidden overflow-y-hidden gap-4">
                <div className="self-stretch flex flex-col justify-start items-start gap-3">
                  <div className="self-stretch justify-start text-teal-600 font-bold text-2xl" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {card.title}
                  </div>
                  <div className="self-stretch justify-start text-black/90 font-normal text-base leading-relaxed" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    <span dangerouslySetInnerHTML={{ __html: card.description.replace(/<br\s*\/?>/gi, '<span class="sm:hidden"> </span><span class="hidden sm:inline"><br /></span>') }} />
                  </div>
                </div>
                {card.image ? (
                  <div className={`self-stretch overflow-x-hidden flex justify-center items-center mt-2`}>
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      className="max-w-full h-auto max-h-[300px] object-contain rounded-lg"
                    />
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
        {/* Desktop Carousel */}
        <div
          className="hidden lg:flex transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(calc(50% - 428px - ${currentIndex} * (856px + 2rem)))`
          }}
        >
          {organizationCards.map((card, index) => (
            <div
              key={index}
              className="w-[856px] min-w-[856px] mr-8 h-[820px] p-16 bg-stone-50 rounded-[48px] shadow-[0px_4px_48px_-10px_rgba(0,0,0,0.08)] flex flex-col justify-start items-start gap-2.5 overflow-x-hidden overflow-y-hidden flex-shrink-0"
            >
              <div className="self-stretch flex-1 flex flex-col justify-between items-start overflow-x-hidden overflow-y-hidden gap-6">
                <div className="self-stretch flex flex-col justify-start items-start gap-4">
                  <div className="self-stretch justify-start text-teal-600 font-bold text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {card.title}
                  </div>
                  <div className="self-stretch justify-start text-black/90 font-normal text-[24px] leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    <span dangerouslySetInnerHTML={{ __html: card.description }} />
                  </div>
                </div>
                {card.image ? (
                  <div className={`self-stretch overflow-x-hidden flex justify-center items-center`}>
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      className="max-w-full h-full object-contain rounded-lg"
                    />
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
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-full max-w-[856px] flex justify-between px-2 sm:px-4 pointer-events-none z-20">
        <button
          onClick={goToPrev}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center pointer-events-auto hover:bg-white transition-colors"
          aria-label="이전 카드"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goToNext}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center pointer-events-auto hover:bg-white transition-colors"
          aria-label="다음 카드"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function WebinarFormWertPage() {
  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      <div
        className="mx-auto flex flex-col items-start w-full max-w-[1000px] px-4 sm:px-6 lg:px-0"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
      {/* Hero Section */}
      <section 
        className="w-screen relative overflow-hidden" 
        style={{ 
          fontFamily: 'Pretendard, sans-serif', 
          minHeight: 'auto',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw',
          backgroundImage: 'url(https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/bg2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'local'
        }}
      >

        {/* Header with Logo */}
        <div className="w-full h-14 lg:h-28 left-0 top-0 absolute bg-white/60 backdrop-blur-[2px] overflow-hidden flex items-center justify-center px-4 z-10">
          <div className="w-40 sm:w-56 lg:w-80 h-5 sm:h-7 lg:h-10 overflow-hidden">
            <Image
              src="/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png"
              alt="keywert Insight"
              width={320}
              height={40}
              className="w-full h-full object-contain"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="w-full h-32 sm:h-48 lg:h-72 left-0 bottom-0 absolute bg-gradient-to-b from-white/0 to-white z-0" />

        {/* Content Area */}
        <div className="w-full px-4 sm:px-6 lg:px-[72px] pt-20 sm:pt-[150px] lg:pt-[150px] pb-6 sm:pb-8 lg:pb-20 relative inline-flex flex-col justify-start items-center gap-4 sm:gap-8 lg:gap-20 z-10">
          <div className="self-stretch flex flex-col justify-start items-center gap-4 sm:gap-8 lg:gap-16">
            <div className="w-full max-w-[623px] flex flex-col justify-start items-center gap-3 sm:gap-5 lg:gap-10">
              {/* IP Insight ON 이미지 */}
              <div className="flex justify-center items-center" style={{ marginTop: '24px', marginBottom: '24px' }}>
                <Image
                  src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/ip_insight_on.png"
                  alt="IP Insight ON"
                  width={204}
                  height={60}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="self-stretch flex flex-col justify-start items-center gap-1 sm:gap-4 lg:gap-2">
                <div className="self-stretch text-center justify-start text-black/80 font-bold text-base sm:text-lg lg:text-[32px] leading-relaxed sm:leading-relaxed lg:leading-[48px]" style={{ fontFamily: 'Pretendard, sans-serif', marginBottom: '16px' }}>
                  고객사례로 알아보는
                </div>
                <div className="self-stretch text-center justify-start text-black font-bold text-4xl sm:text-3xl lg:text-[96px] leading-tight sm:leading-tight lg:leading-[117.60px]" style={{ fontFamily: 'Pretendard, sans-serif', marginBottom: '8px' }}>
                  AI 특허리서치<br /><span className="whitespace-nowrap">실무 활용 웨비나</span>
                </div>
              </div>
              <div className="inline-flex justify-start items-center gap-2 flex-wrap" style={{ marginTop: '8px', marginBottom: '8px' }}>
                <div className="px-2.5 sm:px-4 lg:px-6 py-[0.8rem] bg-black rounded-lg sm:rounded-xl lg:rounded-2xl flex justify-center items-center gap-2 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold text-xs sm:text-base lg:text-[36px] leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    2026. 02. 06{" "}
                  </div>
                </div>
                <div className="px-2.5 sm:px-4 lg:px-6 py-[0.8rem] bg-black rounded-lg sm:rounded-xl lg:rounded-2xl flex justify-center items-center gap-2 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold text-xs sm:text-base lg:text-[36px] leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    14:00
                  </div>
                </div>
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-2 sm:gap-4 lg:gap-8" style={{ marginTop: '8px' }}>
              <div className="self-stretch text-center justify-start text-black font-bold text-base sm:text-base lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                IP팀·특허사무소·R&D팀의<br />키워트 인사이트 활용 방식이 궁금하다면,
              </div>
              <div className="self-stretch text-center justify-start text-black font-bold text-base sm:text-base lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                2월 6일 웨비나에서 직접 확인하세요.
              </div>
            </div>
          </div>
          <div className="w-full max-w-[384px] flex flex-col justify-start items-center sm:items-start gap-2.5 sm:gap-4 lg:gap-8">
            <Link
              href="/event/149403/register"
              className="w-auto sm:self-stretch px-4 sm:px-8 lg:pl-16 lg:pr-10 py-2.5 sm:py-3 lg:py-6 bg-[#00A08C] rounded-full lg:rounded-[200px] inline-flex justify-center items-center gap-2 sm:gap-3 lg:gap-6 overflow-hidden min-h-[44px] sm:min-h-[48px]"
            >
              <div className="text-center justify-start text-white font-bold text-sm sm:text-lg lg:text-[36px] leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                웨비나 등록하기
              </div>
              <Image
                src="/storage/v1/object/public/webinar-thumbnails/wert/symbol1.png"
                alt=""
                width={14}
                height={20}
                className="w-2.5 h-3.5 sm:w-3.5 sm:h-5 object-contain"
                unoptimized
              />
            </Link>
            <Link
              href="/webinar/149402"
              className="w-auto sm:self-stretch px-4 sm:px-8 lg:pl-16 lg:pr-10 py-2.5 sm:py-3 lg:py-6 bg-[#000000] rounded-full lg:rounded-[200px] inline-flex justify-center items-center gap-2 sm:gap-3 lg:gap-6 overflow-hidden min-h-[44px] sm:min-h-[48px]"
            >
              <div className="text-center justify-start text-[#ffffff] font-bold text-sm sm:text-lg lg:text-[36px] leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                웨비나 시청하기
              </div>
              <Image
                src="/storage/v1/object/public/webinar-thumbnails/wert/symbol1.png"
                alt=""
                width={14}
                height={20}
                className="w-2.5 h-3.5 sm:w-3.5 sm:h-5 object-contain brightness-[10]"
                unoptimized
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 - Question & Webinar Points */}
      <section className="w-full relative bg-white overflow-hidden py-8 sm:py-12 lg:py-20">
        <div className="w-full max-w-[858px] mx-auto px-4 sm:px-6 lg:px-[72px] flex flex-col justify-start items-start gap-8 sm:gap-12 lg:gap-20">
          <div className="self-stretch flex flex-col justify-start items-center gap-3.5">
            <div className="w-24 h-24 relative flex items-center justify-center">
              <div className="w-[103px] h-[90px]">
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
            <div className="self-stretch flex flex-col justify-start items-center gap-4 sm:gap-6 lg:gap-12">
              <div className="text-center justify-start text-teal-600 font-bold text-lg sm:text-2xl lg:text-[48px] leading-tight sm:leading-tight lg:leading-[72px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                "AI 특허리서치가 과연 우리 조직에<br />실질적인 도움이 될까?"
              </div>
              <div className="self-stretch text-center justify-start text-[15px] sm:text-base lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[60px]">
                <span className="text-black/80 font-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  AI 특허리서치 활용을 고민하고 있지만<span className="hidden sm:inline"><br /></span>이 질문이 남아 있다면,<span className="hidden sm:inline"><br /></span>{" "}
                </span>
                <span className="text-black/80 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  이번 웨비나
                </span>
                <span className="text-black/80 font-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  가{" "}
                </span>
                <span className="text-black/80 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  그 해답을 찾는 시간
                </span>
                <span className="text-black/80 font-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  이 될 것입니다.
                </span>
              </div>
            </div>
          </div>
          <div className="self-stretch h-0.5 bg-black/5"></div>
          <div className="self-stretch flex flex-col justify-start items-center gap-6 sm:gap-10 lg:gap-16">
            <div className="self-stretch flex flex-col justify-start items-center gap-2 sm:gap-3">
              <div className="self-stretch text-center justify-start text-teal-600 font-bold text-sm sm:text-base lg:text-[24px] leading-tight sm:leading-tight lg:leading-[40px]" style={{ fontFamily: 'Figtree, sans-serif' }}>
                IN THE WEBINAR
              </div>
              <div className="self-stretch text-center justify-start text-black/80 font-bold text-xl sm:text-xl lg:text-[38px] leading-tight sm:leading-tight lg:leading-[57px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                이번 웨비나에서는
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-3 sm:gap-4">
              <div className="self-stretch p-4 sm:p-8 lg:p-16 bg-black rounded-xl sm:rounded-2xl lg:rounded-[40px] outline outline-1 outline-black/10 flex flex-col justify-center items-center gap-4 sm:gap-8 lg:gap-16">
                <div className="self-stretch justify-start">
                  <span className="font-normal text-lg sm:text-2xl lg:text-[36px] leading-tight sm:leading-tight lg:leading-[54px]" style={{ fontFamily: 'Pretendard, sans-serif', background: 'linear-gradient(to right, #88EDE7, #DCFFBC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    WEBINAR
                  </span>
                  <span className="font-bold text-lg sm:text-2xl lg:text-[36px] leading-tight sm:leading-tight lg:leading-[54px]" style={{ fontFamily: 'Pretendard, sans-serif', background: 'linear-gradient(to right, #88EDE7, #DCFFBC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {" "}POINT 1
                  </span>
                </div>
                <div className="self-stretch justify-start text-xs sm:text-base lg:text-[28px] leading-relaxed sm:leading-relaxed lg:leading-[42px]">
                  <span className="text-white/90 font-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    기업의 IP팀, 특허사무소, R&D팀 등<span className="hidden sm:inline"> </span>
                  </span>
                  <span className="text-white font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    서로 다른 조직이<span className="hidden sm:inline"><br /></span>{" "}
                  </span>
                  <span className="text-white/90 font-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    키워트 인사이트를 실제 업무에<span className="hidden sm:inline"> </span>
                  </span>
                  <span className="text-white font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    어떻게 적용하고 있는<span className="hidden sm:inline"><br /></span>{" "}
                  </span>
                  <span className="text-white font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    지<span className="hidden sm:inline"> </span>
                  </span>
                  <span className="text-white/90 font-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    고객사례를 통해 살펴봅니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch p-4 sm:p-8 lg:p-16 bg-black rounded-xl sm:rounded-2xl lg:rounded-[40px] outline outline-1 outline-black/10 flex flex-col justify-center items-center gap-4 sm:gap-8 lg:gap-16">
                <div className="self-stretch justify-start">
                  <span className="font-normal text-lg sm:text-2xl lg:text-[36px] leading-tight sm:leading-tight lg:leading-[54px]" style={{ fontFamily: 'Pretendard, sans-serif', background: 'linear-gradient(to right, #88EDE7, #DCFFBC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    WEBINAR
                  </span>
                  <span className="font-bold text-lg sm:text-2xl lg:text-[36px] leading-tight sm:leading-tight lg:leading-[54px]" style={{ fontFamily: 'Pretendard, sans-serif', background: 'linear-gradient(to right, #88EDE7, #DCFFBC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {" "}POINT 2
                  </span>
                </div>
                <div className="self-stretch justify-start text-xs sm:text-base lg:text-[28px] leading-relaxed sm:leading-relaxed lg:leading-[42px]">
                  <span className="text-white font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    키워트 인사이트를 활용함
                  </span>
                  <span className="text-white/90 font-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    으로써 다른 언어를<span className="hidden sm:inline"><br /></span>사용하는 부서의<span className="hidden sm:inline"> </span>
                  </span>
                  <span className="text-white font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    워크플로우와 커뮤니케이션 방식이 어떻게 개선될 수 있는지도 함께 공유합니다.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Overview, Audience, Agenda & Speaker */}
      <section 
        className="w-screen relative bg-gradient-to-b from-emerald-900 to-black overflow-hidden pt-4 pb-8 sm:py-12 lg:py-20" 
        style={{ 
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw'
        }}
      >
        {/* OVERVIEW Section */}
        <div className="w-full max-w-[856px] mx-auto px-4 sm:px-6 lg:px-[72px] flex flex-col justify-start items-start gap-1 sm:gap-10 lg:gap-16">
          <div className="self-stretch flex flex-col justify-center items-center gap-2 sm:gap-3">
            <div className="text-center justify-start text-green-200 font-bold text-sm sm:text-lg lg:text-[24px] leading-tight sm:leading-tight lg:leading-[32px]" style={{ fontFamily: 'Figtree, sans-serif' }}>
              OVERVIEW
            </div>
            <div className="text-center justify-start text-white font-bold text-xl sm:text-2xl lg:text-[38px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              행사 개요
            </div>
          </div>
          {/* 모바일/태블릿용 - 일시만 표시 */}
          <div className="self-stretch lg:hidden pl-3 sm:pl-5 pr-3 sm:pr-6 py-3 sm:py-4 bg-white/10 rounded-lg sm:rounded-xl outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-2 sm:gap-3 overflow-hidden">
            <div className="text-white font-bold text-xs sm:text-sm leading-tight whitespace-pre flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif', textAlign: 'left' }}>
              일     시
            </div>
            <div className="w-0.5 h-4 sm:h-5 bg-white/20 flex-shrink-0"></div>
            <div className="text-white font-bold text-xs sm:text-sm leading-tight sm:leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              2026년 2월 6일(금) 오후 2시-3시 30분
            </div>
          </div>
          {/* 모바일용 장소, 참가비 */}
          <div className="self-stretch sm:hidden flex flex-col justify-start items-start gap-1">
            <div className="self-stretch pl-3 pr-3 py-3 bg-white/10 rounded-lg outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-2 overflow-hidden">
              <div className="text-white font-bold text-xs leading-tight whitespace-pre flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif', textAlign: 'left' }}>
                장     소
              </div>
              <div className="w-0.5 h-4 bg-white/20 flex-shrink-0"></div>
              <div className="text-white font-bold text-xs leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                온라인 LIVE
              </div>
            </div>
            <div className="self-stretch pl-3 pr-3 py-3 bg-white/10 rounded-lg outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-2 overflow-hidden">
              <div className="text-white font-bold text-xs leading-tight whitespace-pre flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif', textAlign: 'left' }}>
                참 가 비
              </div>
              <div className="w-0.5 h-4 bg-white/20 flex-shrink-0"></div>
              <div className="text-white font-bold text-xs leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                무료
              </div>
            </div>
          </div>
          {/* 태블릿용 - 일시, 장소 */}
          <div className="hidden sm:flex lg:hidden self-stretch pl-5 pr-6 py-4 bg-white/10 rounded-xl outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-3 overflow-hidden">
            <div className="text-white font-bold text-sm leading-tight whitespace-pre flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif', width: '40px', textAlign: 'right' }}>
              장 소
            </div>
            <div className="w-0.5 h-5 bg-white/20 flex-shrink-0"></div>
            <div className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              온라인 LIVE
            </div>
          </div>
          {/* PC용 - 각 항목을 한 줄씩 표시 */}
          <div className="hidden lg:flex self-stretch flex-col justify-start items-start gap-2.5">
            <div className="self-stretch pl-6 pr-8 py-6 bg-white/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-6 overflow-hidden">
              <div className="text-white font-bold text-[20px] leading-tight whitespace-pre flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif', width: '80px', textAlign: 'right' }}>
                일      시
              </div>
              <div className="w-0.5 h-5 bg-white/20 flex-shrink-0"></div>
              <div className="text-white font-bold text-[30px] leading-[40px] whitespace-nowrap" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                2026년 2월 6일(금) 오후 2시-3시 30분
              </div>
            </div>
            <div className="self-stretch pl-6 pr-8 py-6 bg-white/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-6 overflow-hidden">
              <div className="text-white font-bold text-[20px] leading-tight whitespace-pre flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif', width: '80px', textAlign: 'right' }}>
                장      소
              </div>
              <div className="w-0.5 h-5 bg-white/20 flex-shrink-0"></div>
              <div className="text-white font-bold text-[30px] leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                온라인 LIVE
              </div>
            </div>
            <div className="self-stretch pl-6 pr-8 py-6 bg-white/10 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-6 overflow-hidden">
              <div className="text-white font-bold text-[20px] leading-tight whitespace-pre flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif', width: '80px', textAlign: 'right' }}>
                참 가 비
              </div>
              <div className="w-0.5 h-5 bg-white/20 flex-shrink-0"></div>
              <div className="text-white font-bold text-[30px] leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                무료
              </div>
            </div>
          </div>
        </div>

        {/* AUDIENCE Section */}
        <div className="w-full max-w-[856px] mx-auto px-4 sm:px-6 lg:px-[72px] mt-6 sm:mt-10 lg:mt-20 flex flex-col justify-start items-start gap-6 sm:gap-10 lg:gap-16">
          <div className="self-stretch flex flex-col justify-center items-center gap-2 sm:gap-3">
            <div className="text-center justify-start text-green-200 font-bold text-sm sm:text-lg lg:text-[24px] leading-tight sm:leading-tight lg:leading-[32px]" style={{ fontFamily: 'Figtree, sans-serif' }}>
              AUDIENCE
            </div>
            <div className="text-center justify-start text-white font-bold text-xl sm:text-2xl lg:text-[38px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              참석 대상
            </div>
          </div>
          <div className="self-stretch p-4 sm:p-8 lg:p-16 bg-white/10 rounded-xl sm:rounded-2xl lg:rounded-[48px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-col justify-start items-start gap-3 sm:gap-5 lg:gap-8 overflow-hidden">
            <div className="self-stretch inline-flex justify-start items-center gap-4 sm:gap-6">
              <div className="flex-1 justify-start">
                <span className="text-white/80 font-normal text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  특허 리서치·분석 업무를 효율화하고 싶은<br />
                </span>
                <span className="text-green-200 font-bold text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  IP 담당자 및 특허사무소
                </span>
              </div>
            </div>
            <div className="self-stretch h-px bg-white/20"></div>
            <div className="self-stretch inline-flex justify-start items-center gap-4 sm:gap-6">
              <div className="flex-1 justify-start">
                <span className="text-white/80 font-normal text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  연구 초기부터 특허 리스크를 줄이고 싶은<br />
                </span>
                <span className="text-green-200 font-bold text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  R&D 연구원
                </span>
              </div>
            </div>
            <div className="self-stretch h-px bg-white/20"></div>
            <div className="self-stretch inline-flex justify-start items-center gap-4 sm:gap-6">
              <div className="flex-1 justify-start">
                <span className="text-white/80 font-normal text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  IP 및 R&D 조직 내 협업과 의사결정을<br />
                </span>
                <span className="text-green-200 font-bold text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  빠르게 만들고 싶은 담당자
                </span>
              </div>
            </div>
            <div className="self-stretch h-px bg-white/20"></div>
            <div className="self-stretch inline-flex justify-start items-center gap-4 sm:gap-6">
              <div className="flex-1 justify-start text-green-200 font-bold text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                키워트 인사이트 도입을 고민 중인 담당자
              </div>
            </div>
          </div>
        </div>

        {/* AGENDA & SPEAKER Section */}
        <div className="w-full max-w-[856px] mx-auto px-4 sm:px-6 lg:px-[72px] mt-6 sm:mt-10 lg:mt-20 flex flex-col justify-start items-start gap-8 sm:gap-12 lg:gap-16">
          <div className="self-stretch flex flex-col justify-start items-center gap-2 sm:gap-3">
            <div className="self-stretch text-center justify-start text-green-200 font-bold text-sm sm:text-lg lg:text-[24px] leading-tight sm:leading-tight lg:leading-[32px]" style={{ fontFamily: 'Figtree, sans-serif' }}>
              AGENDA & SPEAKER
            </div>
            <div className="self-stretch text-center justify-start text-white font-bold text-xl sm:text-xl lg:text-[38px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              세션 소개 및 발표연사
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-3 sm:gap-5 lg:gap-6">
            {sessions.map((session, index) => (
              <div
                key={session.label}
                className="self-stretch p-6 sm:p-10 lg:p-16 bg-white/10 rounded-2xl sm:rounded-3xl lg:rounded-[48px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-col justify-start items-start gap-6 sm:gap-10 lg:gap-12 overflow-hidden"
              >
                <div className="self-stretch flex flex-col justify-start items-start gap-6 sm:gap-8 lg:gap-10">
                  <div className="inline-flex justify-start items-center gap-2 flex-wrap">
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-500 rounded-lg flex justify-center items-center gap-2.5 overflow-hidden">
                      <div className="justify-start text-white font-bold text-base sm:text-lg lg:text-[24px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        {session.label}
                      </div>
                    </div>
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-500/10 rounded-lg flex justify-center items-center gap-2.5 overflow-hidden">
                      <div className="justify-start text-teal-500 font-bold text-base sm:text-lg lg:text-[24px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        {session.duration}
                      </div>
                    </div>
                  </div>
                  <div className="self-stretch flex flex-col justify-start items-start gap-6 sm:gap-8 lg:gap-10">
                    <div className={`self-stretch justify-start text-white font-bold ${
                      ['SESSION 1', 'SESSION 2'].includes(session.label)
                        ? 'text-lg sm:text-2xl lg:text-3xl leading-[28px] sm:leading-[40px] lg:leading-[48px]'
                        : 'text-base sm:text-lg lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[48px]'
                    }`} style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      <span className="sm:hidden">{(session as any).titleMobile ? (session as any).titleMobile.split('\n').map((line: string, idx: number) => (
                        <span key={idx}>
                          {line}
                          {idx < (session as any).titleMobile.split('\n').length - 1 && <br />}
                        </span>
                      )) : session.title}</span>
                      <span className="hidden sm:inline">{session.title}</span>
                    </div>
                    <div className="self-stretch flex flex-col justify-start items-start gap-0.5 sm:gap-1 lg:gap-2">
                      {session.bullets.map((bullet, bulletIndex) => {
                        const isMultiLine = bullet.includes('\n');
                        const isMobileSingleLine = index === 1 && bulletIndex === 2; // SESSION 2의 세 번째 bullet
                        const isSession4MobileBreak = index === 3 && bulletIndex === 0; // SESSION 4의 첫 번째 bullet - 모바일에서 줄바꿈
                        const parts = bullet.split('\n');
                        const isSession1 = session.label === 'SESSION 1';
                        const isSession2 = session.label === 'SESSION 2';
                        return (
                          <div
                            key={bulletIndex}
                            className={isMultiLine && !isMobileSingleLine ? 'self-stretch flex flex-col justify-center items-start' : index === 0 && bulletIndex === 0 ? 'self-stretch inline-flex justify-start items-start sm:items-center gap-2 sm:gap-3 lg:gap-4' : isSession4MobileBreak ? 'inline-flex justify-start items-start sm:items-center gap-2 sm:gap-3 lg:gap-4' : 'inline-flex justify-start items-start sm:items-center gap-2 sm:gap-3 lg:gap-4'}
                          >
                            {isMultiLine && !isMobileSingleLine ? (
                              <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
                                {parts.map((part, partIndex) => (
                                  <div key={partIndex} className="self-stretch inline-flex justify-start items-start sm:items-center gap-2 sm:gap-3 lg:gap-4">
                                    {partIndex === 0 && (
                                      <div className={`relative flex-shrink-0 flex items-center justify-center ${
                                        ['SESSION 1', 'SESSION 2'].includes(session.label)
                                          ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5' 
                                          : 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6'
                                      }`}>
                                        <Image
                                          src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/check_icon.png"
                                          alt="check"
                                          width={40}
                                          height={40}
                                          className="w-full h-full object-contain translate-y-[2px] sm:translate-y-0"
                                          quality={100}
                                        />
                                      </div>
                                    )}
                                    {partIndex > 0 && <div className={`relative ${
                                      ['SESSION 1', 'SESSION 2'].includes(session.label)
                                        ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5' 
                                        : 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6'
                                    }`}></div>}
                                    <div className={`flex-1 justify-start text-white/80 font-normal flex items-start sm:items-center ${
                                      ['SESSION 1', 'SESSION 2'].includes(session.label)
                                        ? 'text-sm sm:text-xl lg:text-2xl'
                                        : 'text-sm sm:text-base lg:text-[24px]'
                                    } leading-relaxed sm:leading-relaxed lg:leading-normal`} style={{ fontFamily: 'Pretendard, sans-serif' }}>
                                      {part}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div className={`relative flex-shrink-0 flex items-center justify-center ${
                                  ['SESSION 1', 'SESSION 2'].includes(session.label)
                                    ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5' 
                                    : 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6'
                                }`}>
                                  <Image
                                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/check_icon.png"
                                    alt="check"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-contain translate-y-[2px] sm:translate-y-0"
                                    quality={100}
                                  />
                                </div>
                                <div className={`justify-start text-white/80 font-normal flex items-start sm:items-center ${
                                  ['SESSION 1', 'SESSION 2'].includes(session.label)
                                    ? 'text-sm sm:text-xl lg:text-2xl'
                                    : 'text-sm sm:text-base lg:text-[24px]'
                                } leading-relaxed sm:leading-relaxed lg:leading-normal`} style={{ fontFamily: 'Pretendard, sans-serif' }}>
                                  {isMobileSingleLine ? (
                                    <>
                                      <span className="sm:hidden">{bullet.replace(/\n/g, ' ')}</span>
                                      <span className="hidden sm:inline whitespace-pre-line">{bullet}</span>
                                    </>
                                  ) : isSession4MobileBreak ? (
                                    <>
                                      <span className="sm:hidden whitespace-pre-line">좋은 질문을 해주신 분들 중 추첨으로{'\n'}선물을 드립니다.</span>
                                      <span className="hidden sm:inline">{bullet}</span>
                                    </>
                                  ) : (
                                    bullet
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {session.note && (
                        <div className="self-stretch inline-flex justify-start items-center gap-2 sm:gap-4 mt-1 sm:-mt-2">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 relative"></div>
                          <div className="flex-1 justify-start text-white/40 font-normal text-xs sm:text-sm lg:text-[18px] leading-relaxed sm:leading-relaxed lg:leading-[20px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
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
                    <div className="inline-flex flex-row justify-start items-center gap-3 sm:gap-8 lg:gap-12">
                      <div className="w-24 h-20 sm:w-40 sm:h-36 lg:w-56 lg:h-48 relative flex-shrink-0">
                        <Image
                          src={session.speaker.avatar}
                          alt={session.speaker.name}
                          width={224}
                          height={192}
                          className="w-full h-full object-contain"
                          quality={100}
                        />
                      </div>
                      <div className="flex-1 sm:w-64 inline-flex flex-col justify-start items-start gap-1.5 sm:gap-3 lg:gap-4">
                        <div className={`justify-start text-white/80 font-normal whitespace-pre-line ${['SESSION 1', 'SESSION 2'].includes(session.label) ? 'text-sm sm:text-xl lg:text-2xl leading-[20px] sm:leading-[32px] lg:leading-9' : 'text-sm sm:text-base lg:text-[24px] leading-relaxed sm:leading-relaxed lg:leading-[36px]'}`} style={{ fontFamily: 'Pretendard, sans-serif' }}>
                          {session.speaker.role}
                        </div>
                        <div className={`self-stretch justify-start text-white font-bold ${['SESSION 1', 'SESSION 2'].includes(session.label) ? 'text-base sm:text-2xl lg:text-3xl leading-[20px] sm:leading-[28px] lg:leading-6' : 'text-base sm:text-xl lg:text-[30px] leading-tight sm:leading-tight lg:leading-[24px]'}`} style={{ fontFamily: 'Pretendard, sans-serif' }}>
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
      <section 
        className="w-screen relative bg-lime-50 overflow-x-hidden overflow-y-visible py-8 sm:py-12 lg:py-20"
        style={{ 
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw'
        }}
      >
        {/* About keywert Insight Section */}
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-start items-start gap-8 sm:gap-12 lg:gap-24">
          <div className="self-stretch flex flex-col justify-center items-center gap-2 sm:gap-3">
            <div className="text-center justify-start text-teal-600 font-bold text-sm sm:text-lg lg:text-[24px] leading-tight sm:leading-tight lg:leading-[32px]" style={{ fontFamily: 'Figtree, sans-serif' }}>
              ABOUT keywert Insight
            </div>
            <div className="text-center justify-start text-black/80 font-bold text-xl sm:text-2xl lg:text-[38px] leading-tight sm:leading-tight lg:leading-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              AI 특허리서치<br />'키워트 인사이트'
            </div>
          </div>
          <div className="self-stretch max-w-[856px] mx-auto w-full p-4 sm:p-8 lg:p-16 bg-stone-50 rounded-2xl sm:rounded-3xl lg:rounded-[48px] shadow-[0px_4px_48px_-10px_rgba(0,0,0,0.08)] flex flex-col justify-start items-start gap-8 sm:gap-12 lg:gap-16 overflow-hidden">
            <div className="self-stretch flex flex-col justify-start items-center gap-16">
              <div className="self-stretch flex flex-col justify-start items-start gap-6">
                <div className="w-40 sm:w-56 lg:w-80 h-5 sm:h-7 lg:h-10 relative overflow-hidden">
                  <Image
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png"
                    alt="keywert Insight"
                    width={320}
                    height={40}
                    className="w-full h-full object-contain"
                    quality={100}
                  />
                </div>
                <div className="self-stretch justify-start text-xl sm:text-2xl lg:text-[34px] leading-tight sm:leading-tight lg:leading-normal" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  <span className="text-black/80 font-normal">
                    대규모 특허 데이터를 학습한{" "}
                  </span>
                  <span className="text-black/80 font-bold">
                    특허AI
                  </span>
                  <span className="text-black/80 font-normal">
                    로 할루시네이션 없이{" "}
                  </span>
                  <span className="text-black/80 font-bold">
                    특허검색부터 R&D 전략
                  </span>
                  <span className="text-black/80 font-normal">
                    까지 제공하는<span className="hidden lg:inline"><br /></span> 서비스입니다.
                  </span>
                </div>
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-3 sm:gap-4 lg:gap-6">
              <div className="self-stretch inline-flex flex-row justify-between items-center gap-2 sm:gap-0">
                <div className="text-left justify-start text-black/80 font-semibold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  특허 문헌
                </div>
                <div className="text-right justify-start">
                  <span className="text-teal-600 font-bold text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    1.7
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    건
                  </span>
                </div>
              </div>
              <div className="self-stretch h-0.5 bg-black/10"></div>
              <div className="self-stretch inline-flex flex-row justify-between items-center gap-2 sm:gap-0">
                <div className="text-left justify-start text-black/80 font-semibold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  특허 문장
                </div>
                <div className="text-right justify-start">
                  <span className="text-teal-600 font-bold text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    2,500
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    개
                  </span>
                </div>
              </div>
              <div className="self-stretch h-0.5 bg-black/10"></div>
              <div className="self-stretch inline-flex flex-row justify-between items-center gap-2 sm:gap-0">
                <div className="text-left justify-start text-black/80 font-semibold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  특허 도면
                </div>
                <div className="text-right justify-start">
                  <span className="text-teal-600 font-bold text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    16
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    장
                  </span>
                </div>
              </div>
              <div className="self-stretch h-0.5 bg-black/10"></div>
              <div className="self-stretch inline-flex flex-row justify-between items-center gap-2 sm:gap-0">
                <div className="text-left justify-start text-black/80 font-semibold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  가공 데이터
                </div>
                <div className="text-right justify-start">
                  <span className="text-teal-600 font-bold text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    1.5
                  </span>
                  <span className="text-teal-600 font-bold tracking-wider text-2xl sm:text-3xl lg:text-[60px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    억
                  </span>
                  <span className="text-teal-600 font-bold text-base sm:text-xl lg:text-[36px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    건
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="w-full max-w-[856px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 lg:mt-16 text-center justify-start text-black/80 font-bold text-xl sm:text-2xl lg:text-[38px] leading-relaxed sm:leading-relaxed lg:leading-[57px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          키워트 인사이트,<br />각 조직은 이렇게 활용합니다
        </div>

        {/* Organization Cards Carousel */}
        <div className="w-full mx-auto mt-12 overflow-x-hidden">
          <OrganizationCarousel />
        </div>
      </section>

      {/* Section 5 - Event */}
      <section 
        className="w-screen relative bg-gradient-to-br from-teal-500 to-teal-800 overflow-hidden py-8 sm:py-12 lg:py-20"
        style={{ 
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw'
        }}
      >
        <div className="w-full max-w-[856px] mx-auto px-4 sm:px-6 lg:px-[72px] flex flex-col justify-start items-start gap-12 sm:gap-16 lg:gap-24">
          <div className="self-stretch flex flex-col justify-center items-center gap-3">
            <div className="text-center justify-start text-green-200 font-bold text-sm sm:text-lg lg:text-[24px] leading-tight sm:leading-tight lg:leading-[32px]" style={{ fontFamily: 'Figtree, sans-serif' }}>
              EVENT
            </div>
            <div className="text-center justify-start text-white font-bold text-xl sm:text-xl lg:text-[38px] leading-tight sm:leading-tight lg:leading-[57px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              웨비나 참여 이벤트
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-end gap-12 sm:gap-16 lg:gap-20">
            {/* Event 1 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-3 sm:gap-8 lg:gap-10">
              <div className="self-stretch flex flex-col justify-center items-center gap-4 sm:gap-8 lg:gap-10">
                <div className="px-4 sm:px-5 lg:px-6 py-0.5 sm:py-1 bg-white/25 rounded-2xl sm:rounded-3xl lg:rounded-[48px] inline-flex justify-center items-center gap-2 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold text-base sm:text-lg lg:text-[24px] leading-tight sm:leading-tight lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    Event 1
                  </div>
                </div>
                <div className="self-stretch flex flex-col justify-start items-center gap-4 sm:gap-5 lg:gap-6">
                  <div className="justify-start text-white font-bold text-xl sm:text-3xl lg:text-[48px] leading-tight sm:leading-tight lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    QnA 이벤트
                  </div>
                  <div className="text-center justify-start">
                    <span className="text-white font-normal text-base sm:text-xl lg:text-[30px] leading-relaxed sm:leading-relaxed lg:leading-[48px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      웨비나에서{" "}
                    </span>
                    <span className="text-white font-bold text-base sm:text-xl lg:text-[30px] leading-relaxed sm:leading-relaxed lg:leading-[48px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      좋은 질문을 해주신 분들 중
                    </span>
                    <span className="text-white font-normal text-base sm:text-xl lg:text-[30px] leading-relaxed sm:leading-relaxed lg:leading-[48px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      <span className="sm:hidden"><br />추첨을 통해 선물을 드립니다.</span>
                      <span className="hidden sm:inline">{" "}추첨을 통해<br />선물을 드립니다.</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="self-stretch h-[128px] sm:h-44 lg:h-56 p-4 sm:p-6 lg:p-10 bg-black/10 rounded-xl sm:rounded-2xl lg:rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-3 sm:gap-4 lg:gap-2.5 overflow-hidden">
                <div className="flex-1 justify-start text-white font-bold text-[17px] sm:text-xl lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[60px] text-left" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  스타벅스 아메리카노 Tall<br />기프티콘 증정
                </div>
                <img
                  className="w-20 h-32 sm:w-24 sm:h-40 lg:w-32 lg:h-56 object-contain flex-shrink-0"
                  src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image_2.png"
                  alt="스타벅스 커피"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-white/20"></div>

            {/* Event 2 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-6 sm:gap-8 lg:gap-10">
              <div className="self-stretch flex flex-col justify-center items-center gap-6 sm:gap-8 lg:gap-10">
                <div className="px-4 sm:px-5 lg:px-6 py-0.5 sm:py-1 bg-white/25 rounded-xl sm:rounded-2xl lg:rounded-[32px] inline-flex justify-center items-center gap-2 overflow-hidden">
                  <div className="text-center justify-start text-white font-bold text-base sm:text-lg lg:text-[24px] leading-tight sm:leading-tight lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    Event 2
                  </div>
                </div>
                <div className="self-stretch flex flex-col justify-center items-center gap-4 sm:gap-5 lg:gap-6">
                  <div className="text-center justify-start text-neutral-100 font-bold text-xl sm:text-3xl lg:text-[48px] leading-tight sm:leading-tight lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    특별 혜택 이벤트
                  </div>
                  <div className="text-center justify-start">
                    <span className="text-white font-normal text-base sm:text-xl lg:text-[30px] leading-relaxed sm:leading-relaxed lg:leading-[48px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      참석자 한정{" "}
                    </span>
                    <span className="text-white font-bold text-base sm:text-xl lg:text-[30px] leading-relaxed sm:leading-relaxed lg:leading-[48px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      특별한 혜택을 모두
                    </span>
                    <span className="text-white font-normal text-base sm:text-xl lg:text-[30px] leading-relaxed sm:leading-relaxed lg:leading-[48px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {" "}드립니다!
                    </span>
                  </div>
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start gap-3 sm:gap-5 lg:gap-6 relative">
                {/* 1달 무료 체험 */}
                <div className="self-stretch h-[128px] sm:h-40 lg:h-56 p-4 sm:p-6 lg:p-10 bg-gradient-to-r from-black/5 to-black/10 rounded-xl sm:rounded-2xl lg:rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-3 sm:gap-3 lg:gap-2.5 overflow-hidden">
                  <div className="flex-1 justify-start text-white font-bold text-[17px] sm:text-xl lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[60px] text-left" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    키워트 인사이트 신규회원 대상<br />1달 무료 체험 제공
                  </div>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image 49.png"
                    alt="1달 무료 체험"
                    className="w-16 h-16 sm:w-28 sm:h-28 lg:w-40 lg:h-40 object-contain flex-shrink-0"
                  />
                </div>
                {/* Plus Icon - 카드 사이 중앙에 배치 */}
                <div className="hidden sm:block lg:hidden absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" style={{ top: 'calc(120px + 0.625rem)' }}>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/icon_plus.png"
                    alt="plus"
                    className="w-14 h-14 object-contain flex-shrink-0"
                  />
                </div>
                <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" style={{ top: 'calc(224px + 0.75rem)' }}>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/icon_plus.png"
                    alt="plus"
                    className="w-16 h-16 object-contain flex-shrink-0"
                  />
                </div>
                <div className="sm:hidden absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" style={{ top: 'calc(120px + 0.5rem)' }}>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/icon_plus.png"
                    alt="plus"
                    className="w-12 h-12 object-contain flex-shrink-0"
                  />
                </div>
                {/* 특별 견적 */}
                <div className="self-stretch h-[128px] sm:h-40 lg:h-56 p-4 sm:p-6 lg:p-10 bg-black/10 rounded-xl sm:rounded-2xl lg:rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white/20 flex flex-row justify-start items-center gap-3 sm:gap-3 lg:gap-2.5 overflow-hidden">
                  <div className="flex-1 justify-start text-white font-bold text-[17px] sm:text-xl lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[60px] text-left" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    웨비나 참여 후 엔터프라이즈용<br />상담 신청하면 특별 견적 제공
                  </div>
                  <img
                    src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/image 48.png"
                    alt="특별 견적"
                    className="w-16 h-24 sm:w-24 sm:h-32 lg:w-36 lg:h-48 object-contain flex-shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 - Notice & Contact */}
      <section 
        className="w-screen px-4 sm:px-6 lg:px-16 py-8 sm:py-12 lg:py-28 bg-neutral-50 flex flex-col justify-start items-start gap-8 sm:gap-12 lg:gap-16 overflow-hidden"
        style={{ 
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw'
        }}
      >
        <div className="w-full max-w-[856px] mx-auto flex flex-col justify-start items-start gap-8 sm:gap-12 lg:gap-16">
        <div className="self-stretch flex flex-col justify-start items-start gap-6 sm:gap-8 lg:gap-10">
          <div className="self-stretch justify-start text-black/60 font-bold text-xl sm:text-2xl lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[47.82px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            키워트 인사이트 유즈케이스 웨비나 주의사항
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-4 sm:gap-6 lg:gap-8">
            {/* 일반 주의사항 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-1 sm:gap-6 lg:gap-8">
              <div className="self-stretch inline-flex justify-start items-start gap-0 sm:gap-2">
                <div className="w-3 sm:w-5 flex-shrink-0 relative">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 left-0 top-[11px] sm:top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    본 웨비나는{" "}
                  </span>
                  <span className="text-black/60 font-bold text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    무료
                  </span>
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    이며,{" "}
                  </span>
                  <span className="text-black/60 font-bold text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    사전등록 하신 분
                  </span>
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    에 한하여 참여 가능합니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-0 sm:gap-2">
                <div className="w-3 sm:w-5 flex-shrink-0 relative">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 left-0 top-[11px] sm:top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    신청자에게는{" "}
                  </span>
                  <span className="text-black/60 font-bold text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    2월 4일(수) 및 2월 5일(목)에 리마인드 메일 및 문자가 발송<span className="lg:hidden"> </span><span className="hidden lg:inline"> </span><span className="hidden sm:inline lg:hidden"><br /></span>
                  </span>
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    됩니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-0 sm:gap-2">
                <div className="w-3 sm:w-5 flex-shrink-0 relative">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 left-0 top-[11px] sm:top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    업무용 이메일을 자성하지 않으실 경우 웨비나 참가가 제한될 수 있습니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-0 sm:gap-2">
                <div className="w-3 sm:w-5 flex-shrink-0 relative">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 left-0 top-[11px] sm:top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    Q&A 이벤트는 중복 참여가 불가하며, 2월 13일(금)에 경품이 발송됩니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-0 sm:gap-2">
                <div className="w-3 sm:w-5 flex-shrink-0 relative">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 left-0 top-[11px] sm:top-[14px] absolute bg-black/60 rounded-full"></div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    잘못된 개인정보 입력으로 경품을 못받으실 경우 당사는 책임지지 않습니다.
                  </span>
                </div>
              </div>
            </div>
            {/* 중요 주의사항 */}
            <div className="self-stretch flex flex-col justify-start items-start gap-1 sm:gap-6 lg:gap-8">
              <div className="self-stretch inline-flex justify-start items-start gap-1.5 sm:gap-3">
                <div className="w-3 sm:w-6 flex-shrink-0 relative">
                  <div className="absolute top-[9px] left-0 sm:top-[2px] lg:top-[8px]">
                    <img
                      src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/notice.png"
                      alt="주의"
                      className="w-3 h-3 sm:w-6 sm:h-6 object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-orange-600 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    본 웨비나는 라이브로 진행되며 녹화본은 별도 제공하지 않습니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-1.5 sm:gap-3">
                <div className="w-3 sm:w-6 flex-shrink-0 relative">
                  <div className="absolute top-[9px] left-0 sm:top-[2px] lg:top-[8px]">
                    <img
                      src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/notice.png"
                      alt="주의"
                      className="w-3 h-3 sm:w-6 sm:h-6 object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-orange-600 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    마케팅 활용 정보 동의를 거부한 경우, 웨비나 시청 및 콘텐츠 수신 등이<span className="sm:hidden"> </span><span className="hidden sm:inline"><br /></span>제한됩니다.
                  </span>
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-1.5 sm:gap-3">
                <div className="w-3 sm:w-6 flex-shrink-0 relative">
                  <div className="absolute top-[9px] left-0 sm:top-[2px] lg:top-[8px]">
                    <img
                      src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/notice.png"
                      alt="주의"
                      className="w-3 h-3 sm:w-6 sm:h-6 object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1 justify-start">
                  <span className="text-orange-600 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                    본 웨비나는 관련 종사자 우선이며, 비관련 분야는 참석이 제한될 수 있습니다.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 문의 사항 */}
        <div className="self-stretch flex flex-col justify-start items-start gap-6 sm:gap-8 lg:gap-10">
          <div className="self-stretch justify-start text-black/60 font-bold text-xl sm:text-2xl lg:text-[36px] leading-relaxed sm:leading-relaxed lg:leading-[47.82px]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            문의 사항
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-1.5 sm:gap-4">
            <div className="self-stretch inline-flex justify-start items-start gap-0 sm:gap-2">
              <div className="w-3 sm:w-5 flex-shrink-0 relative">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 left-0 top-[11px] sm:top-[14px] absolute bg-black/60 rounded-full"></div>
              </div>
              <div className="flex-1 justify-start">
                <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                  웨비나와 관련된 문의사항이 있으시면 아래 연락처를 통해 문의주시기 바랍니다.
                </span>
              </div>
            </div>
            <div className="self-stretch inline-flex justify-start items-start gap-0 sm:gap-2">
              <div className="w-3 sm:w-5 flex-shrink-0 relative">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 left-0 top-[11px] sm:top-[14px] absolute bg-black/60 rounded-full"></div>
              </div>
              <div className="flex-1 justify-start">
                <span className="text-black/60 font-normal text-xs sm:text-base lg:text-[26px] leading-relaxed sm:leading-relaxed lg:leading-[40px]" style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.4px' }}>
                  메일문의 crm@wert.co.kr
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="w-screen h-24 bg-neutral-800 flex items-center justify-center"
        style={{ 
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw'
        }}
      >
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
