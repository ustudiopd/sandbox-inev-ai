# UTM 시스템 환경변수 체크리스트

**작성일**: 2026-02-02  
**목적**: 배포 환경에서 UTM 시스템이 정상 동작하는지 확인

---

## ✅ 필수 환경변수

다음 환경변수들은 **반드시 설정되어 있어야 합니다** (기본값 없음):

| 환경변수 | 용도 | 기본값 | 필수 여부 |
|---------|------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 없음 | ✅ 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | 없음 | ✅ 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Admin) | 없음 | ✅ 필수 |

**확인 방법**:
```bash
# Vercel 환경변수 확인
vercel env ls

# 또는 배포 환경에서 확인
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

---

## ⚙️ 선택적 환경변수 (기본값 있음)

다음 환경변수들은 **기본값이 있어서 없어도 동작**하지만, 커스터마이징이 필요하면 설정:

| 환경변수 | 용도 | 기본값 | 권장값 |
|---------|------|--------|--------|
| `COOKIE_TTL_DAYS` | UTM 쿠키 보관 기간 (일) | `30` | `30` |
| `COOKIE_TRUST_WINDOW_HOURS` | UTM 쿠키 신뢰 기간 (시간) | `24` | `24` |

**설명**:
- `COOKIE_TTL_DAYS`: UTM 정보를 쿠키에 보관하는 기간 (30일)
- `COOKIE_TRUST_WINDOW_HOURS`: 쿠키의 UTM 정보를 신뢰하고 사용하는 기간 (24시간)

**설정 예시** (Vercel):
```bash
vercel env add COOKIE_TTL_DAYS production
# 입력: 30

vercel env add COOKIE_TRUST_WINDOW_HOURS production
# 입력: 24
```

---

## 🔍 환경변수 확인 스크립트

다음 스크립트로 환경변수 설정 상태를 확인할 수 있습니다:

```typescript
// scripts/check-env-vars.ts
console.log('환경변수 확인:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 없음')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 없음')
console.log('COOKIE_TTL_DAYS:', process.env.COOKIE_TTL_DAYS || '30 (기본값)')
console.log('COOKIE_TRUST_WINDOW_HOURS:', process.env.COOKIE_TRUST_WINDOW_HOURS || '24 (기본값)')
```

---

## 🚨 문제 해결

### 문제 1: UTM이 저장되지 않음

**원인**:
- `SUPABASE_SERVICE_ROLE_KEY`가 없으면 등록 API에서 DB 저장 실패

**해결**:
```bash
# Vercel에 환경변수 추가
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Supabase Dashboard > Settings > API > service_role key 복사하여 입력
```

---

### 문제 2: 쿠키가 저장되지 않음

**원인**:
- `NODE_ENV`가 `production`이 아니면 `secure: false`로 설정됨
- HTTPS가 아닌 환경에서는 쿠키가 저장되지 않을 수 있음

**해결**:
- 배포 환경에서는 자동으로 `NODE_ENV=production`이 설정됨
- 로컬에서는 `http://localhost`에서도 동작하도록 `secure: false`로 설정됨

---

### 문제 3: Cookie Trust Window가 너무 짧음

**원인**:
- 기본값 24시간이 너무 짧아서 UTM이 사라짐

**해결**:
```bash
# 48시간으로 연장
vercel env add COOKIE_TRUST_WINDOW_HOURS production
# 입력: 48
```

---

## ✅ 배포 전 체크리스트

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정 확인
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 확인
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정 확인
- [ ] (선택) `COOKIE_TTL_DAYS` 커스터마이징 필요 시 설정
- [ ] (선택) `COOKIE_TRUST_WINDOW_HOURS` 커스터마이징 필요 시 설정

---

## 📝 참고

- 환경변수는 **Vercel Dashboard > Settings > Environment Variables**에서 확인/수정 가능
- 환경변수 변경 후 **재배포 필요**
- 로컬에서는 `.env.local` 파일에 설정
