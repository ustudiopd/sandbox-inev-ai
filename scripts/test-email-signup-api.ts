import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testEmailSignupAPI() {
  try {
    const email = 'pd@uslab.ai'
    const webinarId = '1a1eb091-290b-4451-8f74-62cb47ac37ea'
    
    console.log('=== Email Signup API 테스트 ===\n')
    console.log(`이메일: ${email}`)
    console.log(`웨비나 ID: ${webinarId}\n`)
    
    const response = await fetch('http://localhost:3000/api/auth/email-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        webinarId,
      }),
    })
    
    const result = await response.json()
    
    console.log(`응답 상태: ${response.status} ${response.statusText}`)
    console.log('응답 결과:', JSON.stringify(result, null, 2))
    
    if (!response.ok) {
      console.error('\n❌ API 호출 실패')
      process.exit(1)
    }
    
    console.log('\n✅ API 호출 성공')
    
  } catch (error: any) {
    console.error('\n❌ 예외 발생:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testEmailSignupAPI()
