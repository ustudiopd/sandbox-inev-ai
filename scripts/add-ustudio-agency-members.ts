/**
 * UStudio 에이전시에 멤버 추가 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/add-ustudio-agency-members.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const USTUDIO_AGENCY_ID = 'b48534de-ec75-4473-8d68-9e2e3aae0ab1'
const DEFAULT_PASSWORD = 'ustudio@82'

const emails = [
  'ad@ustudio.co.kr',
  'cue@ustudio.co.kr',
  'ysj@ustudio.co.kr',
]

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('=== UStudio 에이전시 멤버 추가 ===\n')

    // 1. UStudio 에이전시 확인
    const { data: agency, error: agencyError } = await admin
      .from('agencies')
      .select('id, name')
      .eq('id', USTUDIO_AGENCY_ID)
      .single()

    if (agencyError || !agency) {
      console.error('❌ UStudio 에이전시를 찾을 수 없습니다.')
      console.error('에러:', agencyError)
      process.exit(1)
    }

    console.log(`✅ UStudio 에이전시 확인: ${agency.name} (${agency.id})\n`)

    // 2. 각 이메일 처리
    for (const email of emails) {
      console.log(`📧 처리 중: ${email}`)

      // 2-1. 사용자 존재 확인 (페이지네이션 처리)
      let user: any = null
      let page = 1
      const perPage = 1000
      
      while (true) {
        const { data: { users }, error: listError } = await admin.auth.admin.listUsers({
          page,
          perPage,
        })
        
        if (listError) {
          console.error(`   ❌ 사용자 목록 조회 실패:`, listError)
          break
        }
        
        if (!users || users.length === 0) {
          break
        }
        
        const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (found) {
          user = found
          break
        }
        
        if (users.length < perPage) {
          break
        }
        
        page++
      }

      // 2-2. 사용자가 없으면 생성
      if (!user) {
        console.log(`   ➕ 새 계정 생성 중...`)
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: email,
          password: DEFAULT_PASSWORD,
          email_confirm: true, // 이메일 인증 완료로 설정
        })

        if (createError || !newUser.user) {
          console.error(`   ❌ 계정 생성 실패:`, createError)
          continue
        }

        user = newUser.user
        console.log(`   ✅ 계정 생성 완료 (ID: ${user.id})`)

        // 프로필 생성
        const { error: profileError } = await admin
          .from('profiles')
          .insert({
            id: user.id,
            email: email,
            display_name: email.split('@')[0], // 이메일 앞부분을 이름으로 사용
          })

        if (profileError) {
          console.warn(`   ⚠️  프로필 생성 실패 (무시):`, profileError)
        } else {
          console.log(`   ✅ 프로필 생성 완료`)
        }
      } else {
        console.log(`   ℹ️  기존 계정 발견 (ID: ${user.id})`)

        // 비밀번호 업데이트
        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
          password: DEFAULT_PASSWORD,
        })

        if (updateError) {
          console.warn(`   ⚠️  비밀번호 업데이트 실패:`, updateError)
        } else {
          console.log(`   ✅ 비밀번호 업데이트 완료`)
        }
      }

      // 2-3. 에이전시 멤버십 확인
      const { data: existingMember, error: memberError } = await admin
        .from('agency_members')
        .select('role')
        .eq('agency_id', USTUDIO_AGENCY_ID)
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberError) {
        console.error(`   ❌ 멤버십 조회 실패:`, memberError)
        continue
      }

      if (existingMember) {
        console.log(`   ℹ️  이미 에이전시 멤버입니다 (역할: ${existingMember.role})`)
      } else {
        // 멤버십 추가
        const { error: insertError } = await admin
          .from('agency_members')
          .insert({
            agency_id: USTUDIO_AGENCY_ID,
            user_id: user.id,
            role: 'owner', // 기본적으로 owner 역할 부여
          })

        if (insertError) {
          console.error(`   ❌ 멤버십 추가 실패:`, insertError)
        } else {
          console.log(`   ✅ 에이전시 멤버로 추가 완료 (역할: owner)`)
        }
      }

      console.log('')
    }

    // 3. 최종 멤버 목록 확인
    console.log('📋 최종 UStudio 에이전시 멤버 목록:')
    const { data: members, error: finalError } = await admin
      .from('agency_members')
      .select(`
        user_id,
        role,
        created_at,
        profiles:user_id (
          email,
          display_name
        )
      `)
      .eq('agency_id', USTUDIO_AGENCY_ID)
      .order('created_at', { ascending: true })

    if (finalError) {
      console.error('❌ 멤버 목록 조회 실패:', finalError)
    } else if (members) {
      members.forEach((member: any, index: number) => {
        const profile = member.profiles
        console.log(`   ${index + 1}. ${profile?.email || '(이메일 없음)'} (${profile?.display_name || '-'}) - ${member.role}`)
      })
    }

    console.log('\n✅ 작업 완료!')
  } catch (error: any) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
})()
