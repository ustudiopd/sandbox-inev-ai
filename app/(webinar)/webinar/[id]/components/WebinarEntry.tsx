'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientSupabase } from '@/lib/supabase/client'

interface Webinar {
  id: string
  slug?: string | null
  title: string
  description?: string
  youtube_url: string
  start_time?: string
  end_time?: string
  access_policy: string
  email_thumbnail_url?: string | null
  registration_campaign_id?: string | null
  registration_campaign?: {
    id: string
    public_path: string
    title: string
  } | null
  clients?: {
    id: string
    name: string
    logo_url?: string
  }
}

interface WebinarEntryProps {
  webinar: Webinar
}

export default function WebinarEntry({ webinar }: WebinarEntryProps) {
  const router = useRouter()
  const supabase = createClientSupabase()
  // slug가 있으면 slug를 사용하고, 없으면 id를 사용 (URL용)
  const webinarSlug = webinar.slug || webinar.id
  const webinarPath = webinar.slug || webinar.id
  const [mode, setMode] = useState<'login' | 'signup' | 'guest' | 'email_auth' | 'name_email_auth' | 'register'>(
    webinar.access_policy === 'guest_allowed' ? 'guest' : 
    webinar.access_policy === 'email_auth' ? 'email_auth' :
    webinar.access_policy === 'name_email_auth' ? 'name_email_auth' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  
  // 웨비나 접속 페이지 접속 기록
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const trackAccess = async () => {
      try {
        // 세션 ID 가져오기 또는 생성
        let sessionId = localStorage.getItem(`webinar_session_${webinar.id}`)
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
          localStorage.setItem(`webinar_session_${webinar.id}`, sessionId)
        }

        // 접속 기록 API 호출
        await fetch(`/api/webinars/${webinar.id}/access/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        // 주기적으로 세션 갱신 (5분마다)
        intervalId = setInterval(async () => {
          try {
            await fetch(`/api/webinars/${webinar.id}/access/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            })
          } catch (error) {
            console.debug('[WebinarEntry] 세션 갱신 실패:', error)
          }
        }, 5 * 60 * 1000) // 5분
      } catch (error) {
        console.debug('[WebinarEntry] 접속 기록 실패:', error)
      }
    }

    trackAccess()

    // cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [webinar.id])
  
  useEffect(() => {
    // URL에서 이메일 인증 확인 파라미터 체크
    const urlParams = new URLSearchParams(window.location.search)
    const type = urlParams.get('type')
    const token = urlParams.get('token')
    const emailParam = urlParams.get('email')
    const eParam = urlParams.get('e') // Base64 인코딩된 이메일 (다이렉트샌드용)
    
    // 이메일 파라미터 처리: email 우선, 없으면 e 파라미터 디코딩
    let finalEmail: string | null = null
    
    if (emailParam) {
      // 기존 방식: email 파라미터 직접 사용
      finalEmail = emailParam.toLowerCase().trim()
    } else if (eParam) {
      // Base64 디코딩 방식 (다이렉트샌드 호환)
      try {
        // 브라우저 환경에서는 atob() 사용
        const decodedEmail = atob(eParam)
        finalEmail = decodedEmail.toLowerCase().trim()
      } catch (error) {
        console.error('Base64 이메일 디코딩 실패:', error)
        // 디코딩 실패 시 무시하고 계속 진행
      }
    }
    
    // 이메일 파라미터가 있고 email_auth 정책인 경우 자동 로그인 처리
    if (finalEmail && webinar.access_policy === 'email_auth') {
      const emailLower = finalEmail
      
      // 관리자 계정은 이메일 인증으로 접속 불가
      const adminEmails = ['pd@ustudio.co.kr']
      if (adminEmails.includes(emailLower)) {
        setError('관리자 계정은 이메일 인증으로 접속할 수 없습니다. 일반 로그인을 사용해주세요.')
        setMode('login')
        return
      }
      
      setEmail(emailLower)
      setMode('email_auth')
      
      // 자동 로그인 처리
      const autoLogin = async () => {
        setLoading(true)
        try {
          const response = await fetch('/api/auth/email-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: finalEmail,
              webinarId: webinar.id,
            }),
          })
          
          const result = await response.json()
          
          if (!response.ok) {
            setError(result.error || '자동 로그인에 실패했습니다')
            setLoading(false)
            return
          }
          
          // 바로 로그인 처리
          if (result.sessionUrl) {
            window.location.href = result.sessionUrl
          } else if (result.email && result.password) {
            // Fallback: 로그인 API 호출
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: result.email,
              password: result.password,
            })
            if (signInError) {
              setError(signInError.message)
              setLoading(false)
              return
            }
            
            // 세션이 설정될 때까지 최소 대기 (100ms로 단축)
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // 웨비나 등록은 비동기로 처리 (await 제거하여 입장 속도 향상)
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) {
                supabase
                  .from('registrations')
                  .select('webinar_id, user_id')
                  .eq('webinar_id', webinar.id)
                  .eq('user_id', user.id)
                  .maybeSingle()
                  .then(({ data: registration }) => {
                    if (!registration) {
                      // 비동기로 등록 처리 (에러는 무시)
                      fetch(`/api/webinars/${webinar.id}/register`, {
                        method: 'POST',
                      }).catch(() => {})
                    }
                  })
              }
            })
            
            // slug 우선 사용하여 라이브 페이지로 즉시 이동
            window.location.href = `/webinar/${webinarPath}/live`
          }
        } catch (err: any) {
          setError(err.message || '자동 로그인 중 오류가 발생했습니다')
          setLoading(false)
        }
      }
      
      autoLogin()
      return
    }
    
    // 이메일 인증 완료 후 리다이렉트된 경우
    if ((type === 'signup' || type === 'email_auth' || type === 'name_email_auth') && token) {
      // 세션 확인 및 자동 로그인
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          // 프로필 확인을 최적화 (최대 시도 10회, 간격 50ms로 단축)
          const checkProfile = async () => {
            for (let i = 0; i < 10; i++) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle()
              
              if (profile) {
                // 웨비나 등록은 비동기로 처리
                supabase
                  .from('registrations')
                  .select('webinar_id, user_id')
                  .eq('webinar_id', webinar.id)
                  .eq('user_id', session.user.id)
                  .maybeSingle()
                  .then(({ data: registration }) => {
                    if (!registration) {
                      fetch(`/api/webinars/${webinar.id}/register`, {
                        method: 'POST',
                      }).catch(() => {})
                    }
                  })
                
                window.location.href = `/webinar/${webinar.id}/live`
                return
              }
              // 간격을 50ms로 단축
              await new Promise(resolve => setTimeout(resolve, 50))
            }
            // 프로필이 없어도 진행 (트리거가 생성할 것)
            window.location.href = `/webinar/${webinar.id}/live`
          }
          checkProfile()
        }
      })
    } else if (urlParams.get('verified') === 'true' || (type === 'email_auth' && urlParams.get('verified') === 'true') || (type === 'name_email_auth' && urlParams.get('verified') === 'true')) {
      // 이메일 인증 완료 안내 모달 표시 후 라이브 페이지로 이동
      setShowEmailVerification(true)
      
      // 세션 확인 및 자동 이동
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          // 웨비나 등록 확인 및 등록
          const { data: registration } = await supabase
            .from('registrations')
            .select('webinar_id, user_id')
            .eq('webinar_id', webinar.id)
            .eq('user_id', session.user.id)
            .maybeSingle()
          
          if (!registration) {
            try {
              await fetch(`/api/webinars/${webinar.id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nickname: nickname.trim() || null,
                }),
              })
            } catch (error) {
              console.error('웨비나 등록 오류:', error)
            }
          }
          
          setTimeout(() => {
            window.location.href = `/webinar/${webinar.id}/live`
          }, 2000) // 2초 후 자동 이동
        }
      })
    }
    
    // 이미 로그인한 사용자가 이 웨비나에 등록되어 있는지 확인
    const checkExistingSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: registration } = await supabase
          .from('registrations')
          .select('webinar_id, user_id')
          .eq('webinar_id', webinar.id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        // 등록되어 있으면 자동으로 라이브 페이지로 이동하지 않음
        // 사용자가 직접 입장 버튼을 눌러야 함 (게스트 모드 선택 가능)
      }
    }
    
    checkExistingSession()
  }, [webinar.id, router, supabase])
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const { error: loginError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }
      
      // 로그인 성공 시 해당 웨비나에 등록되어 있는지 확인
      if (data.user) {
        // 세션이 설정될 때까지 최소 대기 (100ms로 단축)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 웨비나 등록은 비동기로 처리 (await 제거하여 입장 속도 향상)
        supabase
          .from('registrations')
          .select('webinar_id, user_id')
          .eq('webinar_id', webinar.id)
          .eq('user_id', data.user.id)
          .maybeSingle()
          .then(({ data: registration }) => {
            if (!registration) {
              fetch(`/api/webinars/${webinar.id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nickname: nickname.trim() || null,
                }),
              }).catch(() => {})
            }
          })
        
        // 웨비나 라이브 페이지로 즉시 이동
        window.location.href = `/webinar/${webinar.id}/live`
      }
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다')
      setLoading(false)
    }
  }
  
  const handleGuestEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!nickname || !nickname.trim()) {
      setError('닉네임을 입력해주세요')
      return
    }
    
    setLoading(true)
    
    try {
      // 기존 세션이 있으면 먼저 로그아웃 (웨비나별 독립 세션을 위해)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        // 기존 사용자가 이 웨비나에 등록되어 있는지 확인
        const { data: existingRegistration } = await supabase
          .from('registrations')
          .select('webinar_id, user_id')
          .eq('webinar_id', webinar.id)
          .eq('user_id', currentUser.id)
          .maybeSingle()
        
        // 등록되어 있지 않으면 기존 세션 로그아웃 (새 게스트 계정 생성)
        if (!existingRegistration) {
          await supabase.auth.signOut()
        } else {
          // 이미 등록되어 있으면 바로 입장
          window.location.href = `/webinar/${webinar.id}/live`
          return
        }
      }
      
      // 게스트 계정 생성 API 호출
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          webinarId: webinar.id,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '게스트 입장에 실패했습니다')
      }
      
      // 게스트 계정으로 직접 로그인 (서버에서 생성한 이메일/비밀번호 사용)
      if (result.email && result.password) {
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.password,
        })
        
        if (signInError) {
          console.error('게스트 로그인 실패:', signInError)
          throw new Error('게스트 로그인에 실패했습니다')
        }
        
        // 로그인 성공 후 세션 확인
        if (signInData.user) {
          // 세션이 설정될 때까지 최소 대기 (100ms로 단축)
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // 게스트 계정 생성 및 세션 설정 완료 후 라이브 페이지로 즉시 이동
          window.location.href = `/webinar/${webinar.id}/live`
        } else {
          throw new Error('게스트 로그인 후 사용자 정보를 가져올 수 없습니다')
        }
      } else {
        throw new Error('게스트 계정 정보를 받지 못했습니다')
      }
    } catch (err: any) {
      console.error('게스트 입장 오류:', err)
      setError(err.message || '게스트 입장 중 오류가 발생했습니다')
      setLoading(false)
    }
  }
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !email.trim()) {
      setError('이메일을 입력해주세요')
      return
    }
    
    // email_auth 정책은 이메일만 필요 (기존 동작 유지)
    
    // 관리자 계정은 이메일 인증으로 접속 불가
    const emailLower = email.trim().toLowerCase()
    const adminEmails = ['pd@ustudio.co.kr']
    if (adminEmails.includes(emailLower)) {
      setError('관리자 계정은 이메일 인증으로 접속할 수 없습니다. 일반 로그인을 사용해주세요.')
      setMode('login')
      return
    }
    
    setLoading(true)
    
    try {
      // 웨비나에 연동된 등록 페이지 캠페인에 등록된 사용자인지 확인
      if (webinar.registration_campaign_id) {
        const checkResponse = await fetch(`/api/webinars/${webinar.id}/check-registration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            name: displayName.trim(),
          }),
        })
        
        const checkResult = await checkResponse.json()
        
        if (!checkResult.registered) {
          setError(checkResult.message || '등록 페이지에서 먼저 등록해주세요.')
          setLoading(false)
          return
        }
      }
      
      const response = await fetch('/api/auth/email-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: isWertSummit ? (displayName.trim() || null) : null,
          nickname: nickname.trim() || null,
          webinarId: webinar.id,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '입장 요청에 실패했습니다')
      }
      
      // 비밀번호로 바로 로그인
      if (result.email && result.password) {
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.password,
        })
        
        if (signInError) {
          throw new Error('로그인에 실패했습니다')
        }
        
        // 세션이 설정될 때까지 최소 대기 (100ms로 단축)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 웨비나 등록은 비동기로 처리 (await 제거하여 입장 속도 향상)
        if (signInData.user) {
          supabase
            .from('registrations')
            .select('webinar_id, user_id')
            .eq('webinar_id', webinar.id)
            .eq('user_id', signInData.user.id)
            .maybeSingle()
            .then(({ data: registration }) => {
              if (!registration) {
                fetch(`/api/webinars/${webinar.id}/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nickname: nickname.trim() || null,
                  }),
                }).catch(() => {})
              }
            })
        }
        
        // 웨비나 라이브 페이지로 즉시 이동
        window.location.href = `/webinar/${webinar.id}/live`
      } else {
        throw new Error('로그인 정보를 받지 못했습니다')
      }
    } catch (err: any) {
      setError(err.message || '입장 중 오류가 발생했습니다')
      setLoading(false)
    }
  }

  const handleNameEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !email.trim()) {
      setError('이메일을 입력해주세요')
      return
    }
    
    if (!displayName || !displayName.trim()) {
      setError('이름을 입력해주세요')
      return
    }
    
    // 관리자 계정은 이메일 인증으로 접속 불가
    const emailLower = email.trim().toLowerCase()
    const adminEmails = ['pd@ustudio.co.kr']
    if (adminEmails.includes(emailLower)) {
      setError('관리자 계정은 이메일 인증으로 접속할 수 없습니다. 일반 로그인을 사용해주세요.')
      setMode('login')
      return
    }
    
    setLoading(true)
    
    try {
      // 웨비나에 연동된 등록 페이지 캠페인에 등록된 사용자인지 확인
      if (webinar.registration_campaign_id) {
        const checkResponse = await fetch(`/api/webinars/${webinar.id}/check-registration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            name: displayName.trim(),
          }),
        })
        
        const checkResult = await checkResponse.json()
        
        if (!checkResult.registered) {
          setError(checkResult.message || '등록 페이지에서 먼저 등록해주세요.')
          setLoading(false)
          return
        }
      }
      
      const response = await fetch('/api/auth/email-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim() || null,
          nickname: nickname.trim() || null,
          webinarId: webinar.id,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '입장 요청에 실패했습니다')
      }
      
      // 비밀번호로 바로 로그인
      if (result.email && result.password) {
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.password,
        })
        
        if (signInError) {
          throw new Error('로그인에 실패했습니다')
        }
        
        // 세션이 설정될 때까지 최소 대기 (100ms로 단축)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 웨비나 등록은 비동기로 처리 (await 제거하여 입장 속도 향상)
        if (signInData.user) {
          supabase
            .from('registrations')
            .select('webinar_id, user_id')
            .eq('webinar_id', webinar.id)
            .eq('user_id', signInData.user.id)
            .maybeSingle()
            .then(({ data: registration }) => {
              if (!registration) {
                fetch(`/api/webinars/${webinar.id}/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nickname: nickname.trim() || null,
                  }),
                }).catch(() => {})
              }
            })
        }
        
        // 웨비나 라이브 페이지로 즉시 이동
        window.location.href = `/webinar/${webinar.id}/live`
      } else {
        throw new Error('로그인 정보를 받지 못했습니다')
      }
    } catch (err: any) {
      setError(err.message || '입장 중 오류가 발생했습니다')
      setLoading(false)
    }
  }
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !email.trim()) {
      setError('이메일을 입력해주세요')
      return
    }
    
    if (!displayName || !displayName.trim()) {
      setError('이름을 입력해주세요')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch(`/api/webinars/${webinar.id}/register-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          nickname: nickname.trim() || null,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '등록 신청에 실패했습니다')
      }
      
      // 성공 메시지 표시
      setError('')
      alert('등록 신청이 완료되었습니다. 이메일 인증을 통해 입장할 수 있습니다.')
      
      // 접근 정책에 따라 모드 전환
      if (webinar.access_policy === 'name_email_auth') {
        setMode('name_email_auth')
      } else {
        setMode('email_auth')
      }
      setEmail(email.trim())
      setDisplayName('')
      setNickname(nickname.trim() || '')
      setLoading(false)
    } catch (err: any) {
      setError(err.message || '등록 신청 중 오류가 발생했습니다')
      setLoading(false)
    }
  }
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다')
      return
    }
    
    setLoading(true)
    
    try {
      // 기존 세션이 있으면 먼저 로그아웃 (웨비나별 독립 등록을 위해)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        // 기존 사용자가 이 웨비나에 등록되어 있는지 확인
        const { data: existingRegistration } = await supabase
          .from('registrations')
          .select('webinar_id, user_id')
          .eq('webinar_id', webinar.id)
          .eq('user_id', currentUser.id)
          .maybeSingle()
        
        // 등록되어 있지 않으면 기존 세션 로그아웃 (새 계정 생성)
        if (!existingRegistration) {
          await supabase.auth.signOut()
        } else {
          // 이미 등록되어 있으면 바로 입장
          window.location.href = `/webinar/${webinar.id}/live`
          return
        }
      }
      
      // 닉네임이 지정되면 닉네임을, 아니면 이름을 display_name으로 사용
      const finalDisplayName = nickname.trim() || displayName.trim()
      
      const { error: signupError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: finalDisplayName,
            nickname: nickname.trim() || null, // 닉네임을 별도로 저장 (선택사항)
            role: 'participant',
            webinar_id: webinar.id, // 웨비나 ID를 메타데이터에 저장
          },
          emailRedirectTo: `${window.location.origin}/webinar/${webinarSlug}?verified=true`
        }
      })
      
      if (signupError) {
        setError(signupError.message)
        setLoading(false)
        return
      }
      
      if (data.user) {
        // 프로필 생성 확인 및 업데이트 (트리거로 자동 생성되지만 확인 필요)
        let profileExists = false
        for (let i = 0; i < 50; i++) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle()
          
          if (existingProfile) {
            profileExists = true
            break
          }
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        if (profileExists) {
          // 프로필 업데이트 (display_name, email)
          // 닉네임이 지정되면 닉네임을, 아니면 이름을 display_name으로 사용
          const finalDisplayName = nickname.trim() || displayName.trim()
          // 프로필 업데이트 (타입 오류 회피를 위해 any 사용)
          try {
            const profilesTable = (supabase as any).from('profiles')
            const updateQuery = profilesTable.update({
              display_name: finalDisplayName,
              email: email,
            } as any)
            const result = await updateQuery.eq('id', data.user.id)
            
            if (result?.error) {
              console.error('프로필 업데이트 오류:', result.error)
            }
          } catch (updateError) {
            console.error('프로필 업데이트 오류:', updateError)
          }
        }
        
        // 웨비나 등록 (이 웨비나에 자동 등록)
        try {
          const registerResponse = await fetch(`/api/webinars/${webinar.id}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nickname: nickname.trim() || null,
            }),
          })
          
          if (!registerResponse.ok) {
            console.warn('웨비나 자동 등록 실패:', registerResponse.status)
          }
        } catch (registerError) {
          console.error('웨비나 등록 요청 오류:', registerError)
        }
        
        // 이메일 인증 안내 모달 표시
        setShowEmailVerification(true)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || '등록 중 오류가 발생했습니다')
      setLoading(false)
    }
  }
  
  // 썸네일 이미지 URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  // 웨비나 설정에서 썸네일 URL 사용 (없으면 기본값 사용)
  const getThumbnailUrl = () => {
    // 웨비나에 설정된 썸네일이 있으면 사용
    if (webinar.email_thumbnail_url) {
      return webinar.email_thumbnail_url
    }
    
    // 기본값 설정
    const defaultFileName = (webinar.slug === '884372' || webinar.slug === 'ces-2026-human-ai-talk-show-special-lecture') ? '0114.jpg' : 'edm.png'
    return supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/${defaultFileName}` : ''
  }
  
  const thumbnailUrl = getThumbnailUrl()
  // registration_campaign_id가 있으면 등록 페이지와 연동된 웨비나로 간주
  const hasRegistrationCampaign = !!webinar.registration_campaign_id
  // 하위 호환성을 위해 slug도 확인 (기존 149404 웨비나)
  const isWertSummit = webinarSlug === '149404' || hasRegistrationCampaign
  const wertLogoUrl = supabaseUrl 
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert.png`
    : '/img/wert.png'
  const wert1LogoUrl = supabaseUrl 
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert1.png`
    : '/img/wert1.png'
  
  return (
    <>
      {isWertSummit && (
        <style jsx global>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
          
          html, body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            background-color: #fff;
            margin: 0;
            padding: 0;
          }
          
          .hero-section {
            width: 100%;
            max-width: 1000px;
            margin: 0 auto;
            position: relative;
            background: white;
            min-height: 600px;
            padding-top: 112px;
            padding-bottom: 80px;
            overflow: hidden;
          }
          
          .hero-section-bg {
            width: 1972px;
            height: 1109px;
            position: absolute;
            left: -34px;
            top: 1530px;
            transform-origin: top left;
            transform: rotate(-90deg);
            filter: blur(40px);
            opacity: 0.3;
            z-index: 0;
          }
          
          .hero-header {
            width: 100%;
            max-width: 1000px;
            height: 112px;
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(2px);
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hero-logo {
            width: 320px;
            height: 40px;
          }
          
          .hero-content {
            position: relative;
            z-index: 1;
            max-width: 856px;
            margin: 0 auto;
            padding: 0 72px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 40px;
          }
          
          .hero-title {
            text-align: center;
            font-size: 96px;
            font-weight: 700;
            line-height: 117.6px;
            color: #000;
            margin: 0;
          }
          
          .hero-subtitle {
            text-align: center;
            font-size: 36px;
            font-weight: 700;
            color: #000;
            margin: 0;
          }
          
          .hero-date-badges {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          .hero-date-badge {
            padding: 8px 24px;
            background-color: #000;
            border-radius: 16px;
            color: #fff;
            font-size: 36px;
            font-weight: 700;
            line-height: 54px;
          }
          
          .login-form-container {
            margin-top: 40px;
            max-width: 600px;
            width: 100%;
          }
          
          .login-form-label {
            font-size: 20px;
            font-weight: 600;
            color: #000;
            margin-bottom: 12px;
            display: block;
          }
          
          .login-form-input {
            width: 100%;
            padding: 16px 20px;
            background: #fff;
            border: 2px solid #e5e5e5;
            border-radius: 16px;
            font-size: 18px;
            color: #000;
            font-family: 'Pretendard', sans-serif;
            transition: all 0.3s ease;
          }
          
          .login-form-input:focus {
            outline: none;
            border-color: #00A08C;
            background-color: #fff;
          }
          
          .login-form-input::placeholder {
            color: #999;
          }
          
          .login-form-button {
            width: 100%;
            padding: 20px 48px;
            background-color: #00A08C;
            color: #fff;
            border: none;
            border-radius: 200px;
            font-size: 24px;
            font-weight: 700;
            line-height: 36px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-top: 24px;
          }
          
          .login-form-button:hover {
            background-color: #008f7a;
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 160, 140, 0.3);
          }
          
          .login-form-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          @media (max-width: 768px) {
            .hero-section {
              padding-top: 80px;
              padding-bottom: 60px;
            }
            
            .hero-content {
              padding: 0 20px;
            }
            
            .hero-title {
              font-size: 48px;
              line-height: 60px;
            }
            
            .hero-subtitle {
              font-size: 24px;
            }
            
            .hero-date-badge {
              font-size: 24px;
              padding: 6px 16px;
            }
            
            .login-form-label {
              font-size: 18px;
            }
            
            .login-form-input {
              font-size: 16px;
              padding: 12px 16px;
            }
            
            .login-form-button {
              font-size: 20px;
              padding: 16px 40px;
            }
          }
        `}</style>
      )}
      
      {isWertSummit ? (
        <>
          {/* 히어로 섹션 */}
          <section className="hero-section">
            {/* Background Image - Rotated and Blurred */}
            <div className="hero-section-bg">
              <img
                src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/image 50-1.png`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            
            {/* Header with Logo */}
            <div className="hero-header">
              <img
                src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png`}
                alt="keywert Insight"
                className="hero-logo"
              />
            </div>
            
            {/* Content */}
            <div className="hero-content">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
                  <div className="hero-subtitle">
                    실제 고객사례로 알아보는
                  </div>
                  <h1 className="hero-title">
                    AI 특허리서치<br />
                    <span style={{ whiteSpace: 'nowrap' }}>실무 활용 웨비나</span>
                  </h1>
                  {webinar.start_time && (
                    <div className="hero-date-badges">
                      <div className="hero-date-badge">
                        {new Date(webinar.start_time).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/\. /g, '.').replace(/\.$/, '')}
                      </div>
                      <div className="hero-date-badge">
                        {new Date(webinar.start_time).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 이름/이메일 로그인 폼 */}
              <div className="login-form-container">
                <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label className="login-form-label">이름</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="login-form-input"
                      placeholder="이름을 입력하세요"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="login-form-label">이메일</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="login-form-input"
                      placeholder="이메일을 입력하세요"
                      required
                      disabled={loading}
                    />
                  </div>
                  {error && (
                    <div style={{ padding: '16px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '16px' }}>
                      <p style={{ fontSize: '16px', color: '#c00' }}>{error}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-form-button"
                  >
                    {loading ? '입장 중...' : '웨비나 입장'}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/symbol1.png`}
                      alt=""
                      width={14}
                      height={20}
                      style={{ width: '14px', height: '20px', objectFit: 'contain' }}
                    />
                  </button>
                </form>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="bg-black min-h-screen p-0">
          <div className="px-4 md:px-8 pb-8">
            <div className="max-w-2xl mx-auto">
              {/* 로그인/등록/게스트 폼 */}
              <div className="bg-black border border-gray-800 rounded-xl shadow-lg p-8">
          {webinar.access_policy === 'guest_allowed' && !isWertSummit && (
            <div className={`flex gap-4 mb-6 border-b ${isWertSummit ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setMode('guest')
                  setError('')
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'guest'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                게스트 입장
              </button>
              <button
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'login'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => {
                  setMode('signup')
                  setError('')
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'signup'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                웨비나 등록
              </button>
            </div>
          )}
          {isWertSummit && webinar.registration_campaign?.public_path && (
            <div className="mb-6 text-center">
              <Link 
                href={`/event${webinar.registration_campaign.public_path}`}
                className={`inline-block px-6 py-3 ${isWertSummit ? 'bg-[#4da8da] hover:bg-[#46cdcf] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded-lg font-medium transition-all shadow-lg hover:shadow-xl`}
              >
                메인페이지로 돌아가기
              </Link>
            </div>
          )}
          {webinar.access_policy === 'email_auth' && !isWertSummit && (
            <div className={`flex gap-4 mb-6 border-b ${isWertSummit ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setMode('email_auth')
                  setError('')
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'email_auth'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                웨비나 입장
              </button>
              <button
                onClick={() => {
                  setMode('register')
                  setError('')
                  setPrivacyAgreed(false)
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'register'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                웨비나 등록
              </button>
            </div>
          )}
          {webinar.access_policy === 'name_email_auth' && !isWertSummit && (
            <div className={`flex gap-4 mb-6 border-b ${isWertSummit ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setMode('name_email_auth')
                  setError('')
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'name_email_auth'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                웨비나 입장
              </button>
              <button
                onClick={() => {
                  setMode('register')
                  setError('')
                  setPrivacyAgreed(false)
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'register'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                웨비나 등록
              </button>
            </div>
          )}
          {webinar.access_policy !== 'guest_allowed' && webinar.access_policy !== 'email_auth' && webinar.access_policy !== 'name_email_auth' && !isWertSummit && (
            <div className={`flex gap-4 mb-6 border-b ${isWertSummit ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'login'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => {
                  setMode('signup')
                  setError('')
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'signup'
                    ? `${isWertSummit ? 'text-[#4da8da] border-b-2 border-[#4da8da]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${isWertSummit ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                웨비나 등록
              </button>
            </div>
          )}
          
          {error && (
            <div className={`mb-4 p-4 ${isWertSummit ? 'bg-red-900/30 border-l-4 border-red-500 text-red-300' : 'bg-red-50 border-l-4 border-red-500 text-red-700'} rounded-lg`}>
              {error}
            </div>
          )}
          
          {mode === 'guest' ? (
            <form onSubmit={handleGuestEntry} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>닉네임</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="닉네임을 입력하세요"
                  required
                  disabled={loading}
                  maxLength={20}
                />
                <p className={`mt-1 text-sm ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>닉네임만 입력하면 바로 입장할 수 있습니다</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${isWertSummit ? 'bg-[#4da8da] hover:bg-[#46cdcf]' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'} text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-xl`}
              >
                {loading ? '입장 중...' : '게스트로 입장하기'}
              </button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>
                  닉네임 <span className={`text-xs ${isWertSummit ? 'text-gray-400' : 'text-gray-400'}`}>(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="채팅에 표시될 닉네임 (미입력 시 이름 사용)"
                  disabled={loading}
                  maxLength={20}
                />
                <p className={`mt-1 text-sm ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>닉네임을 입력하지 않으면 이름이 표시됩니다</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${isWertSummit ? 'bg-[#4da8da] hover:bg-[#46cdcf]' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'} text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-xl`}
              >
                {loading ? '로그인 중...' : '웨비나 입장'}
              </button>
            </form>
          ) : mode === 'email_auth' ? (
            <form onSubmit={handleEmailAuth} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이메일 <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="등록된 이메일 주소를 입력하세요"
                  required
                  disabled={loading}
                />
                <p className={`mt-1 text-sm ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>
                  등록된 이메일 주소로 바로 입장할 수 있습니다.
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>
                  닉네임 <span className={`text-xs font-normal ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="닉네임을 입력하세요 (선택사항)"
                  disabled={loading}
                  maxLength={20}
                />
                <p className={`mt-1 text-xs ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>
                  닉네임을 지정하지 않으면 이메일 주소로 표기됩니다.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${isWertSummit ? 'bg-[#4da8da] hover:bg-[#46cdcf]' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'} text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-xl`}
              >
                {loading ? '입장 중...' : '웨비나 입장'}
              </button>
              <div className={`mt-4 p-4 ${isWertSummit ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg`}>
                <p className={`text-xs leading-relaxed ${isWertSummit ? 'text-gray-400' : 'text-gray-600'}`}>
                  입장 확인을 위해 이벤터스로부터 제공받은 최소한의 정보(이메일)만을 활용하며, 해당 정보는 <strong>모두의특강((주)유스튜디오)</strong>의 개인정보 처리방침에 따라 안전하게 보호됩니다.
                </p>
              </div>
            </form>
          ) : mode === 'name_email_auth' ? (
            <form onSubmit={handleNameEmailAuth} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이름 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="등록 시 사용한 이름을 입력하세요"
                  required
                  disabled={loading}
                />
                <p className={`mt-1 text-sm ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>
                  등록 페이지에서 입력한 이름과 일치해야 합니다.
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이메일 <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="등록된 이메일 주소를 입력하세요"
                  required
                  disabled={loading}
                />
                <p className={`mt-1 text-sm ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>
                  등록된 이메일 주소로 바로 입장할 수 있습니다.
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>
                  닉네임 <span className={`text-xs font-normal ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="닉네임을 입력하세요 (선택사항)"
                  disabled={loading}
                  maxLength={20}
                />
                <p className={`mt-1 text-xs ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>
                  닉네임을 지정하지 않으면 이름으로 표기됩니다.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${isWertSummit ? 'bg-[#4da8da] hover:bg-[#46cdcf]' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'} text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-xl`}
              >
                {loading ? '입장 중...' : '웨비나 입장'}
              </button>
              <div className={`mt-4 p-4 ${isWertSummit ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg`}>
                <p className={`text-xs leading-relaxed ${isWertSummit ? 'text-gray-400' : 'text-gray-600'}`}>
                  입장 확인을 위해 이벤터스로부터 제공받은 최소한의 정보(이름, 이메일)만을 활용하며, 해당 정보는 <strong>모두의특강((주)유스튜디오)</strong>의 개인정보 처리방침에 따라 안전하게 보호됩니다.
                </p>
              </div>
            </form>
          ) : mode === 'register' && !isWertSummit ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className={`mb-4 p-3 ${isWertSummit ? 'bg-[#4da8da]/20 border-[#4da8da]/30' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                <p className={`text-sm ${isWertSummit ? 'text-[#4da8da]' : 'text-blue-800'}`}>
                  <strong>웨비나 등록 신청</strong><br />
                  등록 신청 후 이메일 인증을 통해 입장할 수 있습니다.
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이메일 <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이름 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="이름을 입력하세요"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>
                  닉네임 <span className={`text-xs font-normal ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="닉네임을 입력하세요 (선택사항)"
                  disabled={loading}
                  maxLength={20}
                />
                <p className={`mt-1 text-xs ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>
                  닉네임을 지정하지 않으면 이름으로 표기됩니다.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="privacy-agree"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className={`mt-1 w-4 h-4 ${isWertSummit ? 'text-[#4da8da] border-gray-700 focus:ring-[#4da8da]' : 'text-blue-600 border-gray-300 focus:ring-blue-500'} rounded`}
                  disabled={loading}
                />
                <label htmlFor="privacy-agree" className={`text-sm cursor-pointer ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>
                  [필수] <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className={`${isWertSummit ? 'text-[#4da8da] hover:text-[#46cdcf]' : 'text-blue-600 hover:text-blue-800'} underline`}
                  >
                    개인정보 수집 및 이용
                  </button>에 동의합니다.
                </label>
              </div>
              <button
                type="submit"
                disabled={loading || !privacyAgreed}
                className={`w-full ${isWertSummit ? 'bg-[#4da8da] hover:bg-[#46cdcf]' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'} text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl`}
              >
                {loading ? '등록 중...' : '웨비나 등록 및 입장하기'}
              </button>
            </form>
          ) : mode === 'signup' && !isWertSummit ? (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className={`mb-4 p-3 ${isWertSummit ? 'bg-[#4da8da]/20 border-[#4da8da]/30' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                <p className={`text-sm ${isWertSummit ? 'text-[#4da8da]' : 'text-blue-800'}`}>
                  <strong>웨비나 등록</strong><br />
                  이 웨비나에만 등록되며, 다른 웨비나에는 별도로 등록해야 합니다.
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이름 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="이름을 입력하세요"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>
                  닉네임 <span className={`text-xs font-normal ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="닉네임을 입력하세요 (선택사항)"
                  disabled={loading}
                  maxLength={20}
                />
                <p className={`mt-1 text-xs ${isWertSummit ? 'text-gray-400' : 'text-gray-500'}`}>
                  닉네임을 지정하지 않으면 이름으로 표기됩니다.
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>이메일 <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isWertSummit ? 'text-gray-300' : 'text-gray-700'}`}>비밀번호 <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 ${isWertSummit ? 'bg-gray-900 text-white border-gray-700 focus:ring-[#4da8da]' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'} border rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="•••••••• (최소 6자)"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${isWertSummit ? 'bg-[#4da8da] hover:bg-[#46cdcf]' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'} text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-xl`}
              >
                {loading ? '등록 중...' : '웨비나 등록하고 입장하기'}
              </button>
            </form>
          ) : isWertSummit ? (
            <div className="text-center py-8">
              <p className={`text-lg mb-6 ${isWertSummit ? 'text-gray-300' : 'text-gray-600'}`}>
                웨비나 등록은 이벤트 페이지에서 진행해주세요.
              </p>
            </div>
          ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 이메일 인증 확인 안내 모달 */}
      {showEmailVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">이메일 인증이 필요합니다</h2>
              <p className="text-gray-600 mb-6">
                {mode === 'email_auth' ? (
                  <>
                    <strong>{email}</strong>로 전송된 인증 링크를 확인해주세요.<br />
                    이메일의 링크를 클릭하면 웨비나에 입장할 수 있습니다.
                  </>
                ) : (
                  <>
                    등록이 완료되었습니다!<br />
                <strong>{email}</strong>로 전송된 인증 이메일을 확인해주세요.<br />
                이메일 인증을 완료한 후 웨비나에 입장할 수 있습니다.
                  </>
                )}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowEmailVerification(false)
                    setMode('login')
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  확인
                </button>
                <button
                  onClick={() => {
                    setShowEmailVerification(false)
                  }}
                  className="w-full text-gray-600 py-2 hover:text-gray-800 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 개인정보 수집 및 이용 동의 모달 */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">개인정보 수집 및 이용 동의</h2>
              <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                <p>
                  <strong>(주)유스튜디오</strong>(이하 '회사')는 '모두의특강' 웨비나 진행을 위해 아래와 같이 개인정보를 수집 및 이용합니다.
                </p>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. 수집 및 이용 목적</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>웨비나 신청 접수 및 참여 자격 확인</li>
                    <li>웨비나 접속 링크(URL) 및 안내 메일 발송</li>
                    <li>행사 진행 관련 공지사항 전달</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. 수집하는 개인정보 항목</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>필수항목: 이름, 이메일</li>
                    <li>선택항목: 닉네임</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. 개인정보의 보유 및 이용 기간</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>수집 목적 달성 시(웨비나 종료 및 관련 안내 완료 시)까지</li>
                    <li>단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. 동의 거부 권리 및 불이익</h3>
                  <p>
                    귀하는 개인정보 수집 및 이용에 거부할 권리가 있습니다. 단, 동의를 거부할 경우 웨비나 신청 및 참여가 제한될 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowPrivacyModal(false)
                    setPrivacyAgreed(true)
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  동의하고 닫기
                </button>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="flex-1 text-gray-600 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 이메일 인증 확인 안내 모달 */}
      {showEmailVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">이메일 인증이 필요합니다</h2>
              <p className="text-gray-600 mb-6">
                {mode === 'email_auth' ? (
                  <>
                    <strong>{email}</strong>로 전송된 인증 링크를 확인해주세요.<br />
                    이메일의 링크를 클릭하면 웨비나에 입장할 수 있습니다.
                  </>
                ) : (
                  <>
                    등록이 완료되었습니다!<br />
                <strong>{email}</strong>로 전송된 인증 이메일을 확인해주세요.<br />
                이메일 인증을 완료한 후 웨비나에 입장할 수 있습니다.
                  </>
                )}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowEmailVerification(false)
                    setMode('login')
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  확인
                </button>
                <button
                  onClick={() => {
                    setShowEmailVerification(false)
                  }}
                  className="w-full text-gray-600 py-2 hover:text-gray-800 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 개인정보 수집 및 이용 동의 모달 */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">개인정보 수집 및 이용 동의</h2>
              <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                <p>
                  <strong>(주)유스튜디오</strong>(이하 '회사')는 '모두의특강' 웨비나 진행을 위해 아래와 같이 개인정보를 수집 및 이용합니다.
                </p>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. 수집 및 이용 목적</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>웨비나 신청 접수 및 참여 자격 확인</li>
                    <li>웨비나 접속 링크(URL) 및 안내 메일 발송</li>
                    <li>행사 진행 관련 공지사항 전달</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. 수집하는 개인정보 항목</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>필수항목: 이름, 이메일</li>
                    <li>선택항목: 닉네임</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. 개인정보의 보유 및 이용 기간</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>수집 목적 달성 시(웨비나 종료 및 관련 안내 완료 시)까지</li>
                    <li>단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. 동의 거부 권리 및 불이익</h3>
                  <p>
                    귀하는 개인정보 수집 및 이용에 거부할 권리가 있습니다. 단, 동의를 거부할 경우 웨비나 신청 및 참여가 제한될 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowPrivacyModal(false)
                    setPrivacyAgreed(true)
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  동의하고 닫기
                </button>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="flex-1 text-gray-600 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

