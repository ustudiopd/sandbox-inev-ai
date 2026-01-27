import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        // Server Component에서는 쿠키 수정 불가 (Next.js 15+ 제약)
        // 쿠키 수정은 Server Action이나 Route Handler에서만 가능
        set: () => {
          // Server Component에서는 쿠키 수정을 무시
          // 실제 쿠키 갱신이 필요한 경우 Route Handler나 Server Action에서 처리
        },
        remove: () => {
          // Server Component에서는 쿠키 삭제를 무시
        },
      } as any,
    }
  )
}

