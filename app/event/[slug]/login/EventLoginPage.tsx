'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Bebas_Neue } from 'next/font/google'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

const EVENT_222152_COOKIE = 'event_222152_attendee'

interface EventLoginPageProps {
  slug: string
}

export default function EventLoginPage({ slug }: EventLoginPageProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmedName = name.trim()
    const normalizedPhone = phone.trim().replace(/[\s-]/g, '')
    if (trimmedName === '홍길동' && normalizedPhone === '00012345678') {
      setLoading(true)
      document.cookie = `${EVENT_222152_COOKIE}=1; path=/; max-age=86400`
      router.push(`/event/${slug}/`)
      router.refresh()
    } else {
      setError('아이디(이름) 또는 비밀번호(핸드폰 번호)를 확인해 주세요.')
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: '1920px',
        height: '960px',
        background: '#F9F9F9',
      }}
    >
      {/* 로그인 프레임 — 배경은 페이지와 동일 #F9F9F9 */}
      <div
        className="absolute"
        style={{
          width: '500px',
          height: '540px',
          left: '250px',
          top: '210px',
          background: '#F9F9F9',
        }}
      >
        {/* Login. — 위 48px, 왼쪽 70px (Bebas Neue는 weight 400만 지원) */}
        <div
          className={`${bebasNeue.className} text-[#111]`}
          style={{
            position: 'absolute',
            left: '70px',
            top: '48px',
            fontSize: '54px',
            fontStyle: 'normal',
            lineHeight: '140%',
            letterSpacing: '-1.08px',
          }}
        >
          Login.
        </div>

        {/* 아이디 | 이름 — Login. 아래 32px (48 + 75.6 + 32 ≈ 156) */}
        <div
          className="font-['Pretendard'] text-[#111]"
          style={{
            position: 'absolute',
            left: '70px',
            top: '156px',
            fontSize: '16px',
            fontStyle: 'normal',
            fontWeight: 600,
            lineHeight: '140%',
            letterSpacing: '-0.32px',
          }}
        >
          아이디 | 이름
        </div>

        <form onSubmit={handleLogin} className="contents">
          {/* 입력 칸 — 아이디 | 이름 아래 12px */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 홍길동"
            className="font-['Pretendard'] bg-transparent outline-none placeholder:text-[#949494]"
            style={{
              position: 'absolute',
              left: '70px',
              top: '190px',
              width: '360px',
              height: '46px',
              border: 'none',
              borderBottom: '0.5px solid #D4D4D4',
              color: '#111',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '140%',
              letterSpacing: '-0.32px',
            }}
          />

          {/* 비밀번호 | 핸드폰 번호 — 첫 번째 입력 아래 간격 후 */}
          <div
            className="font-['Pretendard'] text-[#111]"
            style={{
              position: 'absolute',
              left: '70px',
              top: '276px',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '140%',
              letterSpacing: '-0.32px',
            }}
          >
            비밀번호 | 핸드폰 번호
          </div>

          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="예) 000-1234-5678"
            className="font-['Pretendard'] bg-transparent outline-none placeholder:text-[#949494]"
            style={{
              position: 'absolute',
              left: '70px',
              top: '310px',
              width: '360px',
              height: '46px',
              border: 'none',
              borderBottom: '0.5px solid #D4D4D4',
              color: '#111',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '140%',
              letterSpacing: '-0.32px',
            }}
          />

          {error && (
            <p
              className="font-['Pretendard'] absolute left-[70px] text-[14px] text-[#EC1F23]"
              style={{ top: '356px' }}
            >
              {error}
            </p>
          )}

          {/* 로그인 버튼 — 검정 배경, 흰 글씨, 둥근 모서리 */}
          <button
            type="submit"
            disabled={loading}
            className="font-['Pretendard'] text-white font-medium rounded-[100px] flex items-center justify-center disabled:opacity-60"
            style={{
              position: 'absolute',
              left: '70px',
              top: '396px',
              width: '360px',
              height: '56px',
              background: '#111',
              border: 'none',
              fontSize: '16px',
              lineHeight: '140%',
              letterSpacing: '-0.32px',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 회원가입 버튼 — 흰 배경, 검정 테두리 (기능 없음) */}
        <button
          type="button"
          className="font-['Pretendard'] text-[#111] font-medium rounded-[100px] flex items-center justify-center bg-transparent"
          style={{
            position: 'absolute',
            left: '70px',
            top: '464px',
            width: '360px',
            height: '56px',
            background: '#F9F9F9',
            border: '1px solid #111',
            fontSize: '16px',
            lineHeight: '140%',
            letterSpacing: '-0.32px',
          }}
        >
          회원가입
        </button>
      </div>

      {/* 2026. 03. 05 Thu — 프레임 오른쪽 254px, 위 95px, 90도 회전 */}
      <div
        className="font-['Pretendard'] text-[#111] whitespace-nowrap"
        style={{
          position: 'absolute',
          left: '1004px',
          top: '95px',
          width: '190px',
          transform: 'rotate(90deg)',
          transformOrigin: 'left top',
          fontSize: '24px',
          fontStyle: 'normal',
          fontWeight: 600,
          lineHeight: '140%',
          letterSpacing: '-0.48px',
        }}
      >
        2026. 03. 05 Thu
      </div>

      {/* Main_name — 아래로 1000px, 318.98×344.01 */}
      <div
        className="absolute"
        style={{
          left: '974px',
          top: 'calc(95px + 190px - 406.575px + 618px)',
          width: '318.98px',
          height: '344.01px',
        }}
      >
        <Image
          src="/img/gcbio/Main_name.png"
          alt=""
          width={318.98}
          height={344.01}
          className="object-contain w-full h-full"
        />
      </div>

      {/* Main poster — 날짜 블록 기준 위 14px, 오른쪽 89px */}
      <div
        className="absolute"
        style={{
          left: '1093px',
          top: '81px',
          width: '543px',
          height: '757px',
        }}
      >
        <Image
          src="/img/gcbio/Main_poster.png"
          alt=""
          width={543}
          height={757}
          className="object-cover w-full h-full"
        />
      </div>
    </div>
  )
}
