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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
    setPhone(value)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmedName = name.trim()
    const phoneDigits = phone.trim()
    if (trimmedName === '홍길동' && phoneDigits === '5678') {
      setLoading(true)
      document.cookie = `${EVENT_222152_COOKIE}=1; path=/; max-age=86400`
      router.push(`/event/${slug}/`)
      router.refresh()
    } else {
      setError('아이디(이름) 또는 비밀번호(핸드폰 번호 뒤 4자리)를 확인해 주세요.')
    }
  }

  return (
    <div className="min-h-screen w-full max-w-[1920px] mx-auto relative overflow-x-hidden">
      {/* 배경: 좌우 반반 #FFF / #F9F9F9 */}
      <div className="absolute inset-0 flex">
        <div className="w-1/2 bg-[#FFF]" />
        <div className="w-1/2 bg-[#F9F9F9]" />
      </div>
      {/* 로그인 폼 — 모바일/태블릿에서는 가운데 카드, 데스크톱에서는 왼쪽 고정 레이아웃 */}
      <div className="w-full min-h-screen flex items-center justify-center px-4 py-8 lg:pl-[max(1rem,calc((100%-500px)/2-425px))] lg:pr-4 lg:justify-start relative z-10">
        <div className="w-full max-w-[500px] bg-[#FFFFFF] rounded-2xl lg:rounded-none p-6 sm:p-8 lg:p-12 lg:min-h-[540px] lg:flex lg:flex-col lg:justify-center box-border">
          <div className={`${bebasNeue.className} text-[#111] text-3xl sm:text-4xl lg:text-[54px] leading-[140%] tracking-[-1.08px] mb-8 lg:mb-10`}>
            Login.
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-0">
            <label className="font-['Pretendard'] text-[#111] text-sm sm:text-base font-semibold leading-[140%] tracking-[-0.32px] mb-3 block">
              아이디 | 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 홍길동"
              className="font-['Pretendard'] w-full bg-transparent outline-none placeholder:text-[#949494] text-[#111] text-base border-b border-[#D4D4D4] pb-2 mb-6"
              style={{ borderBottomWidth: '0.5px' }}
              required
            />

            <label className="font-['Pretendard'] text-[#111] text-sm sm:text-base font-semibold leading-[140%] tracking-[-0.32px] mb-3 block">
              비밀번호 | 핸드폰 번호 뒤 4자리
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="예) 1234"
              maxLength={4}
              className="font-['Pretendard'] w-full bg-transparent outline-none placeholder:text-[#949494] text-[#111] text-base border-b border-[#D4D4D4] pb-2 mb-2"
              style={{ borderBottomWidth: '0.5px' }}
              required
            />

            {error && (
              <p className="font-['Pretendard'] text-sm text-[#EC1F23] mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="font-['Pretendard'] w-full text-white font-medium rounded-[100px] flex items-center justify-center disabled:opacity-60 py-3.5 sm:py-4 bg-[#111] text-base mt-6"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>

      {/* 데스크톱 전용: 날짜·포스터·Main_name (1024px 이상에서만 표시) */}
      <div className="hidden xl:block pointer-events-none">
        <div
          className="font-['Pretendard'] text-[#111] whitespace-nowrap absolute"
          style={{
            left: 'min(1074px, calc(50% + 190px))',
            top: '95px',
            width: '190px',
            transform: 'rotate(90deg)',
            transformOrigin: 'left top',
            fontSize: '24px',
            fontWeight: 600,
            lineHeight: '140%',
            letterSpacing: '-0.48px',
          }}
        >
          2026. 03. 05 Thu
        </div>
        {/* Main_name 이미지와 제목: 왼쪽 정렬, 이미지 아래 제목 20px 간격 */}
        <div
          className="absolute flex flex-col"
          style={{
            left: 'min(1044px, calc(50% + 160px))',
            top: 'calc(95px + 190px - 406.575px + 618px - 60px)',
            width: 'min(318.98px, 20vw)',
          }}
        >
          <div
            className="w-full"
            style={{
              height: 'auto',
              aspectRatio: '318.98 / 344.01',
            }}
          >
            <Image
              src="/img/gcbio/Main_name.png"
              alt=""
              width={319}
              height={344}
              className="object-contain w-full h-full"
            />
          </div>
          <div
            className={`${bebasNeue.className} text-left text-[#111] mt-5 whitespace-nowrap`}
            style={{
              fontSize: '36px',
              fontStyle: 'normal',
              fontWeight: 700,
              lineHeight: '130%',
            }}
          >
            2026 GCBP Leadership Workshop
          </div>
        </div>
        <div
          className="absolute"
          style={{
            left: 'min(1163px, calc(50% + 279px))',
            top: '81px',
            width: 'min(480px, 25vw)',
            height: 'auto',
            aspectRatio: '543 / 757',
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
    </div>
  )
}
