'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

interface DonePageClientProps {
  campaign: any
  baseUrl: string
}

export default function DonePageClient({ campaign, baseUrl }: DonePageClientProps) {
  const searchParams = useSearchParams()
  const [surveyNo, setSurveyNo] = useState<number | null>(null)
  const [code6, setCode6] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const surveyNoParam = searchParams.get('survey_no')
    const code6Param = searchParams.get('code6')
    
    if (surveyNoParam) {
      setSurveyNo(parseInt(surveyNoParam, 10))
    }
    if (code6Param) {
      setCode6(code6Param)
    }
    
    // 모바일 여부 확인
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [searchParams])
  
  // QR 코드 데이터: code6만 사용
  const qrData = code6 || null
  const headerImageUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/hpe-booth-header.jpg'
  
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-20">
      {/* 상단 배너 */}
      <div className="w-full bg-[#f8f9fa]">
        <div className="max-w-screen-xl mx-auto">
          <div className="relative w-full overflow-hidden flex justify-center">
            <img
              src={headerImageUrl}
              alt="이벤트 헤더"
              className="w-full h-auto max-w-[600px]"
              style={{ maxHeight: '300px' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 sm:px-5 py-4 sm:py-6">
        <div className="bg-gray-50 rounded-lg shadow-md p-5 sm:p-6 md:p-8 text-center">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">✓</div>
          <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[#00B388]">설문 완료되었습니다</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            완료번호와 확인코드를 부스 스태프에게 보여주세요.
          </p>
          
          {surveyNo && code6 && (
            <div className="space-y-3 sm:space-y-4">
              {/* 순번과 확인코드를 한 줄에 표시 (모바일 최적화) */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">참여 순번</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{surveyNo}</p>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">확인 코드</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 tracking-wider break-all">{code6}</p>
                </div>
              </div>
              
              {/* QR 코드 표시 */}
              {qrData && (
                <div className="bg-white rounded-lg p-4 sm:p-5 border border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">고유 QR 코드</p>
                  <div className="flex justify-center">
                    <div className="bg-white p-2 sm:p-3 rounded-lg">
                      <QRCodeSVG
                        value={qrData}
                        size={isMobile ? 150 : 180}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 sm:mt-4">
                    스태프가 이 QR 코드를 스캔하여 확인합니다
                  </p>
                </div>
              )}
            </div>
          )}
          
          {(!surveyNo || !code6) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                완료 정보를 불러올 수 없습니다. URL을 확인해주세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


