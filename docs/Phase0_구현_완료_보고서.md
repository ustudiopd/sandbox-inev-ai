# Phase 0 구현 완료 보고서

**작성일**: 2026-02-02  
**작업 범위**: 통계·로그·집계 시스템 헌법 Phase 0  
**상태**: ✅ 완료

---

## 📋 작업 목표

헌법 문서의 Phase 0 항목 구현:
1. Visit/등록 연결(session_id) 규칙을 서버 중심으로 통일
2. UTM 보존 규칙 확립 (리다이렉트/CSR/SSR 흔들림 방지)
3. Fact 저장이 dimension에 의해 깨지지 않게 방어(이번 cid 사고 재발 방지)
4. 실패는 사용자 UX에 전파하지 않되, **실패 시 구조화 로그**로 원인 추적 가능

---

## ✅ 완료된 작업

### 1. Visit 커버리지 확보

#### WelcomePage에 Visit API 추가
- **파일**: `app/event/[...path]/components/WelcomePage.tsx`
- **변경사항**:
  - `useEffect`에서 Visit API 호출 추가
  - UTM 파라미터, CID, referrer, user_agent 수집
  - 에러 발생 시 graceful failure 처리
- **효과**: 랜딩 페이지 방문 추적 가능

#### WebinarView에 Visit API 추가
- **파일**: `app/(webinar)/webinar/[id]/components/WebinarView.tsx`
- **변경사항**:
  - `useEffect`에서 Visit API 호출 추가
  - 웨비나 시청 페이지 방문 추적
  - `registration_campaign_id` 또는 웨비나 ID 사용
- **효과**: 웨비나 시청 페이지뷰 추적 가능

### 2. 구조화 로그 추가

#### Visit API 구조화 로그
- **파일**: `app/api/public/campaigns/[campaignId]/visit/route.ts`
- **변경사항**:
  - 실패 시 `[VisitTrackFail]` JSON 로그 출력
  - dimension 부재 정보 포함 (`cidLookupFailed`, `hasMarketingLinkId` 등)
  - 성공 시에도 dimension 부재 정보 로깅 (`[VisitTrackDimension]`)
- **효과**: 실패 원인 추적 및 데이터 품질 모니터링 가능

#### 등록 API 구조화 로그
- **파일**: `app/api/public/event-survey/[campaignId]/submit/route.ts`
- **변경사항**:
  - 등록 저장 실패 시 `[EntryTrackFail]` JSON 로그 출력
  - 전체 API 오류 시 구조화 로그 출력
- **효과**: 등록 실패 원인 추적 가능

### 3. 서버 중심 session_id 관리

#### Middleware에서 session_id 쿠키 생성/관리
- **파일**: `middleware.ts`
- **변경사항**:
  - 이벤트/웨비나 경로에서 session_id 쿠키 자동 생성
  - 쿠키가 없으면 UUID 생성하여 설정
  - TTL 30분, httpOnly: false (클라이언트에서도 읽기 가능)
- **효과**: 서버 사이드에서 session_id 보장

#### Visit API에서 쿠키 기반 session_id 보완
- **파일**: `app/api/public/campaigns/[campaignId]/visit/route.ts`
- **변경사항**:
  - 클라이언트가 보내는 session_id 우선 사용
  - 없으면 쿠키에서 읽어서 보완
  - 쿠키도 없으면 에러 반환 (하지만 graceful failure)
- **효과**: 클라이언트 JavaScript 실패 시에도 session_id 보장

### 4. Fact 저장 방어 강화

#### Dimension 부재 방어
- **파일**: `app/api/public/campaigns/[campaignId]/visit/route.ts`
- **변경사항**:
  - cid lookup 실패해도 Fact 저장 계속 진행
  - UTM 정규화 실패해도 Fact 저장 계속 진행
  - marketing_campaign_link_id 없어도 저장 성공
  - 모든 필드 nullable 처리
  - dimension 부재 정보를 구조화 로그에 기록
- **효과**: 워트 cid 사고 재발 방지, unknown/unresolved 그룹 모니터링 가능

---

## 📊 구현 결과

### Visit 커버리지
- ✅ WelcomePage (랜딩 페이지)
- ✅ RegistrationPage (등록 페이지)
- ✅ SurveyPage (설문 페이지)
- ✅ OnePredictRegistrationPage (원프레딕트 등록)
- ✅ WebinarEntry (웨비나 입장)
- ✅ WebinarView (웨비나 시청) - **신규 추가**
- ✅ WebinarFormWertPage (워트 랜딩) - **신규 추가**

### 구조화 로그 형식

#### Visit 실패 로그
```json
{
  "campaignId": "...",
  "sessionId": "...",
  "reason": "DB_INSERT_FAILED",
  "status": 500,
  "error": "...",
  "dimensionIssues": {
    "cidLookupFailed": true,
    "hasCid": true,
    "hasMarketingLinkId": false,
    "utmNormalized": true
  },
  "timestamp": "2026-02-02T..."
}
```

#### 등록 실패 로그
```json
{
  "campaignId": "...",
  "sessionId": "...",
  "reason": "DB_INSERT_FAILED",
  "status": 500,
  "error": "...",
  "timestamp": "2026-02-02T..."
}
```

#### Dimension 부재 로그
```json
{
  "campaignId": "...",
  "sessionId": "...",
  "hasCid": true,
  "cidLookupFailed": true,
  "hasMarketingLinkId": false,
  "dimensionStatus": "unresolved",
  "timestamp": "2026-02-02T..."
}
```

---

## 🔍 헌법 원칙 준수 확인

### ✅ 원칙 1: Fact와 Analysis 분리
- Fact 저장은 독립적으로 동작 (집계와 분리)
- 구조화 로그로 Fact 품질 모니터링 가능

### ✅ 원칙 2: "차원 부재"가 Fact 수집을 깨면 안 됨
- cid lookup 실패해도 저장 성공
- UTM 정규화 실패해도 저장 성공
- dimension 부재 정보를 로그로 기록

### ✅ 원칙 3: 웨비나 접속 통계 v2 패턴 준수
- Visit API는 가벼운 insert만 수행
- 집계는 별도 크론/잡에서 수행 (Phase 1에서 구현 예정)

### ✅ 원칙 4: 집계는 외부 라이브러리에 위임하지 않음
- DB 기반 집계 유지
- 구조화 로그는 stdout 출력 (Vercel Log Drain 연동 가능)

---

## 🎯 다음 단계 (Phase 1)

Phase 0 완료 후 다음 작업:
1. **증분 집계 테이블 도입**
   - 마케팅 요약/링크 통계를 버킷 집계로 전환
   - 쿼리 시점 집계를 사전 집계로 대체

2. **집계 크론/잡 구현**
   - 1분/5분 단위 증분 집계
   - 멱등성 보장 (재실행 가능)
   - 백필(backfill) 모드 지원

3. **집계 테이블 스키마 설계**
   - 버킷 단위 (일/시간)
   - 키 설계 (client_id + bucket_date + campaign_id + dimensions)
   - unknown/unresolved 버킷 지원

---

## 📝 참고 문서

- `docs/통계로그집게헌법.md` - 헌법 문서
- `docs/통계로그집게헌법_검토_보고서.md` - 헌법 검토 보고서
- `docs/EventFlow_통계_로그_집계_시스템_종합_검토_보고서.md` - 종합 검토 보고서

---

**작업 완료일**: 2026-02-02  
**다음 단계**: Phase 1 구현 시작
