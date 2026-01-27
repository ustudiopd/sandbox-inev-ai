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

interface Webinar {
  id: string
  slug?: string | null
  title: string
  project_name?: string | null
  description?: string
  youtube_url: string
  start_time?: string | null
  end_time?: string | null
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
  const validTabs = ['dashboard', 'qa', 'chat', 'forms', 'files', 'giveaways', 'settings', 'participants', 'stats'] as const
  const initialTab = (tabParam && validTabs.includes(tabParam as any)) ? (tabParam as typeof validTabs[number]) : 'dashboard'
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'qa' | 'chat' | 'forms' | 'files' | 'giveaways' | 'settings' | 'participants' | 'stats'>(initialTab)
  const [webinarData, setWebinarData] = useState(webinar)
  // slug가 있으면 slug를 사용하고, 없으면 id를 사용 (URL용)
  const webinarSlug = webinarData.slug || webinarData.id
  
  // URL 파라미터 변경 시 탭 업데이트
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as any)) {
      setActiveTab(tabParam as typeof validTabs[number])
    }
  }, [tabParam])
  
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
          <div className="border-b border-gray-200 flex">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 대시보드
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'qa'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ❓ Q&A 모더레이션
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              💬 채팅 관리
            </button>
            <button
              onClick={() => setActiveTab('forms')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'forms'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📋 설문/퀴즈
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'files'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📎 발표자료
            </button>
            <button
              onClick={() => setActiveTab('giveaways')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'giveaways'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🎁 추첨
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'participants'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              👥 참여자 관리
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 통계
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⚙️ 설정
            </button>
          </div>
        </div>
        
        {/* 탭 컨텐츠 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'dashboard' && (
            <DashboardTab webinarId={webinarData.id} webinarSlug={webinarSlug} />
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

