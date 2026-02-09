import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

;(async () => {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('events')
    .select('*')
    .eq('code', '722895')
    .single()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  // 큰 숫자를 문자열로 변환하여 직렬화 오류 방지
  const safeStringify = (obj: any): string => {
    return JSON.stringify(obj, (key, value) => {
      // 숫자이고 32비트 signed int 범위를 초과하는 경우 문자열로 변환
      if (typeof value === 'number' && (value > 2147483647 || value < -2147483648)) {
        return String(value)
      }
      return value
    }, 2)
  }

  console.log(safeStringify(data))
})()
  .then(() => {
    // 모든 비동기 작업이 완료되도록 짧은 지연 후 종료
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('예외 발생:', error)
    setTimeout(() => process.exit(1), 100)
  })
