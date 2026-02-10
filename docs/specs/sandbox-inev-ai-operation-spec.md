# sandbox.inev.ai 운영 명세 (운영 리허설 + 랜딩 이식)

- **Repo**: `sandbox-inev-ai`
- **도메인**: `sandbox.inev.ai`
- **한 줄 요약**: sandbox는 **운영 리허설 서버**(동일 플로우/동일 테이블)로 쓰고, dev로는 **랜딩 번들(tsx+이미지)**만 복사해서 붙인다.

---

## 목표

1. `sandbox.inev.ai`에서 **운영과 동일한 플로우를 실제 DB로 테스트**한다.
2. 테스트 완료 후, **특수 랜딩(tsx + 이미지)만 dev로 "폴더째" 이식**한다.
3. 이식 과정에서 **DB/라우트/모듈은 손대지 않는다**(dev 코어 안정성 유지).

**핵심**: 백엔드/라우트/모듈은 dev와 동일하게 쓰고, **클라이언트/이벤트만 sandbox로 분리**한다.

---

## 1) Sandbox 클라이언트 모델 (운영과 "똑같이" 테스트)

### 1.1 공용 Supabase 안에 sandbox client 1개 생성

- `clients` 테이블에 1개 레코드:
  - `slug = "sandbox"`
  - `id` = 생성된 UUID (sandbox client_id)
  - (선택) `subdomain_domain = "sandbox.inev.ai"`
  - (선택) `is_sandbox = true` (컬럼이 있으면 사용)

### 1.2 sandbox는 **운영 테이블을 그대로 사용한다**

- `registrations` / `event_access_logs` / `webinar_presence` / `surveys` / `messages` 등 **전부 동일 테이블**에 기록한다.
- 대신 **모든 데이터는 sandbox `client_id`로만 격리**된다.

> 별도 `sandbox_*` 테이블로 테스트하면 실제 플로우가 재현되지 않는다.  
> 운영과 똑같이 테스트하려면 **동일 테이블 + client_id 격리**가 필수다.

---

## 2) 안전장치: RLS/권한 격리 규칙 (문서에 필수)

sandbox가 운영 테이블을 같이 쓰려면 아래가 **반드시** 지켜져야 한다.

### 2.1 모든 핵심 테이블에 `client_id`가 1급 컬럼

- `events` / `registrations` / `access_logs`(또는 `event_access_logs`) / `presence` / `survey_entries` / `messages` 등은 **client_id**(또는 event → client 경로)로 소속이 결정되어야 한다.

### 2.2 sandbox 사이트에서 생성/조회되는 모든 행은 `client_id = sandbox`로 강제

- 서버 액션/API에서 **도메인 기반으로 client_id 결정**:
  - `sandbox.inev.ai` → sandbox client_id
  - `wert.inev.ai` → wert client_id
  - dev(관리용) → 선택/관리자 UI로 지정

### 2.3 서비스롤(service role) 사용은 "서버에서만"

- 프론트 레포/브라우저에는 절대 두지 않음.
- sandbox도 운영과 동일한 보안 규칙 적용.

---

## 3) sandbox.inev.ai 배포 구조 (운영과 동일하게)

### 3.1 Vercel 프로젝트는 별도: `sandbox-inev-ai`

- **도메인**: `sandbox.inev.ai`
- **env**:
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (공용 또는 sandbox 전용 Supabase)
  - 샌드박스는 prod 키를 써도 되지만, **RLS/도메인 매핑이 100%**여야 함.

### 3.2 코드베이스는 dev와 동일(클론 기반)

- **이유**: "운영과 똑같이 테스트"하려면 라우트/모듈/게이트 흐름이 같아야 함.
- sandbox는 **dev 코어를 그대로 두고**, "client_id만 sandbox로" 바꿔 끼운다.

> **결론**: sandbox는 '프론트 제작소'가 아니라 **'운영 리허설 서버'**다.

---

## 4) 특수 랜딩 개발 방식 (sandbox에서 실제 플로우로 테스트)

sandbox에서도 **운영 이벤트 코드로 실제 테스트**한다.

