/**
 * 더미 데이터 생성 스크립트 정리
 * 
 * 이 스크립트는 더미 데이터를 생성하는 스크립트들을 비활성화합니다.
 */

import * as fs from 'fs'
import * as path from 'path'

const scriptsToDisable = [
  'force-recover-entries.ts',
  'recover-from-access-logs.ts',
  'clean-and-create-87.ts',
  'create-87-conversions-clean.ts',
  'fix-87-conversions-final.ts',
  'fix-87-conversions-complete.ts',
  'restore-87-conversions-final.ts',
  'restore-87-conversions.ts',
]

console.log('='.repeat(80))
console.log('더미 데이터 생성 스크립트 비활성화')
console.log('='.repeat(80))
console.log('')

const scriptsDir = path.join(process.cwd(), 'scripts')

for (const scriptName of scriptsToDisable) {
  const scriptPath = path.join(scriptsDir, scriptName)
  
  if (fs.existsSync(scriptPath)) {
    // 파일 이름 변경 (비활성화)
    const disabledName = scriptName.replace('.ts', '.disabled.ts')
    const disabledPath = path.join(scriptsDir, disabledName)
    
    try {
      fs.renameSync(scriptPath, disabledPath)
      console.log(`✅ ${scriptName} → ${disabledName}`)
    } catch (error: any) {
      console.error(`❌ ${scriptName}: ${error.message}`)
    }
  } else {
    console.log(`⚠️  ${scriptName}: 파일 없음`)
  }
}

console.log('')
console.log('='.repeat(80))
console.log('✅ 완료')
console.log('')
console.log('비활성화된 스크립트는 .disabled.ts 확장자로 변경되었습니다.')
console.log('필요시 다시 활성화할 수 있습니다.')
