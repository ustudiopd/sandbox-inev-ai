/**
 * 오늘 오후 1시 이후 접속자 520명 전체 데이터 CSV 내보내기
 * 설문 답변한 사람은 답변 포함, 안 한 사람은 빈 값
 * 149403 등록 정보 매칭 포함
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const WEBINAR_ID = 'f257ce42-723a-4fad-a9a5-1bd8c154d7ce'
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function toKST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

function getKSTDate(year: number, month: number, date: number, hour: number, minute: number = 0): Date {
  const kstDate = new Date(Date.UTC(year, month, date, hour, minute, 0))
  return new Date(kstDate.getTime() - KST_OFFSET_MS)
}

function escapeCsv(str: string): string {
  if (!str) return ''
  const strValue = String(str)
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`
  }
  return strValue
}

// choice_ids를 텍스트로 변환
function formatChoiceAnswer(choiceIds: any, options: any): string {
  if (!choiceIds || !Array.isArray(choiceIds) || choiceIds.length === 0) {
    return ''
  }
  
  // options가 JSON 문자열인 경우 파싱
  let optionsArray: any[] = []
  if (typeof options === 'string') {
    try {
      optionsArray = JSON.parse(options)
    } catch (e) {
      // 파싱 실패 시 원본 반환
      return choiceIds.join(', ')
    }
  } else if (Array.isArray(options)) {
    optionsArray = options
  } else {
    return choiceIds.join(', ')
  }
  
  const optionMap = new Map(optionsArray.map((opt: any) => [String(opt.id), opt.text]))
  const answerTexts = choiceIds.map((id: string) => optionMap.get(String(id)) || id)
  return answerTexts.join(', ')
}

async function exportSurveyResponses() {
  console.log('=== 설문조사 응답자 데이터 내보내기 ===\n')

  const now = new Date()
  const kstNow = toKST(now)
  const year = kstNow.getUTCFullYear()
  const month = kstNow.getUTCMonth()
  const date = kstNow.getUTCDate()

  const startTime = getKSTDate(year, month, date, 13, 0)

  console.log(`시간 범위: 오늘 오후 1시 이후 (KST)\n`)

  // 설문 질문 조회
  const { data: questions, error: questionsError } = await admin
    .from('form_questions')
    .select('id, order_no, body, type, options')
    .eq('form_id', '0e60481a-9da4-4bbb-9c0a-e46d5031d6a5')
    .order('order_no')

  if (questionsError || !questions) {
    console.error('설문 질문 조회 실패:', questionsError)
    return
  }

  console.log(`설문 질문 수: ${questions.length}개\n`)

  // 오늘 오후 1시 이후 접속자 조회
  const { data: accessSessions, error: sessionsError } = await admin
    .from('webinar_user_sessions')
    .select('user_id')
    .eq('webinar_id', WEBINAR_ID)
    .not('user_id', 'is', null)
    .gte('entered_at', startTime.toISOString())

  if (sessionsError) {
    console.error('접속 기록 조회 실패:', sessionsError)
    return
  }

  const accessUserIds = [...new Set((accessSessions || []).map((s: any) => s.user_id).filter(Boolean))]
  console.log(`오늘 오후 1시 이후 접속자 수: ${accessUserIds.length}명\n`)

  if (accessUserIds.length === 0) {
    console.log('해당 시간 범위에 접속한 사용자가 없습니다.')
    return
  }

  // 접속자 프로필 정보 조회 (배치로)
  const BATCH_SIZE = 100
  const allProfiles: any[] = []
  
  for (let i = 0; i < accessUserIds.length; i += BATCH_SIZE) {
    const batch = accessUserIds.slice(i, i + BATCH_SIZE)
    const { data: batchProfiles, error: batchError } = await admin
      .from('profiles')
      .select('id, email, display_name, nickname')
      .in('id', batch)
    
    if (batchError) {
      console.error(`프로필 배치 ${i / BATCH_SIZE + 1} 조회 실패:`, batchError)
      continue
    }
    
    if (batchProfiles) {
      allProfiles.push(...batchProfiles)
    }
  }

  // 설문 제출 정보 조회 (배치로)
  const allSubmissions: any[] = []
  
  for (let i = 0; i < accessUserIds.length; i += BATCH_SIZE) {
    const batch = accessUserIds.slice(i, i + BATCH_SIZE)
    const { data: batchSubmissions, error: batchError } = await admin
      .from('form_submissions')
      .select('id, participant_id, submitted_at')
      .eq('form_id', '0e60481a-9da4-4bbb-9c0a-e46d5031d6a5')
      .not('participant_id', 'is', null)
      .in('participant_id', batch)
    
    if (batchError) {
      console.error(`설문 제출 배치 ${i / BATCH_SIZE + 1} 조회 실패:`, batchError)
      continue
    }
    
    if (batchSubmissions) {
      allSubmissions.push(...batchSubmissions)
    }
  }
  
  // 중복 제거 (같은 사용자가 여러 번 제출한 경우)
  const uniqueSubmissions = new Map()
  allSubmissions.forEach((s: any) => {
    if (s.participant_id && !uniqueSubmissions.has(s.participant_id)) {
      uniqueSubmissions.set(s.participant_id, s)
    }
  })
  const submissionsMap = new Map(Array.from(uniqueSubmissions.values()).map((s: any) => [s.participant_id, s]))
  console.log(`설문 제출한 사람 수: ${submissionsMap.size}명\n`)

  // 설문 답변 조회 (제출한 사람만)
  const submissionIds = Array.from(submissionsMap.values()).map((s: any) => s.id)
  let answers: any[] = []
  
  if (submissionIds.length > 0) {
    // 배치로 답변 조회
    for (let i = 0; i < submissionIds.length; i += BATCH_SIZE) {
      const batch = submissionIds.slice(i, i + BATCH_SIZE)
      const { data: batchAnswers, error: batchError } = await admin
        .from('form_answers')
        .select('submission_id, question_id, choice_ids, text_answer')
        .in('submission_id', batch)
      
      if (batchError) {
        console.error(`답변 배치 ${i / BATCH_SIZE + 1} 조회 실패:`, batchError)
        continue
      }
      
      if (batchAnswers) {
        answers.push(...batchAnswers)
      }
    }
  }

  // 답변을 submission_id와 question_id로 매핑
  const answersMap = new Map<string, any>()
  answers.forEach((a: any) => {
    const key = `${a.submission_id}_${a.question_id}`
    answersMap.set(key, a)
  })

  // 등록 정보 조회 (닉네임 우선순위) - 접속자 전체
  const { data: registrations, error: registrationsError } = await admin
    .from('registrations')
    .select('user_id, nickname')
    .eq('webinar_id', WEBINAR_ID)
    .in('user_id', accessUserIds)

  const registrationsMap = new Map(
    (registrations || []).map((r: any) => [r.user_id, r])
  )

  // 149403 등록 정보 조회
  console.log('149403 등록 정보 조회 중...\n')
  const { data: campaign149403, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path')
    .eq('public_path', '/149403')
    .maybeSingle()

  let entries149403Map = new Map<string, any>()
  
  if (!campaignError && campaign149403) {
    console.log(`149403 캠페인 찾음: ${campaign149403.title} (ID: ${campaign149403.id})\n`)
    
    // 149403 등록 정보 조회 (배치로)
    const allEntries149403: any[] = []
    let offset = 0
    const LIMIT = 1000
    
    while (true) {
      const { data: batchEntries, error: entriesError } = await admin
        .from('event_survey_entries')
        .select('*')
        .eq('campaign_id', campaign149403.id)
        .range(offset, offset + LIMIT - 1)
        .order('created_at', { ascending: true })
      
      if (entriesError) {
        console.error(`149403 등록 정보 조회 실패:`, entriesError)
        break
      }
      
      if (!batchEntries || batchEntries.length === 0) {
        break
      }
      
      allEntries149403.push(...batchEntries)
      
      if (batchEntries.length < LIMIT) {
        break
      }
      
      offset += LIMIT
    }
    
    console.log(`149403 등록 정보 ${allEntries149403.length}개 조회 완료\n`)
    
    // 이메일로 매핑 (registration_data에서 이메일 추출)
    allEntries149403.forEach((entry: any) => {
      const regData = entry.registration_data || {}
      const email = regData.email || entry.email || ''
      
      if (email) {
        // 이메일을 소문자로 정규화하여 매칭
        const normalizedEmail = email.toLowerCase().trim()
        if (!entries149403Map.has(normalizedEmail)) {
          entries149403Map.set(normalizedEmail, entry)
        }
      }
      
      // name, company도 별도로 저장 (이메일이 없는 경우 대비)
      if (entry.name) {
        const normalizedName = entry.name.trim()
        if (!entries149403Map.has(`name:${normalizedName}`)) {
          entries149403Map.set(`name:${normalizedName}`, entry)
        }
      }
    })
  } else {
    console.log('149403 캠페인을 찾을 수 없습니다.\n')
  }

  // 질문별 컬럼 헤더 생성 (질문 본문에 이미 번호가 포함되어 있음, 줄바꿈 제거)
  const questionHeaders = questions.map((q: any) => q.body.replace(/\n/g, ' ').trim())

  // 149403 등록 정보 컬럼 헤더 생성
  const registrationHeaders = [
    '등록_이름',
    '등록_회사',
    '등록_전화번호',
    '등록_이메일',
    '등록_직책',
    '등록_우편번호',
    '등록_도시',
    '등록_국가',
    '등록_전화국가코드',
    '등록_이메일동의',
    '등록_전화동의',
    '등록_개인정보동의',
    '등록_기타정보'
  ]

  // CSV 헤더 생성
  const csvHeaders = ['고유값', '이메일', '이름', ...questionHeaders, ...registrationHeaders]
  const csvRows: string[] = []

  // 접속자 전체에 대해 행 생성
  for (const userId of accessUserIds) {
    const profile = allProfiles.find((p: any) => p.id === userId)
    if (!profile) continue

    const registration = registrationsMap.get(userId)
    
    // 이름 결정
    let name = '익명'
    if (registration?.nickname) {
      name = registration.nickname
    } else if (profile.nickname) {
      name = profile.nickname
    } else if (profile.display_name) {
      name = profile.display_name
    } else if (profile.email) {
      name = profile.email
    }

    const email = profile.email || ''
    
    // 각 질문에 대한 답변 수집 (설문 제출한 경우만)
    const row: string[] = [
      escapeCsv(userId),
      escapeCsv(email),
      escapeCsv(name),
    ]

    const submission = submissionsMap.get(userId)
    
    for (const question of questions) {
      let answerText = ''
      
      if (submission) {
        const answerKey = `${submission.id}_${question.id}`
        const answer = answersMap.get(answerKey)
        
        if (answer) {
          if (answer.text_answer) {
            answerText = answer.text_answer
          } else if (answer.choice_ids) {
            answerText = formatChoiceAnswer(answer.choice_ids, question.options)
          }
        }
      }

      row.push(escapeCsv(answerText))
    }

    // 149403 등록 정보 매칭
    const normalizedEmail = email.toLowerCase().trim()
    const entry149403 = entries149403Map.get(normalizedEmail) || entries149403Map.get(`name:${name}`)
    
    if (entry149403) {
      const regData = entry149403.registration_data || {}
      
      // 등록 정보 추출
      const regName = entry149403.name || regData.name || regData.firstName || ''
      const regCompany = entry149403.company || regData.company || ''
      const regPhone = entry149403.phone_norm || regData.phone || regData.phoneCountryCode || ''
      const regEmail = regData.email || entry149403.email || email
      const regJobTitle = regData.jobTitle || regData.role || ''
      const regPostalCode = regData.postalCode || ''
      const regCity = regData.city || ''
      const regCountry = regData.country || ''
      const regPhoneCountryCode = regData.phoneCountryCode || ''
      const regConsentEmail = regData.consentEmail !== undefined ? (regData.consentEmail ? '예' : '아니오') : ''
      const regConsentPhone = regData.consentPhone !== undefined ? (regData.consentPhone ? '예' : '아니오') : ''
      const regPrivacyConsent = regData.privacyConsent !== undefined ? (regData.privacyConsent ? '예' : '아니오') : ''
      
      // 기타 정보는 JSON 문자열로 저장
      const otherData: any = {}
      Object.keys(regData).forEach(key => {
        if (!['email', 'name', 'firstName', 'lastName', 'company', 'phone', 'phoneCountryCode', 
              'jobTitle', 'role', 'postalCode', 'city', 'country', 
              'consentEmail', 'consentPhone', 'privacyConsent'].includes(key)) {
          otherData[key] = regData[key]
        }
      })
      const regOtherInfo = Object.keys(otherData).length > 0 ? JSON.stringify(otherData) : ''
      
      row.push(
        escapeCsv(regName),
        escapeCsv(regCompany),
        escapeCsv(regPhone),
        escapeCsv(regEmail),
        escapeCsv(regJobTitle),
        escapeCsv(regPostalCode),
        escapeCsv(regCity),
        escapeCsv(regCountry),
        escapeCsv(regPhoneCountryCode),
        escapeCsv(regConsentEmail),
        escapeCsv(regConsentPhone),
        escapeCsv(regPrivacyConsent),
        escapeCsv(regOtherInfo)
      )
    } else {
      // 등록 정보가 없는 경우 빈 값
      row.push('', '', '', '', '', '', '', '', '', '', '', '', '')
    }

    csvRows.push(row.join(','))
  }

  // CSV 생성
  const csvContent = csvHeaders.join(',') + '\n' + csvRows.join('\n')

  // 파일 저장
  const outputDir = path.join(process.cwd(), 'exports')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `webinar-149402-survey-responses-${year}${String(month + 1).padStart(2, '0')}${String(date).padStart(2, '0')}-after-1pm.csv`
  const filepath = path.join(outputDir, filename)

  fs.writeFileSync(filepath, '\uFEFF' + csvContent, 'utf8')

  console.log('=== 내보내기 완료 ===')
  console.log(`파일 경로: ${filepath}`)
  console.log(`총 ${accessUserIds.length}명의 접속자 데이터가 저장되었습니다.`)
  console.log(`- 설문 답변한 사람: ${submissionsMap.size}명`)
  console.log(`- 설문 답변 안 한 사람: ${accessUserIds.length - submissionsMap.size}명`)
}

exportSurveyResponses()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('내보내기 중 오류 발생:', error)
    process.exit(1)
  })
