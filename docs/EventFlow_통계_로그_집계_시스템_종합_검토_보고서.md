# EventFlow 통계·로그·집계 시스템 종합 검토 보고서

**작성일**: 2026-02-02  
**검토 범위**: 전체 통계 시스템, 로그 수집, 집계 아키텍처  
**목적**: 현재 구조 분석 및 개선 방향 제안

---

## 📋 목차

1. [현재 시스템 구조 분석](#1-현재-시스템-구조-분석)
2. [데이터 수집 현황](#2-데이터-수집-현황)
3. [집계 시스템 현황](#3-집계-시스템-현황)
4. [문제점 분석](#4-문제점-분석)
5. [개선 방향 제안](#5-개선-방향-제안)
6. [권장 아키텍처](#6-권장-아키텍처)
7. [구현 우선순위](#7-구현-우선순위)

---

## 1. 현재 시스템 구조 분석

### 1.1 데이터 수집 계층

#### 1.1.1 Visit 추적 (방문 로그)
- **테이블**: `event_access_logs`
- **목적**: 캠페인/웨비나 페이지 방문 기록
- **API**: `POST /api/public/campaigns/[campaignId]/visit`
- **호출 위치**:
  - ✅ `RegistrationPage` (`/event/{path}/register`)
  - ✅ `SurveyPage` (`/event/{path}/survey`)
  - ✅ `OnePredictRegistrationPage` (`/event/426307/register`)
  - ✅ `WebinarFormWertPage` (`/event/149403`)
  - ✅ `WebinarEntry` (`/webinar/{id}`)
  - ❌ `WelcomePage` (`/event/{path}` 랜딩)
  - ❌ `WebinarView` (`/webinar/{id}/live`)

**특징**:
- 클라이언트 사이드에서 호출 (JavaScript 의존)
- 실패해도 페이지 동작에는 영향 없음 (graceful failure)
- UTM 파라미터, CID, referrer, user_agent 수집

#### 1.1.2 등록/전환 추적
- **테이블**: `event_survey_entries`
- **목적**: 폼 제출/등록 기록
- **API**: `POST /api/public/event-survey/[campaignId]/submit`
- **수집 데이터**:
  - UTM 파라미터 (utm_source, utm_medium, utm_campaign, utm_term, utm_content)
  - CID (Campaign Identifier)
  - session_id (Visit 연결용)
  - marketing_campaign_link_id (링크 추적용)
  - utm_first_visit_at (첫 방문 시각)

**특징**:
- 등록 시점에 UTM 저장 (Visit 없이도 작동)
- Visit과 session_id로 연결 가능

#### 1.1.3 웨비나 접속자 추적
- **테이블**: `webinar_live_presence`, `webinar_access_logs`
- **목적**: 웨비나 라이브 시청자 수 추적
- **방식**: 
  - Presence ping (60초 간격, heartbeat)
  - 5분 버킷으로 접속자 수 누적
- **API**: 
  - `POST /api/webinars/[webinarId]/presence/ping` (클라이언트)
  - `POST /api/webinars/[webinarId]/access/log` (크론)

**특징**:
- 실시간 접속자 수 추적
- 최대/평균/최소 동시 접속자 수 집계 가능

### 1.2 데이터 저장소 구조

#### 1.2.1 핵심 테이블

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| `event_access_logs` | Visit 추적 | campaign_id, webinar_id, session_id, utm_*, cid, accessed_at |
| `event_survey_entries` | 등록/전환 | campaign_id, utm_*, cid, session_id, marketing_campaign_link_id |
| `campaign_link_meta` | 링크 메타데이터 | client_id, cid, utm_*, status |
| `webinar_live_presence` | 웨비나 접속자 | webinar_id, user_id, last_seen_at |
| `webinar_access_logs` | 웨비나 접속 통계 | webinar_id, time_bucket, participant_count |

#### 1.2.2 관계도

```
event_survey_campaigns (캠페인)
    ├─→ event_access_logs (Visit)
    │       └─→ session_id로 연결
    └─→ event_survey_entries (등록/전환)
            ├─→ session_id로 Visit 연결
            └─→ marketing_campaign_link_id → campaign_link_meta

webinars (웨비나)
    ├─→ event_access_logs (Visit, webinar_id로)
    ├─→ webinar_live_presence (실시간 접속자)
    └─→ webinar_access_logs (접속 통계)
```

### 1.3 집계 시스템

#### 1.3.1 마케팅 통계 집계
- **RPC 함수**: `get_marketing_summary(p_client_id, p_from_date, p_to_date)`
- **API**: `GET /api/clients/[clientId]/campaigns/summary`
- **집계 항목**:
  - 전체 전환 수
  - Source별 집계
  - Medium별 집계
  - Campaign별 집계
  - Source+Medium+Campaign 조합별 집계

**현재 상태**: ✅ SQL 오류 수정 완료 (마이그레이션 078)

#### 1.3.2 링크별 통계
- **API**: `GET /api/clients/[clientId]/campaigns/links/[linkId]/stats`
- **집계 항목**:
  - Visits (방문 수)
  - Conversions (전환 수)
  - CVR (전환율)

**데이터 소스**:
- Visits: `event_access_logs` (marketing_campaign_link_id로 필터링)
- Conversions: `event_survey_entries` (marketing_campaign_link_id로 필터링)

#### 1.3.3 웨비나 통계
- **API**: `GET /api/webinars/[webinarId]/stats/*`
- **집계 항목**:
  - 접속 통계 (`/stats/access`)
  - 채팅 통계 (`/stats/chat`)
  - 질문 통계 (`/stats/qa`)
  - 파일 다운로드 (`/stats/files`)
  - 폼 제출 (`/stats/forms`)
  - 추첨 (`/stats/giveaways`)

---

## 2. 데이터 수집 현황

### 2.1 Visit 추적 현황

| 페이지 타입 | 경로 | Visit API 호출 | 상태 |
|------------|------|---------------|------|
| 등록 페이지 | `/event/{path}/register` | ✅ 있음 | 정상 |
| 설문 페이지 | `/event/{path}/survey` | ✅ 있음 | 정상 |
| 원프레딕트 등록 | `/event/426307/register` | ✅ 있음 | 정상 |
| 워트 랜딩 | `/event/149403` | ✅ 있음 | 최근 추가 |
| 웨비나 입장 | `/webinar/{id}` | ✅ 있음 | 정상 |
| 웨비나 라이브 | `/webinar/{id}/live` | ❌ 없음 | **누락** |
| 랜딩 페이지 | `/event/{path}` (WelcomePage) | ❌ 없음 | **누락** |
| 관리자 페이지 | `/client/*`, `/agency/*` | ❌ 없음 | 불필요 |

**현재 추적률**: 약 60-70% (주요 페이지 기준)

### 2.2 일반 페이지뷰 추적

**현재 상태**: ❌ **구현되지 않음**

- Vercel Analytics: 사용 안 함
- Google Analytics: 특정 HTML 파일에만 있음 (원프레딕트 페이지)
- Middleware 로깅: 없음
- 전역 페이지뷰 추적: 없음

**영향**:
- 전체 사이트 트래픽 파악 불가
- 페이지별 인기도 측정 불가
- 사용자 여정 분석 제한적

### 2.3 로그 수집 시스템

**현재 상태**: ❌ **구조화된 로그 파일 없음**

- 서버 로그: 구조화되지 않음 (`[VisitTrackFail]` 등)
- 로그 파일: 없음
- 복원 가능성: 없음

**문제점**:
- Visit API 실패 시 데이터 손실
- 복원 불가능
- 디버깅 어려움

---

## 3. 집계 시스템 현황

### 3.1 마케팅 통계 집계

**구현 상태**: ✅ **구현됨** (SQL 오류 수정 완료)

**집계 함수**:
- `get_marketing_summary()` RPC 함수
- 클라이언트별, 기간별 집계
- UTM 파라미터별 분류

**API 엔드포인트**:
- `GET /api/clients/[clientId]/campaigns/summary`

**집계 항목**:
- 전체 전환 수
- Source/Medium/Campaign별 집계
- 조합별 집계

### 3.2 링크별 통계

**구현 상태**: ✅ **구현됨**

**API 엔드포인트**:
- `GET /api/clients/[clientId]/campaigns/links/[linkId]/stats`

**집계 항목**:
- Visits (방문 수)
- Conversions (전환 수)
- CVR (전환율)

**데이터 소스**:
- `event_access_logs` (Visits)
- `event_survey_entries` (Conversions)

### 3.3 웨비나 통계

**구현 상태**: ✅ **부분 구현됨**

**집계 항목**:
- ✅ 접속 통계 (실시간, 5분 버킷)
- ✅ 채팅 통계
- ✅ 질문 통계
- ✅ 파일 다운로드
- ✅ 폼 제출
- ✅ 추첨

**데이터 소스**:
- `webinar_live_presence` (실시간 접속자)
- `webinar_access_logs` (접속 통계)
- `messages` (채팅)
- `questions` (질문)
- `webinar_downloads` (다운로드)
- `form_submissions` (폼)
- `giveaways` (추첨)

---

## 4. 문제점 분석

### 4.1 데이터 수집 문제

#### 문제 1: Visit 추적 불완전
- **현상**: 일부 페이지에서 Visit API 호출 누락
- **영향**: 
  - 랜딩 페이지 방문 미기록
  - 웨비나 라이브 시청 미기록
  - 전체 방문 수 파악 불가
- **우선순위**: 🔴 **높음**

#### 문제 2: 일반 페이지뷰 추적 없음
- **현상**: 전체 사이트 페이지뷰 집계 시스템 없음
- **영향**:
  - 관리자 페이지, 대시보드 등 트래픽 파악 불가
  - 사용자 여정 분석 제한적
  - 페이지별 인기도 측정 불가
- **우선순위**: 🟡 **중간**

#### 문제 3: 로그 수집 시스템 부재
- **현상**: 구조화된 로그 파일 저장 없음
- **영향**:
  - Visit API 실패 시 데이터 손실
  - 복원 불가능
  - 디버깅 어려움
- **우선순위**: 🟡 **중간**

### 4.2 집계 시스템 문제

#### 문제 4: 실시간 집계 부재
- **현상**: 대부분 배치 집계 (쿼리 시점)
- **영향**:
  - 실시간 대시보드 제한적
  - 대용량 데이터 쿼리 시 성능 이슈
- **우선순위**: 🟢 **낮음**

#### 문제 5: 통합 통계 뷰 부재
- **현상**: 각 통계가 분리되어 있음
- **영향**:
  - 전체적인 성과 파악 어려움
  - 크로스 분석 제한적
- **우선순위**: 🟡 **중간**

### 4.3 데이터 품질 문제

#### 문제 6: Visit-등록 연결률 낮음
- **현상**: session_id 전달 누락 또는 불일치
- **영향**:
  - 퍼널 분석 불가
  - 전환 추적 불완전
- **우선순위**: 🔴 **높음**

#### 문제 7: UTM 추적률 낮음
- **현상**: UTM 파라미터 유실 (리다이렉트, 쿠키 만료 등)
- **영향**:
  - 마케팅 채널 성과 측정 불가
  - ROI 분석 제한적
- **우선순위**: 🔴 **높음**

---

## 5. 개선 방향 제안

### 5.1 데이터 수집 개선

#### 방안 1: Middleware 레벨 페이지뷰 로깅 (권장)

**목적**: 모든 페이지뷰를 구조화된 로그 파일에 기록

**장점**:
- 클라이언트 JavaScript 실행 여부와 무관
- 서버 사이드에서 안정적
- DB 실패해도 로그는 남음
- 복원 가능

**구현**:
- `middleware.ts`에서 페이지뷰 로깅
- `lib/logging/pageview-logger.ts` 모듈 생성
- JSON Lines 형식 로그 파일 저장 (`logs/pageviews/YYYY-MM-DD.jsonl`)

**로그 형식**:
```json
{
  "timestamp": "2026-02-02T18:46:00.000Z",
  "path": "/event/149403",
  "method": "GET",
  "query": {"utm_source": "email", "cid": "ABC123"},
  "referrer": "https://example.com",
  "user_agent": "Mozilla/5.0...",
  "ip": "1.2.3.0", // 마스킹됨
  "session_id": "session-xxx",
  "campaign_id": "3a88682e-...",
  "webinar_id": null,
  "client_id": "55317496-...",
  "status": "logged"
}
```

**특징**:
- 비동기 쓰기 (응답 지연 없음)
- 배치 쓰기 (성능 최적화)
- 날짜별 파일 분리
- IP 마스킹 (GDPR 준수)

#### 방안 2: Vercel Analytics 연동 (대안)

**목적**: Vercel 플랫폼의 기본 분석 기능 활용

**장점**:
- 설정 간단
- 실시간 대시보드 제공
- 추가 인프라 불필요

**단점**:
- Vercel 플랫폼 종속
- 커스터마이징 제한적
- 데이터 수출 제한적

**구현**:
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### 방안 3: Google Analytics 4 연동 (대안)

**목적**: 업계 표준 분석 도구 활용

**장점**:
- 강력한 분석 기능
- 커스터마이징 가능
- 데이터 수출 가능

**단점**:
- 설정 복잡
- 개인정보 보호 고려 필요
- 추가 비용 가능

**권장**: **방안 1 (Middleware 로깅)** + **방안 2 (Vercel Analytics)** 조합

### 5.2 Visit API 보완

#### 누락된 페이지에 Visit API 추가

**우선순위 1**: `WelcomePage` (랜딩 페이지)
- **파일**: `app/event/[...path]/components/WelcomePage.tsx`
- **작업량**: 30분
- **효과**: 랜딩 페이지 방문 기록

**우선순위 2**: `WebinarView` (웨비나 라이브)
- **파일**: `app/(webinar)/webinar/[id]/components/WebinarView.tsx`
- **작업량**: 30분
- **효과**: 웨비나 시청 페이지뷰 기록

### 5.3 로그 복원 시스템 구축

#### Phase 1: 로그 파일 저장
- Middleware에서 페이지뷰 로깅
- JSON Lines 형식
- 날짜별 파일 분리

#### Phase 2: 복원 스크립트
- `scripts/restore-pageviews-from-logs.ts`
- 로그 파일 파싱
- `event_access_logs`에 복원
- 중복 제거 로직

#### Phase 3: UTM 복원
- `scripts/restore-utm-from-logs.ts`
- 등록 시 UTM 없는 경우 로그에서 복원
- `event_survey_entries` 업데이트

### 5.4 집계 시스템 개선

#### 실시간 집계 뷰 생성

**목적**: 자주 조회되는 집계를 미리 계산하여 저장

**방안**:
- Materialized View 생성
- 주기적 갱신 (1시간마다 또는 트리거)
- 실시간 대시보드 성능 향상

**예시**:
```sql
CREATE MATERIALIZED VIEW mv_campaign_daily_stats AS
SELECT 
  campaign_id,
  DATE(accessed_at) as date,
  COUNT(DISTINCT session_id) as visits,
  COUNT(DISTINCT entry_id) as conversions
FROM event_access_logs
GROUP BY campaign_id, DATE(accessed_at);

CREATE UNIQUE INDEX ON mv_campaign_daily_stats (campaign_id, date);
```

#### 통합 통계 API

**목적**: 여러 통계를 한 번에 조회

**API**: `GET /api/clients/[clientId]/statistics/overview`

**응답 형식**:
```json
{
  "period": {
    "from": "2026-01-01",
    "to": "2026-02-02"
  },
  "campaigns": {
    "total": 10,
    "visits": 1500,
    "conversions": 300,
    "cvr": 20.0
  },
  "webinars": {
    "total": 5,
    "registrations": 200,
    "live_viewers": 150
  },
  "links": {
    "total": 20,
    "active": 15,
    "total_visits": 1200,
    "total_conversions": 250
  }
}
```

---

## 6. 권장 아키텍처

### 6.1 3계층 데이터 수집 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    데이터 수집 계층                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Layer 1] Middleware 로깅 (서버 사이드)                │
│  └─→ 모든 요청을 로그 파일에 기록                        │
│      - 클라이언트 실행 여부와 무관                       │
│      - 실패해도 응답 정상                                │
│                                                          │
│  [Layer 2] Visit API (클라이언트 사이드)                │
│  └─→ 주요 페이지에서 DB에 직접 저장                     │
│      - 실시간 집계 가능                                  │
│      - 실패해도 로그 파일은 남음                         │
│                                                          │
│  [Layer 3] 등록/전환 API                                │
│  └─→ 폼 제출 시점에 저장                                │
│      - Visit과 session_id로 연결                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 데이터 흐름도

```
[사용자 요청]
    │
    ├─→ [Middleware]
    │       ├─→ 쿠키/세션 관리
    │       └─→ 로그 파일 저장 (비동기)
    │
    ├─→ [페이지 렌더링]
    │       │
    │       └─→ [Visit API 호출] (클라이언트)
    │               └─→ event_access_logs 저장
    │
    └─→ [등록/전환]
            │
            └─→ [등록 API]
                    ├─→ event_survey_entries 저장
                    └─→ event_access_logs 업데이트 (converted_at)
```

### 6.3 집계 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    집계 계층                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [실시간 집계]                                          │
│  └─→ 쿼리 시점 집계 (현재 방식)                         │
│      - get_marketing_summary() RPC                      │
│      - API 엔드포인트 직접 쿼리                          │
│                                                          │
│  [배치 집계] (개선 제안)                                 │
│  └─→ Materialized View 또는 캐시                       │
│      - 주기적 갱신 (1시간마다)                          │
│      - 실시간 대시보드 성능 향상                        │
│                                                          │
│  [통합 통계 API] (개선 제안)                             │
│  └─→ 여러 통계를 한 번에 조회                           │
│      - /api/clients/[clientId]/statistics/overview     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.4 로그 관리 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    로그 관리 계층                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [로그 수집]                                            │
│  └─→ middleware.ts                                      │
│      └─→ logs/pageviews/YYYY-MM-DD.jsonl               │
│                                                          │
│  [로그 저장소]                                          │
│  └─→ 개발: 로컬 파일 시스템                              │
│      운영: 클라우드 스토리지 (S3, GCS) 또는 로컬 + 백업 │
│                                                          │
│  [로그 처리]                                            │
│  └─→ 복원 스크립트                                      │
│      - restore-pageviews-from-logs.ts                   │
│      - restore-utm-from-logs.ts                         │
│                                                          │
│  [로그 보관]                                            │
│  └─→ 30일 이상 자동 아카이빙                            │
│      - 압축 후 보관                                     │
│      - 필요 시 복원                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 구현 우선순위

### Phase 1: 즉시 조치 (1주일 내)

#### 1.1 Visit API 보완 (우선순위: 🔴 최우선)
- [ ] `WelcomePage`에 Visit API 추가
- [ ] `WebinarView`에 Visit API 추가
- **작업량**: 1-2시간
- **효과**: 방문 추적률 60% → 90%+

#### 1.2 로그 수집 시스템 구축 (우선순위: 🔴 높음)
- [ ] `lib/logging/pageview-logger.ts` 모듈 생성
- [ ] `middleware.ts`에 페이지뷰 로깅 추가
- [ ] 로그 파일 저장 구조 설정
- **작업량**: 4-6시간
- **효과**: 데이터 손실 방지, 복원 가능

#### 1.3 Vercel Analytics 연동 (우선순위: 🟡 중간)
- [ ] `@vercel/analytics` 패키지 설치
- [ ] `app/layout.tsx`에 Analytics 컴포넌트 추가
- **작업량**: 30분
- **효과**: 실시간 대시보드 제공

### Phase 2: 중기 개선 (2-4주)

#### 2.1 로그 복원 시스템 (우선순위: 🟡 중간)
- [ ] `scripts/restore-pageviews-from-logs.ts` 생성
- [ ] `scripts/restore-utm-from-logs.ts` 생성
- [ ] 복원 테스트 및 검증
- **작업량**: 3-4시간
- **효과**: 과거 데이터 복원 가능

#### 2.2 실시간 집계 개선 (우선순위: 🟢 낮음)
- [ ] Materialized View 생성
- [ ] 주기적 갱신 로직 구현
- [ ] 성능 테스트
- **작업량**: 4-6시간
- **효과**: 대시보드 성능 향상

#### 2.3 통합 통계 API (우선순위: 🟡 중간)
- [ ] `GET /api/clients/[clientId]/statistics/overview` 생성
- [ ] 여러 통계 통합 조회
- [ ] 프론트엔드 연동
- **작업량**: 3-4시간
- **효과**: 통합 대시보드 제공

### Phase 3: 장기 개선 (1-3개월)

#### 3.1 모니터링 시스템 (우선순위: 🟡 중간)
- [ ] Visit API 호출률 모니터링
- [ ] UTM 추적률 모니터링
- [ ] Visit-등록 연결률 모니터링
- [ ] 알림 시스템 구축
- **작업량**: 1-2주
- **효과**: 문제 조기 발견

#### 3.2 데이터 품질 개선 (우선순위: 🔴 높음)
- [ ] session_id 전달 일관성 보장
- [ ] UTM 파라미터 보존 강화
- [ ] 리다이렉트 경로 개선
- **작업량**: 1-2주
- **효과**: 추적률 향상

#### 3.3 고급 분석 기능 (우선순위: 🟢 낮음)
- [ ] 퍼널 분석
- [ ] 사용자 여정 분석
- [ ] 코호트 분석
- **작업량**: 2-4주
- **효과**: 심층 분석 가능

---

## 8. 권장 구현 방식

### 8.1 페이지뷰 추적: Middleware 로깅 + Vercel Analytics

**이유**:
1. **Middleware 로깅**: 
   - 모든 요청 기록 (클라이언트 실행 여부와 무관)
   - 복원 가능
   - 커스터마이징 가능

2. **Vercel Analytics**:
   - 실시간 대시보드 제공
   - 설정 간단
   - 추가 인프라 불필요

**조합 효과**:
- 안정성 (Middleware 로깅)
- 편의성 (Vercel Analytics)
- 복원 가능성 (로그 파일)

### 8.2 Visit 추적: 클라이언트 API 유지 + Middleware 로깅 보완

**이유**:
- 기존 시스템과 호환성 유지
- 실시간 집계 가능
- Middleware 로깅으로 이중화

### 8.3 집계: 실시간 쿼리 + Materialized View

**이유**:
- 실시간성 유지 (직접 쿼리)
- 성능 최적화 (Materialized View)
- 유연성 (필요 시 선택적 사용)

---

## 9. 예상 효과

### 9.1 데이터 수집 개선

| 항목 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| Visit 추적률 | 60-70% | 95%+ | +25-35%p |
| 일반 페이지뷰 추적 | 0% | 100% | +100%p |
| 데이터 손실 방지 | 없음 | 로그 파일 백업 | ✅ |
| 복원 가능성 | 없음 | 있음 | ✅ |

### 9.2 집계 성능 개선

| 항목 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| 대시보드 로딩 시간 | 2-5초 | <1초 | 50-80% |
| 실시간 집계 가능 | 제한적 | 완전 | ✅ |
| 통합 통계 조회 | 불가 | 가능 | ✅ |

### 9.3 데이터 품질 개선

| 항목 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| Visit-등록 연결률 | 0-20% | 70%+ | +50-70%p |
| UTM 추적률 | 1.8% | 60%+ | +58%p |
| 데이터 완전성 | 부분적 | 완전 | ✅ |

---

## 10. 결론 및 권장사항

### 10.1 핵심 권장사항

1. **즉시 구현**: Middleware 레벨 페이지뷰 로깅
   - 모든 페이지뷰 기록
   - 데이터 손실 방지
   - 복원 가능

2. **즉시 구현**: Visit API 보완
   - WelcomePage, WebinarView에 추가
   - 방문 추적률 향상

3. **즉시 구현**: Vercel Analytics 연동
   - 실시간 대시보드 제공
   - 설정 간단

4. **중기 구현**: 로그 복원 시스템
   - 과거 데이터 복원 가능
   - 문제 발생 시 복구

5. **장기 구현**: 모니터링 시스템
   - 문제 조기 발견
   - 자동 알림

### 10.2 아키텍처 선택

**권장**: **3계층 데이터 수집 아키텍처**

1. **Layer 1**: Middleware 로깅 (서버 사이드)
   - 모든 요청 기록
   - 복원 가능

2. **Layer 2**: Visit API (클라이언트 사이드)
   - 실시간 집계
   - 기존 시스템 유지

3. **Layer 3**: 등록/전환 API
   - 전환 추적
   - Visit 연결

**장점**:
- 이중화로 안정성 확보
- 실시간성 유지
- 복원 가능성 보장

### 10.3 다음 단계

1. **승인**: 이 보고서 검토 및 승인
2. **Phase 1 시작**: 즉시 조치 항목 구현
3. **테스트**: 각 단계별 테스트 및 검증
4. **모니터링**: 구현 후 모니터링 및 개선

---

**작성자**: AI Assistant  
**검토 필요**: 개발팀, 운영팀, 제품팀  
**다음 단계**: Phase 1 구현 시작