- sandbox DB에 이벤트 생성: `code = 12345` (실제 운영과 동일한 코드 사용 가능).
- sandbox 도메인에서 `/event/12345`로 접속하면:
  - 운영과 동일하게 **entry, register, webinar, on-demand** 흐름 테스트 가능.
- `/s` → short link → `/entry` → 버튼/QR까지 **동일 라우트/모듈**로 검증.

---

## 5) dev로 "이식만 잘" 되는 규격 (Migration Contract)

이식 대상은 **랜딩 번들**만. DB/라우트/모듈은 건드리지 않는다.

### 5.1 이식 대상: 랜딩 번들 폴더 규격

sandbox에서 만든 특수 랜딩을 아래 구조로 유지:

```
event-bundles/12345/
  Landing.tsx
  public/events/12345/*
  README.md
```

- `public/events/12345/*`가 번들 안에 있으면 **복사만으로 이식 완료**.

### 5.2 dev로 이식 결과 (표준)

| 샌드박스 | dev |
|----------|-----|
| `Landing.tsx` | `app/event/[slug]/components/Event12345Landing.tsx` |
| `public/events/12345/*` | dev의 `public/events/12345/*` |
| — | `app/event/[slug]/page.tsx`에 분기 1개: `if (event.code === '12345') return <Event12345Landing .../>` |

**원칙**

- 등록/entry/웨비나 로직은 dev에 이미 있으므로, 랜딩은 **링크만** 잘 걸면 된다.
- sandbox에서 검증한 링크/버튼/플로우가 dev에서도 그대로 동작해야 한다.

### 5.3 관련 문서

- [번들 이식 체크리스트](../BUNDLE_MIGRATION_CHECKLIST.md) — 이식 전/후 점검 항목.
- [sandbox 배포 가이드](../guides/sandbox-deployment.md) — Vercel/env 설정.

---

## 6) "운영과 똑같이 테스트" DoD (이식 승인 기준)

sandbox에서 아래가 통과되면 **dev로 이식 승인**:

- [ ] `/s` → `/entry` → 버튼 흐름이 의도대로 동작
- [ ] 등록(registrations) 정상 생성 + 중복/에러 처리 확인
- [ ] 웨비나/온디맨드/QR 등 해당 이벤트 모듈 플로우 1회 이상 end-to-end 성공
- [ ] 대시보드/집계가 최소 1개 지표라도 정상 반영(예: 등록자 수, 접속 로그)
- [ ] 랜딩의 assets/OG/모바일 UI 깨짐 없음
- [ ] 이식 후 변경점은 **"번들 폴더 복사 + 분기 1개"**로 끝난다

---

## 7) Cursor 표준 프롬프트 (2개만 돌리면 됨)

### 7.1 sandbox에서 실제 이벤트(12345) 특수 랜딩 개발

> "sandbox.inev.ai에서 code=12345 이벤트를 운영 플로우로 테스트할 수 있게, `Event12345Landing.tsx`를 만들고 `page.tsx`에서 code 분기해 렌더되게 해줘.  
> 랜딩에 필요한 이미지는 `public/events/12345/`에 넣어줘."

### 7.2 dev로 이식 (복사 + 분기 최소화)

> "sandbox 레포에서 `Event12345Landing.tsx`와 `public/events/12345/*`를 dev 레포 표준 경로로 이식해줘.  
> dev에서 `event.code === '12345'` 분기 1개만 추가하고, 운영 코어는 건드리지 말아줘."

---

## 요약

| 구분 | sandbox.inev.ai | dev 이식 |
|------|------------------|----------|
| **역할** | 운영 리허설 서버 (동일 플로우/동일 테이블) | 운영 코어 + 최종 조립 |
| **데이터** | sandbox client_id로 격리, 운영 테이블 그대로 사용 | — |
| **이식** | — | 랜딩 번들(tsx+이미지)만 복사 + 분기 1개 |

**sandbox는 운영과 똑같이 테스트하고, dev로는 랜딩 번들만 복사해서 붙인다.**
