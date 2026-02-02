import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const WERT_CAMPAIGN_ID = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'

async function testWertVisitAPIDirect() {
  console.log('🧪 워트 Visit API 직접 테스트\n')
  console.log(`API URL: ${API_URL}`)
  console.log(`캠페인 ID: ${WERT_CAMPAIGN_ID}\n`)
  
  const testSessionId = `test-direct-${Date.now()}`
  const testData = {
    session_id: testSessionId,
    utm_source: 'test',
    utm_medium: 'test',
    utm_campaign: 'test',
    cid: 'YYP0X55H',
    referrer: 'https://eventflow.kr/event/149403',
    user_agent: 'Mozilla/5.0 (test)',
  }
  
  console.log('📤 요청 데이터:')
  console.log(JSON.stringify(testData, null, 2))
  console.log()
  
  try {
    const response = await fetch(`${API_URL}/api/public/campaigns/${WERT_CAMPAIGN_ID}/visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })
    
    console.log('📥 응답 상태:')
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   OK: ${response.ok}`)
    console.log()
    
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }
    
    console.log('📥 응답 본문:')
    console.log(JSON.stringify(responseData, null, 2))
    console.log()
    
    if (responseData.success === false) {
      console.log('🔴 Visit API 실패!')
      console.log(`   에러: ${responseData.error || '알 수 없는 에러'}`)
      console.log()
      console.log('가능한 원인:')
      if (responseData.error?.includes('Campaign')) {
        console.log('   - 캠페인을 찾을 수 없음')
      } else if (responseData.error?.includes('Client ID')) {
        console.log('   - client_id가 없음')
      } else if (responseData.error?.includes('Failed to save')) {
        console.log('   - DB 저장 실패')
        console.log('   - 서버 로그에서 [VisitTrackFail] 확인 필요')
      } else {
        console.log('   - 기타 오류')
      }
    } else if (responseData.success === true) {
      console.log('✅ Visit API 성공!')
      console.log('   DB에 저장되었는지 확인 필요')
    } else {
      console.log('⚠️  예상치 못한 응답 형식')
    }
  } catch (error: any) {
    console.error('❌ 네트워크 오류:', error.message)
  }
}

testWertVisitAPIDirect().catch(console.error)
