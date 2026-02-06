'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function WertSummitPage() {
  const pathname = usePathname()
  
  // 현재 경로에 따라 웨비나 링크 결정
  const webinarLink = pathname?.includes('/149400') ? '/webinar/149400' : '/webinar/149402'
  
  useEffect(() => {
    // 스크롤 부드럽게
    document.documentElement.style.scrollBehavior = 'smooth'
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const wertLogoUrl = supabaseUrl 
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert.png`
    : '/img/wert.png'
  const wert1LogoUrl = supabaseUrl 
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert1.png`
    : '/img/wert1.png'

  return (
    <>
      <style jsx global>{`
        html {
          background-color: #000 !important;
        }
        
        body {
          font-family: 'Noto Sans KR', sans-serif;
          margin: 0;
          padding: 0;
          background: #000 !important;
          background-color: #000 !important;
          color: #fff;
          overflow-x: hidden;
        }
        
        #__next {
          background-color: #000 !important;
        }
        
        main {
          background-color: #000 !important;
        }

        .hero-section {
          background: linear-gradient(135deg, #4da8da 0%, #46cdcf 50%, #b3e5fc 100%);
          height: 50vh;
          min-height: 400px;
          width: 100vw;
          max-width: 100%;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          left: 0;
          right: 0;
          box-sizing: border-box;
        }

        .main-title {
          font-size: clamp(3rem, 12vw, 8rem);
          line-height: 0.9;
          letter-spacing: -0.05em;
          color: #000;
          text-transform: uppercase;
          font-weight: 900;
          text-align: left;
          margin-bottom: 32px;
        }

        .sub-title {
          font-size: clamp(1.5rem, 4vw, 3rem);
          margin-top: 1.5rem;
          margin-bottom: 32px;
          font-weight: 700;
          color: #000;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-align: left;
        }

        .content {
          max-width: 1500px;
          width: 100%;
          margin: 0 auto;
          padding-left: 8%;
          padding-right: 8%;
        }

        .logo-container {
          position: absolute;
          top: 5%;
          right: 5%;
          width: 150px;
        }

        section {
          padding-top: 100px;
          padding-bottom: 100px;
          padding-left: 8%;
          padding-right: 8%;
          border-bottom: 1px solid #333;
          max-width: 1500px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          box-sizing: border-box;
          background-color: #000;
          color: #fff;
        }

        .section-label {
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #4da8da;
          margin-bottom: 20px;
          display: block;
        }

        .section-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 900;
          margin-bottom: 60px;
          letter-spacing: -0.02em;
          color: #fff;
        }

        section p {
          color: #e0e0e0;
        }

        .program-item {
          display: grid;
          grid-template-columns: 150px 1fr;
          padding: 30px 0;
          border-top: 1px solid #333;
          gap: 20px;
          text-align: left;
        }

        .program-time {
          font-weight: 700;
          color: #4da8da;
          font-size: 1.1rem;
        }

        .program-content h4 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 8px;
          color: #fff;
        }

        .program-content p {
          color: #e0e0e0;
          font-size: 1.05rem;
          text-align: left;
        }

        .speaker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 40px;
        }

        .speaker-card img {
          width: 100%;
          aspect-ratio: 1/1;
          object-fit: cover;
          background-color: #f7f7f7;
          margin-bottom: 20px;
          border-radius: 4px;
        }

        .speaker-info h4 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .speaker-info p {
          color: #888;
          font-size: 0.95rem;
        }

        .venue-info {
          background-color: #1a1a1a;
          border-radius: 12px;
          padding: 40px;
          display: flex;
          flex-wrap: wrap;
          gap: 40px;
        }

        .info-block h5 {
          font-weight: 700;
          margin-bottom: 10px;
          color: #4da8da;
        }

        .info-block p {
          color: #e0e0e0;
        }

        footer {
          background-color: #000;
          width: 100%;
          max-width: 100%;
        }

        .register-button-container {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .register-button {
          display: inline-block;
          padding: 16px 48px;
          background-color: #4da8da;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.3s ease;
          border: none;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .register-button:hover {
          background-color: #46cdcf;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(77, 168, 218, 0.3);
        }

        .webinar-button {
          display: inline-block;
          padding: 16px 48px;
          background-color: transparent;
          color: #000;
          font-size: 1.1rem;
          font-weight: 700;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.3s ease;
          border: 2px solid #000;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .webinar-button:hover {
          background-color: #000;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        .scroll-down {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          animation: bounce 2s infinite;
          cursor: pointer;
          color: #000;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateY(0) translateX(-50%);}
          40% {transform: translateY(-10px) translateX(-50%);}
          60% {transform: translateY(-5px) translateX(-50%);}
        }

        @media (max-width: 768px) {
          .program-item {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .hero-section {
            padding: 0;
          }
          
          .content {
            padding-left: 5%;
            padding-right: 5%;
          }
          
          section {
            padding-top: 60px;
            padding-bottom: 60px;
            padding-left: 5%;
            padding-right: 5%;
          }

          .register-button,
          .webinar-button {
            padding: 12px 32px;
            font-size: 0.95rem;
          }

          .register-button-container {
            bottom: 70px;
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="hero-section p-0">
        <div className="logo-container">
          <img src={wert1LogoUrl} alt="Wert Intelligence Logo" className="w-full h-auto" />
        </div>

        {/* IP Insight ON 이미지 */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '40px', marginBottom: '40px' }}>
          <img
            src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/ip_insight_on.png"
            alt="IP Insight ON"
            style={{ width: '204px', height: '60px', objectFit: 'contain' }}
          />
        </div>

        <div className="content" style={{ marginTop: '32px', marginBottom: '32px' }}>
          <h1 className="main-title">
            WERT TECH<br />
            SUMMIT 26
          </h1>
          <div className="sub-title">
            IP DATA <span className="text-2xl opacity-70">✕</span> AI
          </div>
        </div>

        <div className="register-button-container">
          <Link href="/event/149403/register" className="register-button">
            등록하기
          </Link>
          <Link href={`${webinarLink}#login`} className="webinar-button">
            웨비나 시청
          </Link>
        </div>

        <div 
          className="scroll-down" 
          onClick={() => scrollToSection('about')}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
          </svg>
        </div>
      </section>

      {/* About Section */}
      <section id="about">
        <span className="section-label">Overview</span>
        <h2 className="section-title">
          국내 최초 IP 데이터 X 버티컬 AI<br />
          비즈니스 기술 전략 써밋
        </h2>
        <p className="text-xl max-w-3xl mx-auto leading-relaxed">
          단순한 기술 공유를 넘어 실제 기업 현장에서 AI가 어떻게 전략화되고 의사결정에 활용되는지, 글로벌 테크 리더들과 함께 그 실체를 공개합니다.
        </p>
      </section>

      {/* Program Section */}
      <section id="program">
        <span className="section-label">Timeline</span>
        <h2 className="section-title">Program</h2>
        <div className="program-list">
          <div className="program-item">
            <div className="program-time">10:00 - 10:10</div>
            <div className="program-content">
              <h4>Opening</h4>
              <p>WERT TECH SUMMIT 26 개회 선언</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">10:10 - 10:50</div>
            <div className="program-content">
              <h4>Keynote: Vertical AI</h4>
              <p>글로벌 리더십을 재편하는 게임 체인저 &apos;버티컬 AI&apos; | 퀄컴 유은성 상무</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">10:50 - 11:30</div>
            <div className="program-content">
              <h4>AI Data Strategy</h4>
              <p>기업 경쟁력을 결정짓는 AI 데이터 전략 | 카카오 김경훈 부문장</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">11:30 - 12:10</div>
            <div className="program-content">
              <h4>AX Transformation</h4>
              <p>의사결정권자들이 선택한 기술 데이터 기반 AX 전략 | AWS 정현기 총괄</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">12:10 - 13:30</div>
            <div className="program-content">
              <h4>Lunch Break</h4>
              <p>점심 식사 및 네트워킹</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">13:30 - 14:10</div>
            <div className="program-content">
              <h4>Global Tech Trend 2030</h4>
              <p>데이터로 미리보는 2030년 글로벌 기술 트렌드 | 워트인텔리전스 윤정호 대표</p>
            </div>
          </div>
        </div>
      </section>

      {/* Venue Section */}
      <section id="venue">
        <span className="section-label">Location</span>
        <h2 className="section-title">Venue</h2>
        <div className="venue-info">
          <div className="info-block">
            <h5>장소</h5>
            <p>GS타워 아모리스 역삼 (서울 강남구 테헤란로 508)</p>
          </div>
          <div className="info-block">
            <h5>문의</h5>
            <p>connect@wert.co.kr | 02-521-0110</p>
          </div>
          <div className="info-block">
            <h5>비고</h5>
            <p>오프라인 현장 참여 및 온라인 라이브 동시 진행</p>
          </div>
        </div>
      </section>

      <footer className="py-20 px-[8%] text-sm flex flex-col items-center justify-center gap-4 bg-black">
        <p className="text-white">&copy; 2026 WERT Intelligence. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="text-white hover:text-gray-300 transition-colors">Privacy Policy</a>
          <a href="#" className="text-white hover:text-gray-300 transition-colors">Terms of Service</a>
        </div>
      </footer>
    </>
  )
}
