import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 등록 패턴 분석
 * 등록 데이터만으로 유입 경로 추정 시도
 */
async function analyzeRegistrationPatterns() {
  const admin = createAdminSupabase()
  
  console.log('=== 등록 패턴 분석 ===\n')
  
  // 오늘 오전 9시 이후 등록 데이터
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nineAM = new Date(today)
  nineAM.setHours(9, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, name, phone_norm, registration_data')
    .gte('created_at', nineAM.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: true })
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  오늘 오전 9시 이후 등록 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 오늘 오전 9시 이후 등록: ${entries.length}개\n`)
  
  // 시간대별 집중도 분석
  const hourlyMap = new Map<number, number>()
  entries.forEach((entry: any) => {
    const hour = new Date(entry.created_at).getHours()
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
  })
  
  console.log('⏰ 시간대별 등록 집중도:\n')
  const sortedHours = Array.from(hourlyMap.entries())
    .sort((a, b) => a[0] - b[0])
  
  sortedHours.forEach(([hour, count]) => {
    const bar = '█'.repeat(Math.floor((count / Math.max(...hourlyMap.values())) * 20))
    console.log(`  ${hour.toString().padStart(2, '0')}:00 ${bar} ${count}개`)
  })
  console.log('')
  
  // 등록 간격 분석 (폭발적 증가 시점 확인)
  const intervals: number[] = []
  for (let i = 1; i < entries.length; i++) {
    const prevTime = new Date(entries[i - 1].created_at).getTime()
    const currTime = new Date(entries[i].created_at).getTime()
    const interval = (currTime - prevTime) / 1000 // 초 단위
    intervals.push(interval)
  }
  
  // 빠른 연속 등록 구간 찾기 (30초 이내)
  const rapidRegistrations: Array<{ start: string; end: string; count: number; duration: number }> = []
  let rapidStart: Date | null = null
  let rapidCount = 0
  
  for (let i = 0; i < entries.length; i++) {
    const entryTime = new Date(entries[i].created_at)
    
    if (rapidStart === null) {
      rapidStart = entryTime
      rapidCount = 1
    } else {
      const timeDiff = (entryTime.getTime() - rapidStart.getTime()) / 1000
      
      if (timeDiff <= 60) { // 1분 이내
        rapidCount++
      } else {
        // 구간 종료
        if (rapidCount >= 5) { // 5개 이상 연속 등록
          const endTime = new Date(entries[i - 1].created_at)
          rapidRegistrations.push({
            start: rapidStart.toISOString(),
            end: endTime.toISOString(),
            count: rapidCount,
            duration: (endTime.getTime() - rapidStart.getTime()) / 1000,
          })
        }
        rapidStart = entryTime
        rapidCount = 1
      }
    }
  }
  
  // 마지막 구간 처리
  if (rapidCount >= 5) {
    const endTime = new Date(entries[entries.length - 1].created_at)
    rapidRegistrations.push({
      start: rapidStart!.toISOString(),
      end: endTime.toISOString(),
      count: rapidCount,
      duration: (endTime.getTime() - rapidStart!.getTime()) / 1000,
    })
  }
  
  if (rapidRegistrations.length > 0) {
    console.log('🚀 빠른 연속 등록 구간 (1분 이내 5개 이상):\n')
    rapidRegistrations.forEach((rapid, idx) => {
      const startTime = new Date(rapid.start)
      const endTime = new Date(rapid.end)
      const rate = rapid.duration > 0 ? (rapid.count / rapid.duration * 60).toFixed(1) : '0'
      
      console.log(`  구간 ${idx + 1}:`)
      console.log(`    시작: ${startTime.toLocaleString('ko-KR')}`)
      console.log(`    종료: ${endTime.toLocaleString('ko-KR')}`)
      console.log(`    등록 수: ${rapid.count}개`)
      console.log(`    지속 시간: ${(rapid.duration / 60).toFixed(1)}분`)
      console.log(`    등록 속도: ${rate}개/분`)
      console.log('')
    })
  }
  
  // 등록 데이터에서 이메일 도메인 분석 (가능하면)
  const emailDomains = new Map<string, number>()
  entries.forEach((entry: any) => {
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const email = entry.registration_data.email
      if (email && typeof email === 'string') {
        const domain = email.split('@')[1]
        if (domain) {
          emailDomains.set(domain, (emailDomains.get(domain) || 0) + 1)
        }
      }
    }
  })
  
  if (emailDomains.size > 0) {
    console.log('📧 이메일 도메인 분포 (상위 10개):\n')
    const sortedDomains = Array.from(emailDomains.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    sortedDomains.forEach(([domain, count]) => {
      const pct = ((count / entries.length) * 100).toFixed(1)
      console.log(`  ${domain}: ${count}개 (${pct}%)`)
    })
    console.log('')
  }
  
  // 링크 생성 시간과 등록 시간 상관관계
  const { data: allLinks } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, created_at, target_campaign_id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (allLinks && allLinks.length > 0) {
    console.log('🔗 링크 생성 시간 vs 등록 시간 상관관계:\n')
    
    // 오늘 오전 9시 이후 생성된 링크
    const todayLinks = allLinks.filter((link: any) => {
      const linkDate = new Date(link.created_at)
      return linkDate >= nineAM
    })
    
    if (todayLinks.length > 0) {
      console.log(`오늘 오전 9시 이후 생성된 링크: ${todayLinks.length}개\n`)
      todayLinks.forEach((link: any) => {
        const linkTime = new Date(link.created_at)
        console.log(`  ${link.name || link.id}:`)
        console.log(`    생성: ${linkTime.toLocaleString('ko-KR')}`)
        console.log(`    UTM Source: ${link.utm_source || '(없음)'}`)
        
        // 이 링크 생성 이후 등록 수 확인
        const registrationsAfterLink = entries.filter((e: any) => 
          new Date(e.created_at) >= linkTime
        )
        
        console.log(`    생성 이후 등록: ${registrationsAfterLink.length}개`)
        console.log('')
      })
    } else {
      console.log('오늘 오전 9시 이후 생성된 링크 없음\n')
      
      // 가장 최근 링크 확인
      const latestLink = allLinks[0]
      const latestLinkTime = new Date(latestLink.created_at)
      console.log(`가장 최근 링크: ${latestLink.name || latestLink.id}`)
      console.log(`  생성: ${latestLinkTime.toLocaleString('ko-KR')}`)
      console.log(`  UTM Source: ${latestLink.utm_source || '(없음)'}`)
      
      const registrationsAfterLatestLink = entries.filter((e: any) =>
        new Date(e.created_at) >= latestLinkTime
      )
      
      console.log(`  생성 이후 등록: ${registrationsAfterLatestLink.length}개`)
      console.log('')
    }
  }
  
  // 결론
  console.log('📌 분석 결론:\n')
  
  if (rapidRegistrations.length > 0) {
    const totalRapid = rapidRegistrations.reduce((sum, r) => sum + r.count, 0)
    const pct = ((totalRapid / entries.length) * 100).toFixed(1)
    console.log(`  - 빠른 연속 등록: ${totalRapid}개 (${pct}%)`)
    console.log(`    → 특정 채널(이메일/소셜)을 통한 집중 유입 가능성`)
  }
  
  const maxHour = Array.from(hourlyMap.entries())
    .sort((a, b) => b[1] - a[1])[0]
  
  if (maxHour) {
    console.log(`  - 가장 많은 유입 시간대: ${maxHour[0]}:00 (${maxHour[1]}개)`)
    console.log(`    → 해당 시간대에 링크 배포 또는 캠페인 실행 가능성`)
  }
  
  console.log(`  - Visit 로그 없음: 등록 페이지 직접 접속 또는 Visit 추적 미작동`)
  console.log(`  - UTM/링크 ID 없음: 추적 정보 저장 실패`)
}

analyzeRegistrationPatterns().catch(console.error)
