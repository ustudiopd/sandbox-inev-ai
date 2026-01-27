'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OnePredictWebinarPageProps {
  campaign?: any
  baseUrl?: string
}

export default function OnePredictWebinarPage({ campaign, baseUrl = '' }: OnePredictWebinarPageProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [webinar, setWebinar] = useState<any>(null)
  const [isLoadingWebinar, setIsLoadingWebinar] = useState(true)

  const toggleModal = (show: boolean) => {
    setIsModalOpen(show)
    if (show) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }

  const showMessageBox = (text: string) => {
    setMessageText(text)
    setShowMessage(true)
    setTimeout(() => {
      setShowMessage(false)
    }, 3000)
  }

  const handleRegistration = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    showMessageBox('웨비나 등록이 성공적으로 완료되었습니다!')
    toggleModal(false)
    setTimeout(() => {
      router.push('/webinar/426307/register')
    }, 2000)
  }

  const goToRegistration = () => {
    router.push('/webinar/426307/register')
  }

  const enterWebinar = () => {
    router.push('/webinar/426307/enter')
  }

  // 웨비나 데이터 가져오기
  useEffect(() => {
    let cancelled = false
    
    const fetchWebinar = async () => {
      setIsLoadingWebinar(true)
      try {
        const response = await fetch('/api/webinars/426307')
        if (cancelled) return
        
        if (response.ok) {
          const data = await response.json()
          if (cancelled) return
          
          if (data && data.webinar) {
            setWebinar(data.webinar)
            console.log('웨비나 데이터 로드 완료:', data.webinar)
          }
        } else {
          console.warn('웨비나 조회 실패:', response.status)
        }
      } catch (error) {
        if (cancelled) return
        console.error('웨비나 데이터 로드 오류:', error)
      } finally {
        if (!cancelled) {
          setIsLoadingWebinar(false)
        }
      }
    }
    
    fetchWebinar()
    
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Smooth scroll for nav links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement
      if (anchor) {
        e.preventDefault()
        const href = anchor.getAttribute('href')
        if (href) {
          const targetElement = document.querySelector(href)
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            })
          }
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans" style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif" }}>
      {/* Header */}
      <header className="fixed w-full z-50 bg-white border-b border-gray-200 h-[80px] max-sm:h-[60px]">
        <div className="max-w-5xl container mx-auto px-6 max-sm:px-4 h-full flex items-center">
          <div className="flex items-center">
            <img 
              src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/onepredict/be6b22396f779.png" 
              alt="원프레딕트 로고"
              className="w-[120px] max-sm:w-[100px] h-auto"
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="pt-32 max-sm:pt-20 pb-20 max-sm:pb-12 px-6 max-sm:px-4 text-white overflow-x-hidden overflow-y-visible relative"
        style={{ background: 'linear-gradient(135deg, #12058E 0%, #2936E7 100%)' }}
      >
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#51CADE" d="M44.7,-76.4C58.1,-69.2,71.1,-59.1,79.6,-45.8C88.1,-32.5,92.1,-16.2,91.4,-0.4C90.7,15.4,85.2,30.8,76.4,44.7C67.6,58.6,55.5,71,41.2,78.2C26.9,85.4,10.4,87.4,-5.4,86.5C-21.2,85.5,-36.3,81.6,-49.6,73.8C-62.9,66,-74.4,54.3,-81.8,40.5C-89.2,26.7,-92.5,10.8,-90.4,-4.3C-88.3,-19.4,-80.8,-33.7,-70.6,-45.6C-60.4,-57.5,-47.5,-67,-33.9,-74C-20.3,-81,-10.1,-85.5,2.3,-89.4C14.7,-93.3,29.4,-96.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
        
        <div className="container mx-auto flex flex-col items-center text-center relative z-10 pt-4">
          {webinar?.start_time && (
            <div 
              className="inline-block px-4 max-sm:px-3 py-2 max-sm:py-1.5 rounded-full font-bold mb-6 max-sm:mb-4 border text-sm max-sm:text-xs whitespace-nowrap max-sm:whitespace-normal"
              style={{ 
                backgroundColor: 'rgba(81, 202, 222, 0.2)', 
                color: '#51CADE',
                borderColor: 'rgba(81, 202, 222, 0.3)'
              }}
            >
              {(() => {
                const date = new Date(webinar.start_time)
                const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
                const day = days[date.getDay()]
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const dayNum = String(date.getDate()).padStart(2, '0')
                const hours = String(date.getHours()).padStart(2, '0')
                const minutes = String(date.getMinutes()).padStart(2, '0')
                return `Webinar ${year}.${month}.${dayNum} ${day} | ${hours}:${minutes}`
              })()}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl max-sm:text-2xl max-sm:px-2 font-extrabold mb-6 max-sm:mb-4 leading-tight">
            {webinar?.title === '산업 AI의 미래, 원프레딕트가 제안하는 가동 효율의 극대화' || !webinar?.title ? (
              <>
                산업 AI의 미래,<br />원프레딕트가 제안하는 가동 효율의 극대화
              </>
            ) : (
              webinar.title
            )}
          </h1>
          <p className="text-xl md:text-2xl max-sm:text-base max-sm:px-2 text-white/80 mb-10 max-sm:mb-6 whitespace-nowrap max-sm:whitespace-normal">
            {webinar?.description || 'GuardiOne®을 통한 설비 관리 혁신과 디지털 트랜스포메이션 성공 전략을 공개합니다.'}
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 max-sm:space-y-3 sm:space-y-0 sm:space-x-4 max-sm:w-full max-sm:px-4">
            <button 
              onClick={goToRegistration} 
              className="px-10 max-sm:px-6 py-4 max-sm:py-3 max-sm:w-full rounded-lg bg-white font-bold text-lg max-sm:text-base shadow-xl hover:bg-gray-100 transition-colors"
              style={{ color: '#2936E7' }}
            >
              무료 참가 신청하기
            </button>
            <button 
              onClick={enterWebinar}
              className="px-10 max-sm:px-6 py-4 max-sm:py-3 max-sm:w-full rounded-lg font-bold text-lg max-sm:text-base text-white transition-all hover:bg-[#51CADE] hover:text-[#12058E]"
              style={{ border: '2px solid #51CADE' }}
            >
              웨비나 입장하기
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 max-sm:py-8 bg-white shadow-sm relative z-20 -mt-10 max-sm:-mt-6 mx-6 max-sm:mx-4 rounded-2xl max-w-5xl container mx-auto border border-gray-100">
        <div className="p-8 md:p-12 max-sm:p-6">
          <div className="grid md:grid-cols-3 max-sm:grid-cols-1 gap-8 max-sm:gap-6 text-center">
            <div>
              <div className="text-4xl md:text-5xl max-sm:text-3xl font-bold mb-2" style={{ color: '#2936E7' }}>99.8%</div>
              <div className="text-gray-600 max-sm:text-sm font-medium">예지보전 정확도</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl max-sm:text-3xl font-bold mb-2" style={{ color: '#2936E7' }}>1,500+</div>
              <div className="text-gray-600 max-sm:text-sm font-medium">글로벌 구축 설비</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl max-sm:text-3xl font-bold mb-2" style={{ color: '#2936E7' }}>30%</div>
              <div className="text-gray-600 max-sm:text-sm font-medium">운영비용 절감 효과</div>
            </div>
          </div>
        </div>
      </section>

      {/* Speaker / Schedule */}
      <section id="schedule" className="pt-12 max-sm:pt-8 pb-24 max-sm:pb-16 px-6 max-sm:px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16 max-sm:mb-8">
            <h2 className="text-3xl max-sm:text-2xl font-bold mb-4 max-sm:mb-2">웨비나 프로그램</h2>
            <p className="text-gray-500 max-sm:text-sm">최고의 전문가들과 함께하는 세션 안내</p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6 max-sm:space-y-4">
            {/* Session 1 */}
            <div className="flex flex-col md:flex-row border border-gray-100 rounded-xl overflow-hidden hover:border-[#2936E7]/30 transition-colors shadow-sm">
              <div className="bg-gray-50 p-6 max-sm:p-4 md:w-48 flex flex-col justify-center items-center text-center">
                <span className="text-sm max-sm:text-xs font-bold text-gray-400">SESSION 01</span>
                <span className="text-xl max-sm:text-lg font-bold" style={{ color: '#2936E7' }}>14:00 - 14:40</span>
              </div>
              <div className="p-6 max-sm:p-4 flex-1">
                <h3 className="text-xl max-sm:text-lg font-bold mb-2">산업 현장 디지털 트랜스포메이션의 실전 사례</h3>
                <p className="text-gray-600 max-sm:text-sm">성공적인 AI 도입을 위해 고려해야 할 3가지 핵심 요소와 극복 전략</p>
                <div className="mt-4 max-sm:mt-3 flex items-center space-x-2">
                  <div className="w-8 h-8 max-sm:w-6 max-sm:h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(41, 54, 231, 0.1)' }}>
                    <i className="fas fa-user text-xs" style={{ color: '#2936E7' }}></i>
                  </div>
                  <span className="text-sm max-sm:text-xs font-medium">원프레딕트 기술본부 수석연구원</span>
                </div>
              </div>
            </div>

            {/* Session 2 */}
            <div className="flex flex-col md:flex-row border border-gray-100 rounded-xl overflow-hidden hover:border-[#2936E7]/30 transition-colors shadow-sm">
              <div className="bg-gray-50 p-6 max-sm:p-4 md:w-48 flex flex-col justify-center items-center text-center">
                <span className="text-sm max-sm:text-xs font-bold text-gray-400">SESSION 02</span>
                <span className="text-xl max-sm:text-lg font-bold" style={{ color: '#2936E7' }}>14:50 - 15:30</span>
              </div>
              <div className="p-6 max-sm:p-4 flex-1">
                <h3 className="text-xl max-sm:text-lg font-bold mb-2">GuardiOne® 신규 기능 업데이트 및 데모 시연</h3>
                <p className="text-gray-600 max-sm:text-sm">더 직관적이고 강력해진 설비 분석 대시보드와 진단 알고리즘 시연</p>
                <div className="mt-4 max-sm:mt-3 flex items-center space-x-2">
                  <div className="w-8 h-8 max-sm:w-6 max-sm:h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(41, 54, 231, 0.1)' }}>
                    <i className="fas fa-user text-xs" style={{ color: '#2936E7' }}></i>
                  </div>
                  <span className="text-sm max-sm:text-xs font-medium">원프레딕트 Product Manager</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#333333] text-white py-16 max-sm:py-8 px-6 max-sm:px-4">
        <div className="container mx-auto">
          <div className="text-sm max-sm:text-xs text-white/40 flex flex-col md:flex-row justify-between items-center max-sm:gap-2">
            <span className="md:text-left max-sm:text-center">© 2025 OnePredict Inc. All rights reserved.</span>
            <div className="flex space-x-6 max-sm:space-x-4 max-sm:mt-4 md:mt-0">
              <a href="https://ko.onepredict.ai/privacy" className="hover:text-white transition-colors">개인정보처리방침</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      {isModalOpen && (
        <div 
          className="fixed top-0 left-0 w-full h-full bg-black/70 z-[1000] flex items-center justify-center p-4"
          onClick={() => toggleModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-8 max-sm:p-6 relative mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => toggleModal(false)} 
              className="absolute top-4 max-sm:top-3 right-4 max-sm:right-3 text-gray-400 hover:text-gray-600 text-xl max-sm:text-lg"
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 className="text-2xl max-sm:text-xl font-bold mb-2 pr-8">웨비나 등록</h2>
            <p className="text-gray-500 max-sm:text-sm mb-6 max-sm:mb-4">등록하신 이메일로 접속 링크를 발송해 드립니다.</p>
            
            <form onSubmit={handleRegistration} className="space-y-4 max-sm:space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">성함</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                  style={{ '--tw-ring-color': 'rgba(41, 54, 231, 0.2)' } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">회사명</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">이메일</label>
                <input 
                  type="email" 
                  required 
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                />
              </div>
              <div className="flex items-start space-x-2 pt-2">
                <input type="checkbox" id="agree" required className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ accentColor: '#2936E7' }} />
                <label htmlFor="agree" className="text-xs text-gray-500 leading-relaxed">개인정보 수집 및 이용에 동의합니다.</label>
              </div>
              <button 
                type="submit" 
                className="w-full py-4 max-sm:py-3 text-white font-bold rounded-lg transition-all hover:bg-[#12058E] hover:-translate-y-0.5 mt-4 max-sm:text-sm"
                style={{ backgroundColor: '#2936E7' }}
              >
                등록 완료하기
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Message UI Component */}
      {showMessage && (
        <div className="fixed bottom-10 max-sm:bottom-6 left-1/2 -translate-x-1/2 z-[2000] animate-fade-in max-sm:px-4 max-sm:w-full max-sm:max-w-sm">
          <div 
            className="text-white px-8 max-sm:px-4 py-4 max-sm:py-3 rounded-full shadow-2xl flex items-center space-x-3 max-sm:space-x-2 max-sm:text-sm"
            style={{ backgroundColor: '#12058E' }}
          >
            <i className="fas fa-check-circle flex-shrink-0" style={{ color: '#51CADE' }}></i>
            <span className="max-sm:truncate">{messageText}</span>
          </div>
        </div>
      )}

      {/* Font Awesome CDN */}
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
