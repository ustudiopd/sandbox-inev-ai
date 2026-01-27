'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OnePredictEnterPageProps {
  campaign?: any
  baseUrl?: string
}

export default function OnePredictEnterPage({ campaign, baseUrl = '' }: OnePredictEnterPageProps) {
  const router = useRouter()
  const [showMessage, setShowMessage] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })

  const showMessageBox = (text: string) => {
    setMessageText(text)
    setShowMessage(true)
    setTimeout(() => {
      setShowMessage(false)
    }, 3000)
  }

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('입장 정보:', formData)
    
    // 웨비나 라이브 페이지로 이동
    showMessageBox('웨비나 입장 중입니다...')
    setTimeout(() => {
      router.push('/webinar/426307/live')
    }, 1000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans" style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif" }}>
      {/* Header */}
      <header className="fixed w-full z-50 bg-white border-b border-gray-200 h-[80px] max-sm:h-[60px]">
        <div className="max-w-5xl container mx-auto px-6 max-sm:px-4 h-full flex items-center">
          <div className="flex items-center cursor-pointer" onClick={() => router.push('/webinar/426307')}>
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
          <div 
            className="inline-block px-4 max-sm:px-3 py-2 max-sm:py-1.5 rounded-full font-bold mb-6 max-sm:mb-4 border text-sm max-sm:text-xs whitespace-nowrap max-sm:whitespace-normal"
            style={{ 
              backgroundColor: 'rgba(81, 202, 222, 0.2)', 
              color: '#51CADE',
              borderColor: 'rgba(81, 202, 222, 0.3)'
            }}
          >
            Webinar 2026.02.25 WED | 14:00 PM
          </div>
          <h1 className="text-4xl md:text-6xl max-sm:text-2xl max-sm:px-2 font-extrabold mb-6 max-sm:mb-4 leading-tight">
            산업 AI의 미래,<br />원프레딕트가 제안하는 가동 효율의 극대화
          </h1>
          <p className="text-xl md:text-2xl max-sm:text-base max-sm:px-2 text-white/80 mb-10 max-sm:mb-6 whitespace-nowrap max-sm:whitespace-normal">
            GuardiOne®을 통한 설비 관리 혁신과 디지털 트랜스포메이션 성공 전략을 공개합니다.
          </p>
        </div>
      </section>

      {/* Login Section */}
      <section className="py-20 max-sm:py-12 px-6 max-sm:px-4 bg-white">
        <div className="max-w-md mx-auto">
          <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-8 md:p-12 max-sm:p-6">
            <div className="text-center mb-8 max-sm:mb-6">
              <h2 className="text-3xl max-sm:text-2xl font-bold mb-2" style={{ color: '#333333' }}>웨비나 입장</h2>
              <p className="text-gray-500 max-sm:text-sm">등록하신 정보를 입력해주세요</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 max-sm:space-y-4">
              {/* 이름 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                  placeholder="이름을 입력해주세요"
                />
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                  placeholder="이메일을 입력해주세요"
                />
              </div>

              {/* 입장 버튼 */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full px-8 max-sm:px-6 py-4 max-sm:py-3 text-white font-bold rounded-lg transition-all hover:bg-[#12058E] hover:-translate-y-0.5 max-sm:text-sm"
                  style={{ backgroundColor: '#2936E7' }}
                >
                  웨비나 입장하기
                </button>
              </div>

              {/* 메인으로 돌아가기 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/webinar/426307')}
                  className="w-full px-8 max-sm:px-6 py-4 max-sm:py-3 font-bold rounded-lg border-2 transition-all hover:bg-gray-50 max-sm:text-sm"
                  style={{ borderColor: '#2936E7', color: '#2936E7' }}
                >
                  메인으로 돌아가기
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

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
