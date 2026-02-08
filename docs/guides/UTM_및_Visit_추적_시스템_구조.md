# UTM 및 Visit 추적 시스템 구조

**작성일**: 2026-02-08  
**기준**: eventflow.kr 코드베이스

---

## 1. UTM 시스템 구축 현황

### 1.1 추적 파라미터

| 파라미터 | 용도 | 저장/전달 |
|----------|------|-----------|
| **utm_source** | 유입 경로 (newsletter, google, facebook 등) | URL → Cookie/localStorage → Visit API → DB |
| **utm_medium** | 매체 유형 (email, cpc, sms 등) | 동일 |
| **utm_campaign** | 캠페인 이름 | 동일 |
| **utm_term** | 키워드 (선택) | 동일 |
| **utm_content** | 콘텐츠 구분 / A/B (선택) | 동일 |
| **cid** | 캠페인 링크 식별자 (공유용 짧은 URL용) | 동일, `campaign_link_meta`와 매칭 |

- **정규화**: `lib/utils/utm.ts`의 `normalizeUTM()` — trim, lowercase, 길이 200 제한.  
- **cid 정규화**: `lib/utils/cid.ts`의 `normalizeCID()`.

### 1.2 추적 정보가 흐르는 경로

```
[사용자 클릭]
  URL: /event/149403?utm_source=newsletter&utm_medium=email&cid=X5L2G9KV
        ↓
[Middleware] (선택적)
  - ef_session_id 쿠키 없으면 생성 (30분 TTL)
  - /event/, /webinar/, /s/, /api/public/ 경로에서만
  - UTM/cid는 middleware에서 cookie(ef_tracking)에 저장 가능 (모듈: lib/tracking/middleware-tracking.ts)
        ↓
[랜딩 페이지 진입]
  - URL에서 UTM 추출 → localStorage 키: utm:${campaign.id} 에 저장 (캠페인별)
  - session_id: getOrCreateSessionId('ef_session_id', 30) — cookie/localStorage/sessionStorage 폴백
        ↓
[Visit 수집]
  - POST /api/public/campaigns/${campaignId}/visit
  - Body: session_id, utm_*, cid, referrer, user_agent
  - campaignId는 캠페인 UUID 또는 웨비나 UUID(registration_campaign_id 연동 시 캠페인으로 치환 가능)
        ↓
[서버]
  - 캠페인/웨비나 존재 확인
  - cid → campaign_link_meta 조회 → marketing_campaign_link_id 결정
  - normalizeUTM 적용 후 event_access_logs 에 INSERT
```

- **세션 ID**: `lib/utils/session.ts`의 `getOrCreateSessionId('ef_session_id', 30)` — localStorage → sessionStorage → cookie → 메모리 순으로 조회/생성, 30분 TTL.

---

## 2. Visit 기록 방식

### 2.1 Visit API

- **엔드포인트**: `POST /api/public/campaigns/[campaignId]/visit`
- **파일**: `app/api/public/campaigns/[campaignId]/visit/route.ts`

**역할**

- 페이지 방문 1회당 1번 호출되어 **Visit 1건**을 기록.
- 등록/전환(제출) 시 같은 `session_id`로 이 Visit과 연결해 전환으로 집계.

**Request Body**

- `session_id` (필수, 없으면 쿠키 `ef_session_id`로 보완)
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `cid`, `referrer`, `user_agent`

**저장 테이블**: `event_access_logs`

| 컬럼 | 설명 |
|------|------|
| id | UUID |
| campaign_id | 이벤트/설문 캠페인 ID (event_survey_campaigns.id). 웨비나만 쓰는 경우 null 가능 |
| webinar_id | 웨비나 직접 사용 시 (campaign_id 대신 또는 연동) |
| session_id | 세션 식별자 (동일 세션 = 동일 Visit 집계 대상) |
| entry_id | 전환 시 event_survey_entries.id 로 연결 (나중에 UPDATE) |
| converted_at | 전환 시각 (나중에 UPDATE) |
| utm_source, utm_medium, utm_campaign, utm_term, utm_content | UTM |
| cid | 링크 식별자 |
| referrer, user_agent | 참조/UA |
| marketing_campaign_link_id | cid로 조회한 campaign_link_meta.id (있을 때만) |
| accessed_at | 방문 시각 |

