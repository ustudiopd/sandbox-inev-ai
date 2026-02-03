/**
 * 온디맨드 웨비나 사용자 등록 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/register-ondemand-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

async function registerOndemandUser() {
  try {
    const admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 온디맨드 웨비나 조회 (slug: 854470)
    const slug = '854470'
    console.log(`\n=== 온디맨드 웨비나 조회: ${slug} ===\n`)
    
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, slug, title, client_id, agency_id, type')
      .eq('slug', slug)
      .eq('type', 'ondemand')
      .maybeSingle()
    
    if (webinarError || !webinar) {
      console.error('❌ 온디맨드 웨비나를 찾을 수 없습니다:', webinarError?.message)
      process.exit(1)
    }
    
    console.log('✅ 온디맨드 웨비나 찾기:')
    console.log(`   - ID: ${webinar.id}`)
    console.log(`   - 제목: ${webinar.title}`)
    console.log(`   - Slug: ${webinar.slug}`)
    
    // 등록 정보
    const registrationData = {
      name: '양승철',
      email: 'jubileo@naver.com',
      company: '', // 기본값
      phone: '010-0000-0000', // 기본값 (필수 필드이므로)
      phone_norm: '01000000000',
      registration_data: {
        name: '양승철',
        email: 'jubileo@naver.com',
        company: '',
        jobTitle: '', // 선택사항
        mobile: '010-0000-0000',
        privacyConsent: true,
      }
    }
    
    console.log('\n=== 등록 정보 ===')
    console.log(`   - 이름: ${registrationData.name}`)
    console.log(`   - 이메일: ${registrationData.email}`)
    console.log(`   - 회사: ${registrationData.company}`)
    
    // 등록 API 호출 (웨비나 ID를 campaignId로 사용)
    console.log('\n=== 등록 처리 중 ===\n')
    
    // 먼저 profiles 테이블에서 사용자 찾기
    const emailLower = registrationData.email.toLowerCase()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', emailLower)
      .maybeSingle()
    
    let userId: string | null = null
    
    if (profile) {
      userId = profile.id
      console.log('   ✅ 프로필에서 사용자 찾음')
    } else {
      // profiles에 없으면 auth.users에서 찾기 (페이지네이션 사용)
      console.log('   auth.users에서 사용자 찾는 중...')
      let foundUser = null
      let page = 1
      const perPage = 1000
      
      while (!foundUser && page <= 10) {
        const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({
          page,
          perPage,
        })
        
        if (listError) {
          console.error('   사용자 목록 조회 실패:', listError)
          break
        }
        
        foundUser = authUsers?.users.find(u => u.email?.toLowerCase() === emailLower)
        
        if (foundUser) {
          userId = foundUser.id
          console.log('   ✅ auth.users에서 사용자 찾음')
          break
        }
        
        // 더 이상 사용자가 없으면 중단
        if (!authUsers?.users || authUsers.users.length < perPage) {
          break
        }
        
        page++
      }
      
      // 사용자가 없으면 생성
      if (!userId) {
        console.log('   사용자가 없어서 생성 중...')
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: registrationData.email,
          email_confirm: true,
          user_metadata: {
            name: registrationData.name,
          }
        })
        
        if (createError || !newUser?.user) {
          console.error('❌ 사용자 생성 실패:', createError?.message)
          process.exit(1)
        }
        
        userId = newUser.user.id
        console.log('   ✅ 사용자 생성 완료')
      }
    }
    
    if (!userId) {
      console.error('❌ 사용자 ID를 찾을 수 없습니다.')
      process.exit(1)
    }
    
    // profiles 테이블 확인/생성
    const { data: existingProfile, error: profileCheckError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    
    if (!existingProfile) {
      const { error: insertProfileError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: registrationData.email,
        })
      
      if (insertProfileError) {
        console.error('❌ 프로필 생성 실패:', insertProfileError)
        process.exit(1)
      }
      console.log('   ✅ 프로필 생성 완료')
    }
    
    // registrations 테이블에 등록 확인 (온디맨드 웨비나는 registrations 테이블만 사용)
    const { data: existingRegistration, error: regCheckError } = await admin
      .from('registrations')
      .select('webinar_id, user_id, registration_data')
      .eq('webinar_id', webinar.id)
      .eq('user_id', userId)
      .maybeSingle()
    
    if (existingRegistration) {
      // 이름이 "양승철2"로 되어 있으면 "양승철"로 수정
      const regData = existingRegistration.registration_data as any
      const currentName = regData?.name
      if (currentName === '양승철2' || currentName?.includes('양승철2')) {
        console.log(`   이름 수정 중: "${currentName}" → "양승철"`)
        const { error: updateError } = await admin
          .from('registrations')
          .update({
            registration_data: {
              ...regData,
              name: '양승철',
            }
          })
          .eq('webinar_id', webinar.id)
          .eq('user_id', userId)
        
        if (updateError) {
          console.error('   ⚠️  이름 수정 실패:', updateError)
        } else {
          console.log('   ✅ 이름 수정 완료')
        }
      }
      
      console.log('   ℹ️  registrations에 이미 등록되어 있습니다.')
      console.log(`   웨비나 ID: ${existingRegistration.webinar_id}`)
      console.log(`   사용자 ID: ${existingRegistration.user_id}`)
      console.log(`\n✅ 온디맨드 웨비나 등록이 이미 완료되어 있습니다!`)
      console.log(`\n📝 접속 URL: https://eventflow.kr/ondemand/${slug}/watch`)
      return
    }
    
    // registrations 테이블에 등록 추가 (온디맨드 웨비나는 registrations 테이블만 사용)
    const { data: registration, error: regError } = await admin
      .from('registrations')
      .insert({
        webinar_id: webinar.id,
        user_id: userId,
        registered_via: 'manual',
        role: 'attendee',
        registration_data: {
          name: registrationData.name,
          email: registrationData.email.toLowerCase(),
          company: registrationData.company,
          mobile: registrationData.phone,
          privacyConsent: true,
        }
      })
      .select('webinar_id, user_id')
      .single()
    
    if (regError) {
      console.error('❌ registrations 등록 실패:', regError)
      process.exit(1)
    }
    
    console.log('   ✅ registrations 등록 완료!')
    if (registration) {
      console.log(`   웨비나 ID: ${registration.webinar_id}`)
      console.log(`   사용자 ID: ${registration.user_id}`)
    }
    console.log(`\n✅ 온디맨드 웨비나 등록이 완료되었습니다!`)
    console.log(`\n📝 접속 URL: https://eventflow.kr/ondemand/${slug}/watch`)
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

registerOndemandUser()
