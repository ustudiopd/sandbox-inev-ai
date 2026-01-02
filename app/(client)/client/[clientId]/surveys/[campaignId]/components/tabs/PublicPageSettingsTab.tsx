'use client'

import { useState } from 'react'

interface PublicPageSettingsTabProps {
  campaignId: string
  campaign: any
  onCampaignUpdate: (campaign: any) => void
}

export default function PublicPageSettingsTab({ campaignId, campaign, onCampaignUpdate }: PublicPageSettingsTabProps) {
  const [saving, setSaving] = useState(false)
  const welcomeSchemaData = campaign.welcome_schema || {}
  const [showTitle, setShowTitle] = useState(welcomeSchemaData.showTitle !== false) // 기본값 true
  const [showQRCode, setShowQRCode] = useState(welcomeSchemaData.showQRCode !== false) // 기본값 true
  const [welcomeSchema, setWelcomeSchema] = useState(JSON.stringify(welcomeSchemaData, null, 2))
  const [completionSchema, setCompletionSchema] = useState(JSON.stringify(campaign.completion_schema || {}, null, 2))
  const [displaySchema, setDisplaySchema] = useState(JSON.stringify(campaign.display_schema || {}, null, 2))
  
  const welcomePath = `/event${campaign.public_path || ''}`
  const completionPath = `/event${campaign.public_path || ''}/done`
  const displayPath = `/event${campaign.public_path || ''}/display`
  
  const handleSave = async () => {
    let parsedWelcomeSchema, parsedCompletionSchema, parsedDisplaySchema
    
    try {
      parsedWelcomeSchema = welcomeSchema.trim() ? JSON.parse(welcomeSchema) : {}
      // 체크박스 값 반영
      parsedWelcomeSchema.showTitle = showTitle
      parsedWelcomeSchema.showQRCode = showQRCode
    } catch (e) {
      alert('웰컴 페이지 설정 JSON 형식이 올바르지 않습니다')
      return
    }
    
    try {
      parsedCompletionSchema = completionSchema.trim() ? JSON.parse(completionSchema) : null
    } catch (e) {
      alert('완료 페이지 설정 JSON 형식이 올바르지 않습니다')
      return
    }
    
    try {
      parsedDisplaySchema = displaySchema.trim() ? JSON.parse(displaySchema) : null
    } catch (e) {
      alert('디스플레이 페이지 설정 JSON 형식이 올바르지 않습니다')
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcome_schema: parsedWelcomeSchema,
          completion_schema: parsedCompletionSchema,
          display_schema: parsedDisplaySchema,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '설정 저장 실패')
      }
      
      onCampaignUpdate(result.campaign)
      alert('공개페이지 설정이 저장되었습니다')
    } catch (error: any) {
      console.error('설정 저장 오류:', error)
      alert(error.message || '설정 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="space-y-6">
        {/* 웰컴 페이지 표시 옵션 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">웰컴 페이지 표시 옵션</h3>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showTitle}
                onChange={(e) => {
                  setShowTitle(e.target.checked)
                  // JSON도 업데이트
                  try {
                    const current = welcomeSchema.trim() ? JSON.parse(welcomeSchema) : {}
                    current.showTitle = e.target.checked
                    setWelcomeSchema(JSON.stringify(current, null, 2))
                  } catch (err) {
                    // JSON 파싱 실패 시 무시
                  }
                }}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-3 text-sm text-gray-700">제목 표시</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showQRCode}
                onChange={(e) => {
                  setShowQRCode(e.target.checked)
                  // JSON도 업데이트
                  try {
                    const current = welcomeSchema.trim() ? JSON.parse(welcomeSchema) : {}
                    current.showQRCode = e.target.checked
                    setWelcomeSchema(JSON.stringify(current, null, 2))
                  } catch (err) {
                    // JSON 파싱 실패 시 무시
                  }
                }}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-3 text-sm text-gray-700">QR 코드 표시</span>
            </label>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            웰컴 페이지 설정 (JSON)
          </label>
          <textarea
            value={welcomeSchema}
            onChange={(e) => setWelcomeSchema(e.target.value)}
            rows={10}
            className="w-full font-mono text-sm border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder='{"title": "환영합니다", "description": "설문조사에 참여해주세요"}'
          />
          <p className="mt-1 text-xs text-gray-500">
            웰컴 페이지({welcomePath})의 설정을 JSON 형식으로 입력하세요
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            완료 페이지 설정 (JSON)
          </label>
          <textarea
            value={completionSchema}
            onChange={(e) => setCompletionSchema(e.target.value)}
            rows={10}
            className="w-full font-mono text-sm border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder='{"title": "완료되었습니다", "message": "감사합니다"}'
          />
          <p className="mt-1 text-xs text-gray-500">
            완료 페이지({completionPath})의 설정을 JSON 형식으로 입력하세요
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            디스플레이 페이지 설정 (JSON)
          </label>
          <textarea
            value={displaySchema}
            onChange={(e) => setDisplaySchema(e.target.value)}
            rows={10}
            className="w-full font-mono text-sm border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder='{"title": "실시간 현황", "showStats": true}'
          />
          <p className="mt-1 text-xs text-gray-500">
            디스플레이 페이지({displayPath})의 설정을 JSON 형식으로 입력하세요
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
    </div>
  )
}