- **Visit Dedup**: 집계 시 **같은 campaign(또는 webinar) + 같은 session_id**는 1 Visit으로 간주. API는 호출마다 INSERT하지만, 집계 로직에서 session_id 기준으로 중복 제거.

### 2.2 Visit을 호출하는 화면

| 화면 | 시점 | 비고 |
|------|------|------|
| **WelcomePage** | 랜딩 페이지 마운트 시 1회 | URL에서 extractUTMParams(searchParams) |
| **RegistrationPage** | 등록 페이지 마운트 시 1회 | UTM은 localStorage `utm:${campaign.id}` + mergedUTMParams |
| **SurveyPage** | 설문 페이지 마운트 시 1회 | UTM은 localStorage + utmParams |
| **OnePredictRegistrationPage** | 등록 페이지 마운트 시 1회 | 동일 |
| **WebinarFormWertPageContent** | 폼 페이지에서 1회 | campaign.id로 visit 호출 |

- 실패해도 **graceful failure**: Visit API 실패 시 로그만 남기고 페이지/등록·제출은 계속 진행.

### 2.3 campaignId 해석 (Visit API 내부)

1. **campaignId가 캠페인 UUID**인 경우  
   - `event_survey_campaigns`에 있으면 → `campaign_id`로 저장.
2. **캠페인이 없으면 웨비나 ID로 조회**  
   - `webinars`에 있으면:
     - `registration_campaign_id`가 있으면 → 해당 캠페인 UUID를 사용해 `campaign_id`로 저장.
     - 없으면 → `webinar_id`만 저장 (campaign_id null).

---

## 3. UTM 보관 및 복원

### 3.1 클라이언트 보관

- **localStorage**: 키 `utm:${campaign.id}` 에 JSON으로 저장 (캠페인별).
- **저장 시점**: 등록/설문/웰컴 페이지에서 URL의 UTM을 읽은 직후.
- **복원**: 같은 캠페인의 등록·설문 제출 시 localStorage에서 읽어 서버로 전달.  
  서버는 등록/제출 API에서 **cookie(ef_tracking) 또는 body의 UTM**과 함께 사용할 수 있으며, **restore-tracking** 모듈로 URL → Cookie → Link 메타 순으로 복원해 전환에 붙일 수 있음.

### 3.2 쿠키 (Middleware 추적)

- **ef_session_id**: 세션 식별, 30분 TTL. middleware에서 `/event/`, `/webinar/`, `/s/`, `/api/public/` 진입 시 없으면 생성.
- **ef_tracking**: UTM+cid 등 (middleware-tracking.ts). Cookie에 JSON 저장, Trust Window 등으로 등록 API에서 검증 후 사용.

### 3.3 전환(등록/제출) 시 UTM 연결

- **event_survey_entries** 등에 utm_*, cid 등이 저장됨 (마이그레이션 063_add_utm_tracking_to_entries 등).
- **event_access_logs.entry_id** / **converted_at** 업데이트로 “어떤 Visit이 전환됐는지” 연결.
- 집계는 `event_access_logs` + `event_survey_entries` + `campaign_link_meta`를 조합해 Visits / 전환 수 / CVR 등을 계산.

---

## 4. 요약

| 항목 | 내용 |
|------|------|
| **UTM 추적** | URL 파라미터(utm_*, cid) → localStorage(utm:campaignId) + 쿠키(ef_session_id, 선택적 ef_tracking) → Visit API body |
| **Visit 기록** | POST `/api/public/campaigns/[campaignId]/visit` → `event_access_logs` INSERT (session_id, utm_*, cid, referrer, user_agent, accessed_at, campaign_id 또는 webinar_id, 선택적 marketing_campaign_link_id) |
| **세션** | `ef_session_id` 쿠키(30분 TTL), 없으면 middleware에서 생성. 클라이언트는 getOrCreateSessionId로 localStorage/sessionStorage/cookie 폴백 |
| **집계** | session_id 기준 Visit dedup, entry_id/converted_at으로 전환 연결, UTM/cid/링크별 Visits·전환·CVR 집계 (크론·대시보드) |

상세 사용법·링크 생성·대시보드는 `docs/UTM_추적_시스템_사용_가이드.md` 참고.
