# UTM 구현 현황 요약

**작성일**: 2026-02-02

---

## 결론: **코드 상으로는 UTM 관련 기능은 모두 구현되어 있습니다.**

캡처 → 저장 → 복원 → DB 저장 → 집계/대시보드까지 전체 플로우가 구현되어 있고,  
**부족한 부분은 “어디선가 구현이 빠진 것”이 아니라, 리다이렉트/세션/쿠키 등으로 인해 실제 저장률이 낮아질 수 있는 구조적 이슈**입니다.

---

## 1. 구현된 항목

### 1.1 유틸리티 (`lib/utils/utm.ts`)

| 기능 | 함수 | 용도 |
|------|------|------|
| 추출 | `extractUTMParams(searchParams)` | URL에서 utm_source, utm_medium, utm_campaign, utm_term, utm_content 추출 |
| 정규화 | `normalizeUTM(utmParams)` | trim, lowercase, 길이 제한(200자) |
| URL 추가 | `appendUTMToURL(url, utmParams)` | 링크에 UTM 쿼리 추가 |
| Referrer | `extractDomain(referrer)` | referrer 도메인 추출 |

### 1.2 캡처 (진입 시점)

| 경로/페이지 | UTM 캡처 방식 |
|-------------|----------------|
| **Middleware** | `/event/`, `/webinar/`, `/s/` 요청 시 URL에서 UTM+cid 추출 → `ef_tracking` 쿠키 저장 |
| **Event 페이지** | `extractUTMParams(searchParams)` → 하위 컴포넌트에 props 전달 |
| **RegistrationPage** | URL + localStorage(`utm:{campaignId}`), 등록/Visit API에 UTM 전달 |
| **SurveyPage** | 동일 |
| **OnePredictRegistrationPage** | 동일 |
| **WebinarFormWertPage** | `extractUTMParams(searchParams)`, 등록 링크에 UTM 포함, Visit API에 UTM 전달(추가 완료) |
| **Webinar 등록** | `extractUTMParams(searchParamsData)` → OnePredictRegistrationPage 등에 전달 |
| **짧은 링크 /s/[code]** | 리다이렉트 시 `utm_*`, `cid` 쿼리 보존 후 최종 URL로 전달 |

### 1.3 저장 (API)

| API | UTM 처리 |
|-----|----------|
| **POST /api/public/event-survey/[campaignId]/register** | body의 utm_*, cid, marketing_campaign_link_id 수신 → `restoreTrackingInfo()`로 복원 → `normalizeUTM()` → `event_survey_entries`에 저장 |
| **POST /api/public/event-survey/[campaignId]/submit** | 동일하게 UTM 정규화 후 저장 |
| **POST /api/public/campaigns/[campaignId]/visit** | body의 UTM 수신 → `normalizeUTM()` → `event_access_logs`에 저장 |

### 1.4 복원 로직 (`lib/tracking/restore-tracking.ts`)

- **우선순위**: URL(요청 body) > Cookie(`ef_tracking`) > cid로 링크 조회 후 링크 메타 UTM
- **Cookie 검증**: Trust Window(기본 24시간), 캠페인 매칭, cid 캠페인 불일치 시 `untracked_reason` 기록
- 등록/제출 시 body에 UTM이 없어도 쿠키/링크 메타로 복원 시도

### 1.5 DB

| 테이블 | UTM 관련 컬럼 |
|--------|----------------|
| **event_survey_entries** | utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_first_visit_at, utm_referrer, marketing_campaign_link_id |
| **event_access_logs** | utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id |
| **campaign_link_meta** | utm_source, utm_medium, utm_campaign, utm_term, utm_content, cid |

### 1.6 대시보드/집계

- 캠페인 대시보드(`/client/[clientId]/campaigns`): 링크별 Visits, Conversions, CVR
- 설문/캠페인 Overview: UTM/링크별 전환 집계
- RPC/API: `get_marketing_summary`, `get_marketing_visits_summary`, `get_marketing_cvr_summary` 등

---

## 2. “다 구현됐는데도” 추적이 잘 안 보일 수 있는 이유 (문서 기준)

다음은 **구현 누락이 아니라, 동작 환경/경로 때문에 저장률이 떨어질 수 있는 요인**입니다.

1. **리다이렉트 구간에서 쿼리 유실**  
   - 일부 메일/광고 클릭 시 중간 리다이렉트에서 `utm_*`가 빠지면, 최종 페이지에는 UTM이 없음.
2. **쿠키 Trust Window(24시간)**  
   - 오래된 쿠키는 “오귀속 방지”를 위해 복원에서 제외되므로, 24시간 지난 후 등록하면 UTM이 비어 있을 수 있음.
3. **세션/도메인 이슈**  
   - 서브도메인·다른 도메인 경유 시 쿠키가 공유되지 않으면, 캡처한 UTM이 등록 API까지 전달되지 않음.
4. **Visit 미호출**  
   - 워트처럼 랜딩만 하고 Visit API를 호출하지 않던 페이지는 방문 통계만 0이었고, UTM 저장 자체는 등록 시 이루어짐(해당 페이지에 Visit + UTM 전달 추가 완료).

---

## 3. 정리

- **UTM 파라미터 추출·정규화·저장·복원·집계**까지 필요한 코드는 모두 구현되어 있습니다.
- **“UTM 부분이 다 구현됐는가?”** → **예, 구현은 완료된 상태**입니다.
- **실제 추적률을 높이려면**  
  - 링크 배포 시 UTM이 **최종 도착 URL에 반드시 포함**되도록 하고,  
  - 필요 시 Trust Window·리다이렉트 경로 점검,  
  - Visit이 빠져 있던 페이지(워트 랜딩 등)에 Visit API 호출을 추가하는 식의 **운영/경로 보완**이 필요합니다.

추가로, 상세 설계·이슈는 `docs/UTM_추적_시스템_구현_완료_보고서.md`, `docs/UTM_추적_시스템_최종_검토_요약.md` 등을 참고하면 됩니다.
