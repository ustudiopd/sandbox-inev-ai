import dns from 'dns/promises'

const domains = [
  'evntly.ai',
  'evntin.ai',
  'evntup.ai',
  'evntit.ai',
  'evntux.ai',
  'evrun.ai',
  'evway.ai',
  'evlog.ai',
  'evhub.ai',
  'evsys.ai',
  'goevnt.ai',
  'doevnt.ai',
  'tryev.ai',
  'ev-f.ai',
  'e-flow.ai',
  'evflow.ai',
  'ev-on.ai',
  'ev-go.ai',
  'getev.ai',
  'inev.ai',
  'hi-ev.ai',
  'ev-ai.ai',
  'evbit.ai',
  'evset.ai',
  'evlab.ai',
]

interface DomainStatus {
  domain: string
  available: boolean
  error?: string
}

async function checkDomain(domain: string): Promise<DomainStatus> {
  try {
    // DNS A 레코드 조회 시도
    await dns.resolve4(domain)
    // 레코드가 존재하면 사용 중
    return { domain, available: false }
  } catch (error: any) {
    // ENOTFOUND 또는 ENODATA 에러는 도메인이 사용 가능할 수 있음을 의미
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      // 추가로 NS 레코드 확인
      try {
        await dns.resolveNs(domain)
        // NS 레코드가 있으면 사용 중
        return { domain, available: false }
      } catch (nsError: any) {
        if (nsError.code === 'ENOTFOUND' || nsError.code === 'ENODATA') {
          return { domain, available: true }
        }
        return { domain, available: true, error: nsError.message }
      }
    }
    // 다른 에러는 확인 불가
    return { domain, available: false, error: error.message }
  }
}

async function checkAllDomains() {
  console.log('🔍 .ai 도메인 사용 가능 여부 확인 중...\n')
  
  const results: DomainStatus[] = []
  
  for (const domain of domains) {
    const status = await checkDomain(domain)
    results.push(status)
    
    const statusIcon = status.available ? '✅' : '❌'
    const statusText = status.available ? '사용 가능' : '사용 중'
    console.log(`${statusIcon} ${domain.padEnd(20)} - ${statusText}`)
    
    // API 호출 제한을 피하기 위해 약간의 딜레이
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 결과 요약\n')
  
  const available = results.filter(r => r.available)
  const unavailable = results.filter(r => !r.available)
  
  console.log(`✅ 사용 가능한 도메인 (${available.length}개):`)
  if (available.length > 0) {
    available.forEach(r => console.log(`   - ${r.domain}`))
  } else {
    console.log('   없음')
  }
  
  console.log(`\n❌ 사용 중인 도메인 (${unavailable.length}개):`)
  unavailable.forEach(r => {
    const errorText = r.error ? ` (${r.error})` : ''
    console.log(`   - ${r.domain}${errorText}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('\n⚠️  참고: DNS 조회만으로는 100% 정확하지 않을 수 있습니다.')
  console.log('   실제 구매 전에 도메인 등록 사이트에서 최종 확인하세요.\n')
}

checkAllDomains().catch(console.error)
