'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import WebinarHeader from '@/components/webinar/WebinarHeader'
import QAModeration from './QAModeration'
import ChatModeration from './ChatModeration'
import FormManagement from './FormManagement'
import FileManagement from './FileManagement'
import GiveawayManagement from './GiveawayManagement'
import SettingsTab from './SettingsTab'
import DashboardTab from './DashboardTab'
import ParticipantsTab from './ParticipantsTab'
import StatsTab from './StatsTab'
import EmailCampaignTab from '@/components/email/EmailCampaignTab'

interface Webinar {
  id: string
  slug?: string | null
  title: string
  project_name?: string | null
  description?: string
  youtube_url: string
  start_time?: string | null
  end_time?: string | null
  webinar_start_time?: string | null
  max_participants?: number | null
  is_public: boolean
  access_policy: string
  client_id: string
  clients?: {
    id: string
    name: string
    logo_url?: string
  }
}

interface ConsoleViewProps {
  webinar: Webinar
  userRole: string
}

/**
 * 운영 콘솔 메인 컴포넌트
 * Q&A 모더레이션, 퀴즈, 추첨 등을 관리하는 운영자 전용 페이지
 */
export default function ConsoleView({ webinar, userRole }: ConsoleViewProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  
  // URL 쿼리 파라미터에서 탭 확인
  const validTabs = ['dashboard', 'qa', 'chat', 'forms', 'files', 'giveaways', 'settings', 'participants', 'stats', 'emails'] as const
  const initialTab = (tabParam && validTabs.includes(tabParam as any)) ? (tabParam as typeof validTabs[number]) : 'dashboard'
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'qa' | 'chat' | 'forms' | 'files' | 'giveaways' | 'settings' | 'participants' | 'stats' | 'emails'>(initialTab)
  const [webinarData, setWebinarData] = useState(webinar)
  // slug가 있으면 slug를 사용하고, 없으면 id를 사용 (URL용)
  const webinarSlug = webinarData.slug || webinarData.id
  
  // URL 파라미터 변경 시 탭 업데이트
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as any)) {
      setActiveTab(tabParam as typeof validTabs[number])
    }
  }, [tabParam])
  
  // 관리자 대시보드 테마 설정
  useEffect(() => {
    document.body.setAttribute('data-theme', 'admin')
    return () => {
      document.body.removeAttribute('data-theme')
    }
  }, [])
  
  const handleWebinarUpdate = (updatedWebinar: any) => {
    setWebinarData(updatedWebinar)
  }
  
  return (
    <>
      {/* 웨비나 헤더 (TopNav 아래에 위치) */}
      <WebinarHeader webinar={webinarData} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="border-b border-gray-200 flex flex-wrap gap-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="대시보드"
            >
              <span className="text-2xl sm:text-xl">📊</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">메인</span>
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'qa'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="Q&A 모더레이션"
            >
              <span className="text-2xl sm:text-xl">❓</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">Q&A</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="채팅 관리"
            >
              <span className="text-2xl sm:text-xl">💬</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">채팅</span>
            </button>
            <button
              onClick={() => setActiveTab('forms')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'forms'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="설문/퀴즈"
            >
              <span className="text-2xl sm:text-xl">📋</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">설문</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'files'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="발표자료"
            >
              <span className="text-2xl sm:text-xl">📎</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">자료</span>
            </button>
            <button
              onClick={() => setActiveTab('giveaways')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'giveaways'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="추첨"
            >
              <span className="text-2xl sm:text-xl">🎁</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">추첨</span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'participants'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="참여자 관리"
            >
              <span className="text-2xl sm:text-xl">👥</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">참여</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'stats'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="통계"
            >
              <span className="text-2xl sm:text-xl">📊</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">통계</span>
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'emails'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="이메일 발송"
            >
              <span className="text-2xl sm:text-xl">📧</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">이메일</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 min-w-[60px] sm:min-w-auto transition-colors flex-shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="설정"
            >
              <span className="text-2xl sm:text-xl">⚙️</span>
              <span className="text-xs sm:text-sm whitespace-nowrap font-medium">설정</span>
            </button>
          </div>
        </div>
        
        {/* 탭 컨텐츠 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'dashboard' && (
            <DashboardTab webinarId={webinarData.id} webinarSlug={webinarSlug} webinar={webinarData} />
          )}
          
          {activeTab === 'qa' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Q&A 모더레이션</h2>
              <QAModeration webinarId={webinarData.id} />
            </div>
          )}
          
          {activeTab === 'chat' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">채팅 관리</h2>
              <ChatModeration webinarId={webinarData.id} />
            </div>
          )}
          
          {activeTab === 'forms' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">설문/퀴즈 관리</h2>
              <FormManagement webinarId={webinarData.id} />
            </div>
          )}
          
          {activeTab === 'files' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">발표자료 관리</h2>
              <FileManagement webinarId={webinarData.id} />
            </div>
          )}
          
          {activeTab === 'giveaways' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">추첨 관리</h2>
              <GiveawayManagement webinarId={webinarData.id} />
            </div>
          )}
          
          {activeTab === 'participants' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">참여자 관리</h2>
              <ParticipantsTab webinarId={webinarData.id} />
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">통계</h2>
              <StatsTab webinar={webinarData} />
            </div>
          )}
          
          {activeTab === 'emails' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">이메일 발송</h2>
              <EmailCampaignTab 
                clientId={webinarData.client_id}
                scopeType="webinar"
                scopeId={webinarData.id}
              />
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">웨비나 설정</h2>
              <SettingsTab webinar={webinarData} onWebinarUpdate={handleWebinarUpdate} />
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

