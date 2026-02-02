# 통계 시스템(Visit 추적) 점검 보고서

## 요약

- **현상**: `event_access_logs`(Visit) 기록이 거의 없음(전체 10건, 최근 2026-01-28). 반면 등록(`event_survey_entries`)은 정상(예: 워트 오늘 77건).
- **원인**: **워트 149403 랜딩 페이지**(`/event/149403` → `WebinarFormWertPage`)에서 **Visit API를 호출하지 않음**. 해당 페이지가 트래픽의 상당 부분을 차지하는데, 여기서는 방문 기록이 전혀 쌓이지 않음.
- **조치**: 워트 랜딩 페이지에 Visit API 호출 추가 완료. 배포 후부터 `/event/149403` 진입 시 방문이 기록됨.

---

## 1. 통계 시스템 구조

| 구분 | 저장소 | 용도 |
|------|--------|------|
| **Visit(방문)** | `event_access_logs` | 캠페인/웨비나 페이지 방문 시 1건 기록 (session_id 기준 중복 가능) |
| **등록/전환** | `event_survey_entries` | 폼 제출 시 1건 기록 |

- **Visit API**: `POST /api/public/campaigns/[campaignId]/visit`
- 호출하는 쪽: 등록/설문 **페이지 컴포넌트**가 마운트될 때 `fetch(…/visit)` 호출

---

## 2. 문제 원인

### 2.1 워트 149403 플로우

1. 사용자 진입: `/event/149403` → **WebinarFormWertPage** (커스텀 랜딩)
2. "웨비나 등록하기" 클릭 → `/event/149403/register` → **RegistrationPage** (공통 등록 폼)

- **WebinarFormWertPage**: Visit API 호출 없음 → **랜딩 방문이 전혀 기록되지 않음**
- **RegistrationPage**: Visit API 호출 있음 → `/register`에 도달한 경우에만 Visit 1건 기록

워트 트래픽이 대부분 `/event/149403`으로 들어오고, 여기서 Visit이 없기 때문에 전체 통계에서 방문 수가 극소로 나온 상태입니다.

### 2.2 다른 경로

- `/event/{public_path}/register`, `/event/{public_path}/survey`  
  → `RegistrationPage`, `SurveyPage` 사용 시 Visit API 호출 **있음**
- `/event/426307` (원프레딕트)  
  → `OnePredictRegistrationPage` 등에서 Visit API 호출 **있음**
- `/s/[code]` (짧은 링크)  
  → 리다이렉트만 하고, 최종 도착 페이지에서 Visit 기록 여부는 해당 페이지 구현에 따름

---

## 3. 적용한 수정

### 3.1 워트 랜딩 페이지에 Visit API 호출 추가

- **파일**: `app/webinarform/wert/page.tsx`
- **내용**: `WebinarFormWertPage` 마운트 시 `POST /api/public/campaigns/{WERT_CAMPAIGN_ID}/visit` 1회 호출
- **캠페인 ID**: `3a88682e-6fab-463c-8328-6b403c8c5c7a` (워트 149403 등록 캠페인)
- **전달 데이터**: `session_id`, UTM(쿼리에서), `cid`, `referrer`, `user_agent` (RegistrationPage와 동일한 형태)

배포 후에는 `/event/149403`에 들어온 방문부터 `event_access_logs`에 쌓입니다.

---

## 4. 추가 권장 사항

1. **다른 커스텀 랜딩/웨비나 전용 페이지**  
   - `/event/149403`처럼 **공통 RegistrationPage/SurveyPage를 쓰지 않는** 전용 페이지가 있다면, 해당 페이지에서도 Visit API를 같은 방식으로 1회 호출하는지 확인하는 것이 좋습니다.
2. **모니터링**  
   - 주기적으로 `event_access_logs` 건수·최근 시각을 확인하거나,  
   - `npx tsx scripts/wert-today-visitors-by-hour.ts` 로 “오늘 시간대별 방문”이 쌓이는지 확인할 수 있습니다.
3. **Visit 실패 시 로깅**  
   - 현재는 클라이언트에서 Visit 실패를 `catch`만 하고 있어, 실패 원인 파악이 어렵습니다.  
   - 필요 시 `[VisitTrackFail]` 등 서버 로그와 연계해 실패 시 로그/알림을 남기면 원인 분석에 유리합니다.

---

## 5. 관련 스크립트

| 스크립트 | 용도 |
|----------|------|
| `scripts/wert-today-visitors-by-hour.ts` | 오늘(KST) 시간대별 워트/EventFlow 방문(히트·방문자) 확인 |
| `scripts/wert-registration-peak-after-9am.ts` | 워트 등록 시간대·피크 분석 |
| `scripts/check-visit-api-status.ts` | Visit API·event_access_logs 동작 상태 점검 |

---

**작성일**: 2026-02-02
