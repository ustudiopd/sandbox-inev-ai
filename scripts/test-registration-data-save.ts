import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * registration_data 저장 테스트
 * 실제로 어떤 필드가 저장되는지 확인
 */
async function testRegistrationDataSave() {
  const admin = createAdminSupabase()
  
  console.log('=== registration_data 저장 테스트 ===\n')
  
  // 테스트 데이터
  const testRegistrationData = {
    email: 'test@example.com',
    name: '테스트',
    organization: '테스트 조직',
    department: '테스트 부서',
    position: '테스트 직함',
    jobTitle: '테스트 직함',
    yearsOfExperience: '5년',
    question: '테스트 질문',
    phoneCountryCode: '+82',
    privacyConsent: true,
  }
  
  console.log('전송할 registration_data:')
  console.log(JSON.stringify(testRegistrationData, null, 2))
  console.log('')
  
  // API 로직 시뮬레이션
  let normalizedRegistrationData = testRegistrationData
  if (normalizedRegistrationData) {
    // 빈 문자열 필드 제거 및 정규화 (기존 로직)
    const cleanedDataOld: Record<string, any> = {}
    for (const [key, value] of Object.entries(normalizedRegistrationData)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedDataOld[key] = value
      }
    }
    console.log('기존 로직 (빈 문자열 제거):')
    console.log(JSON.stringify(cleanedDataOld, null, 2))
    console.log('')
    
    // 새 로직 (빈 문자열 유지)
    const cleanedDataNew: Record<string, any> = {}
    for (const [key, value] of Object.entries(normalizedRegistrationData)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          cleanedDataNew[key] = value.trim()
        } else {
          cleanedDataNew[key] = value
        }
      }
    }
    console.log('새 로직 (빈 문자열 유지):')
    console.log(JSON.stringify(cleanedDataNew, null, 2))
    console.log('')
  }
  
  // 빈 문자열 테스트
  console.log('=== 빈 문자열 테스트 ===\n')
  const testWithEmptyStrings = {
    email: 'test@example.com',
    name: '테스트',
    position: '', // 빈 문자열
    yearsOfExperience: '', // 빈 문자열
    question: '', // 빈 문자열
    phoneCountryCode: '+82',
  }
  
  console.log('빈 문자열 포함 데이터:')
  console.log(JSON.stringify(testWithEmptyStrings, null, 2))
  console.log('')
  
  // 기존 로직
  const cleanedOld: Record<string, any> = {}
  for (const [key, value] of Object.entries(testWithEmptyStrings)) {
    if (value !== null && value !== undefined && value !== '') {
      cleanedOld[key] = value
    }
  }
  console.log('기존 로직 결과 (빈 문자열 제거됨):')
  console.log(JSON.stringify(cleanedOld, null, 2))
  console.log('')
  
  // 새 로직
  const cleanedNew: Record<string, any> = {}
  for (const [key, value] of Object.entries(testWithEmptyStrings)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'string') {
        cleanedNew[key] = value.trim()
      } else {
        cleanedNew[key] = value
      }
    }
  }
  console.log('새 로직 결과 (빈 문자열 유지됨):')
  console.log(JSON.stringify(cleanedNew, null, 2))
}

testRegistrationDataSave().catch(console.error)
