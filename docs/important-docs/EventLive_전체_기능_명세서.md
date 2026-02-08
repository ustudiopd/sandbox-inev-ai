# EventLive 전체 기능 명세서

**작성일**: 2026-02-08  
**대상**: eventflow.kr (EventLive)  
**목적**: 현재 구현된 모든 기능에 대한 단일 명세서

---

## 목차

1. [개요 및 시스템 구조](#1-개요-및-시스템-구조)
2. [설문 (Event Survey)](#2-설문-event-survey)
3. [등록 (Registration)](#3-등록-registration)
4. [온디맨드 (On-Demand)](#4-온디맨드-on-demand)
5. [웨비나 (Live Webinar)](#5-웨비나-live-webinar)
6. [UTM 및 Visit 추적](#6-utm-및-visit-추적)
7. [이메일 발송 시스템](#7-이메일-발송-시스템)
8. [통계](#8-통계)
9. [권한 및 인증](#9-권한-및-인증)
10. [API 및 라우트 요약](#10-api-및-라우트-요약)

---

## 1. 개요 및 시스템 구조

### 1.1 기술 스택

- **프레임워크**: Next.js (App Router)
- **백엔드/DB**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **배포**: Vercel
- **이메일**: nodemailer (Gmail SMTP), 클라이언트 캠페인 이메일(별도 시스템)

### 1.2 사용자/테넌트 구조

- **Super Admin**: 전체 시스템 관리
- **Agency**: 에이전시, 소속 클라이언트 관리
- **Client**: 클라이언트(회사), 웨비나/설문/온디맨드/캠페인 관리
- **참가자**: 공개 페이지에서 설문·등록·웨비나 시청

### 1.3 주요 진입 경로

| 경로 | 용도 |
|------|------|
| `/event/[publicPath]` | 이벤트/설문/등록 캠페인 (웰컴, 설문, 등록, 완료) |
| `/webinar/[id]` | 웨비나 입장 페이지 |
| `/webinar/[id]/live` | 웨비나 라이브 시청 |
| `/webinar/[id]/console` | 웨비나 관리자 콘솔 |
| `/ondemand/[id]` | 온디맨드 랜딩 |
| `/ondemand/[id]/watch` | 온디맨드 시청 |
| `/s/[code]` | 단축 링크(대시보드 코드 등) |
| `/client/[clientId]/...` | 클라이언트 대시보드 |
| `/login`, `/signup` | 로그인/회원가입 |

---

## 2. 설문 (Event Survey)

### 2.1 범위

- **캠페인(Campaign)**: 이벤트/설문 이벤트 1개 단위 (`event_survey_campaigns`)
- **폼(Form)**: 설문 문항 집합, 설문/퀴즈 타입
- **엔트리(Entry)**: 참여자 1명 1회 제출 기록 (`event_survey_entries`)
- **완료번호(survey_no)**: 설문 완료 순서 번호(현장용)
- **확인 스캔(verified)**: 스탭이 QR/코드로 완료 여부 확인한 기록

### 2.2 공개 화면

| 화면 | 경로 | 기능 |
|------|------|------|
| 웰컴/시작 | `/event/[path]` | 참여 안내, "설문 참여하기" / "참여 확인하기" |
| 설문 참여 | `/event/[path]/survey` | 이름/회사/전화번호 + 추가 문항, 제출 |
| 설문 완료 | 완료 후 | 완료번호(survey_no), 6자리 확인코드, QR 표시 |
| 참여 확인 | 시작 페이지 | 전화번호 입력 → 완료자면 완료 정보, 미참여면 설문 유도 |

### 2.3 관리 기능 (클라이언트 대시보드)

- 캠페인 생성/편집/발행
- 폼/문항 빌더, 템플릿
- 참여자(엔트리) 목록, 상세, 스캔/검증
- 경품 기록(사후 일괄 입력 가능)
- 통계/리포트, CSV 내보내기
- AI 분석/보고서(별도 명세)

### 2.4 API (설문 관련)

- `POST /api/public/event-survey/[campaignId]/submit` — 설문 제출
- `GET/POST /api/public/event-survey/[campaignId]/register` — 등록(이벤트 등록)
- `GET /api/public/event-survey/[campaignId]/lookup`, `lookup-email` — 참여 확인
- `POST /api/public/event-survey/[campaignId]/scan` — 스캔 기록
- `GET /api/public/event-survey/campaigns/[campaignId]/entries`, `stats` — 엔트리/통계
- `GET/POST /api/event-survey/campaigns/[campaignId]/...` — 캠페인/폼/엔트리 관리(인증)

---

## 3. 등록 (Registration)

### 3.1 이벤트/캠페인 등록

- **경로**: `/event/[path]` (등록 페이지)
- **대상**: `event_survey_campaigns`에 연결된 등록 폼
- **동작**: 이름·이메일·전화 등 수집 → `event_survey_entries` 저장, UTM/Visit 연동
- **특수 플로우**: OnePredict(149402 등) 전용 등록 페이지, WERT 스타일

### 3.2 웨비나 등록

- **경로**: `/webinar/[id]`, `/webinar/[id]/register`
- **정책(access_policy)**:
  - `auth`: 로그인 필수
  - `guest_allowed`: 비로그인 허용
  - `invite_only`: 초대만
  - `email_auth`, `name_email_auth`: 이메일(또는 이름+이메일)로 인증 후 입장
- **저장**: `registrations` (webinar_id, user_id 복합 PK), 게스트는 세션 기반
- **등록 생성 시점**: 입장 시 자동 등록(access/track) 또는 명시적 register 호출

### 3.3 API (등록 관련)

- `POST /api/webinars/[webinarId]/register` — 웨비나 등록
- `POST /api/webinars/[webinarId]/register-request` — 등록 요청(이메일 발송 연동 가능)
- `GET /api/webinars/[webinarId]/check-registration` — 등록 여부 확인
- `GET /api/webinars/[webinarId]/registrants` — 등록자 목록(관리자)
- `GET /api/webinars/[webinarId]/allowed-emails` — 허용 이메일 목록

---

## 4. 온디맨드 (On-Demand)

### 4.1 범위

- **온디맨드 콘텐츠**: 녹화 영상 시청, 시작/종료 시간 제한 가능
- **인증**: 이메일+이름 기반 세션(쿠키/토큰), 로그인 불필요 옵션

### 4.2 공개 화면

| 화면 | 경로 | 기능 |
|------|------|------|
| 랜딩 | `/ondemand/[id]` | 소개, 시청/등록 유도 |
| 등록 | `/ondemand/[id]/register` | 이메일·이름 등록 |
| 로그인 | `/ondemand/[id]/login` | 기존 등록자 로그인 |
| 시청 | `/ondemand/[id]/watch` | 영상 재생, 세션 키 기반 인증 |
| 시청(세션) | `/ondemand/[id]/watch/[sessionKey]` | 세션별 시청 페이지 |

### 4.3 시청 중 기능

- 영상 재생 (YouTube 또는 업로드 영상)
- 설문 모달: 시청 중 설문 제출 (`/api/public/ondemand/[id]/survey/check`, `submit`)
- 구간별 제한: start_time / end_time 지원

### 4.4 API (온디맨드)

- `GET /api/ondemand/[id]/check-registration` — 등록/시청 권한 확인
- `POST /api/public/ondemand/[id]/survey/check` — 설문 노출 여부
- `POST /api/public/ondemand/[id]/survey/submit` — 설문 제출
- `POST /api/ondemand/create` — 온디맨드 생성(관리자)

---

## 5. 웨비나 (Live Webinar)

### 5.1 라이브 시청 화면

- **경로**: `/webinar/[id]/live`
- **구성**: 영상 영역, 채팅, Q&A, 경품(추첨), 폼/퀴즈/설문 위젯, 파일 다운로드, 접속자 표시 등

### 5.2 채팅 (Chat)

- **실시간**: Supabase Realtime 채널 구독
- **폴백**: Realtime 실패 시 메시지 목록 폴링(약 2초±), 서킷 브레이커
- **기능**: 메시지 발송, 숨김(관리자), 삭제, 인사말 버튼 등
- **저장**: `messages` (webinar_id, user_id, content, hidden 등)
- **API**: `GET/POST /api/webinars/[webinarId]/messages`

### 5.3 Q&A (질문)

- **실시간**: Realtime 구독
- **폴백**: 폴링(약 5초)
- **기능**: 질문 등록, 답변(관리자), 공개/비공개, 노출 순서
- **저장**: `questions` (webinar_id, user_id, status 등)
- **API**: `GET/POST /api/webinars/[webinarId]/questions`

### 5.4 경품 추첨 (Giveaway)

- **기능**: 경품 생성, 참가 신청(버튼), 참가자 목록, 추첨 실행, 당첨자 발표
- **상태**: draft → open → drawn
- **API**:  
  - `GET/POST /api/webinars/[webinarId]/giveaways`  
  - `POST /api/webinars/[webinarId]/giveaways/[giveawayId]/enter`  
  - `POST /api/webinars/[webinarId]/giveaways/[giveawayId]/draw`  
  - `GET /api/webinars/[webinarId]/giveaways/[giveawayId]/participants`, `results`

### 5.5 폼/퀴즈/설문 (라이브 내)

- **폼(Form)**: 설문/퀴즈 타입, 문항, 제출
- **기능**: 라이브 중 폼 오픈, 참가자 제출, 결과 조회
- **API**:  
  - `GET /api/webinars/[webinarId]/forms`, `forms/[formId]`  
  - `POST /api/webinars/[webinarId]/forms/[formId]/submit`  
  - `GET /api/webinars/[webinarId]/forms/[formId]/results`  
  - 관리: `forms/create`, `forms/[formId]/status` 등

### 5.6 하트비트 및 접속 추적

- **Presence Ping**: `POST /api/webinars/[webinarId]/presence/ping` — 120초± 주기, `webinar_live_presence` 갱신
- **세션 하트비트**: body에 `session_id` 포함 시 `webinar_user_sessions`의 `last_heartbeat_at`, `watched_seconds_raw` 갱신 (RPC `update_session_heartbeat`)
- **Access Track**: `POST /api/webinars/[webinarId]/access/track` — 입장 시 1회, 이후 5분마다, 세션·자동등록
- **Access Exit**: `POST /api/webinars/[webinarId]/access/exit` — 퇴장 시 `exited_at` 기록

### 5.7 인증 (웨비나 입장)

- **일반 로그인**: Supabase Auth (이메일/비밀번호 등)
- **이메일 인증(매직 링크 방식)**:  
  - `access_policy`가 `email_auth` 또는 `name_email_auth`인 웨비나  
  - `POST /api/auth/email-signup`: 등록된 이메일만 가입/로그인 가능  
  - `webinar_allowed_emails` 또는 등록 캠페인(`event_survey_entries`)에서 이메일 검증  
  - 임시 비밀번호 생성 후 `signInWithPassword`로 로그인 처리 (비밀번호 없이 이메일만으로 입장하는 효과)

### 5.8 관리자 콘솔 (웨비나)

- **경로**: `/webinar/[id]/console`
- **탭**: 대시보드, 채팅 관리, Q&A 관리, 경품, 폼, 참가자, 통계, 설정
- **대시보드**: 접속자 수/목록, 접속 로그, 메시지 요약, 5초 폴링(`/api/webinars/[id]/stats/access`)
- **채팅 관리**: 메시지 목록, 숨김/삭제, **새 창 보기** — `window.open(..., 'qa-display', ...)` 로 채팅 전용 창
- **Q&A 관리**: 질문 목록, 답변, 공개/비공개, **새 창 보기** — Q&A 전용 디스플레이 창 (`/webinar/[id]/console/qa/display/[questionId]`, `/qa/list`)
- **경품**: 경품 CRUD, 참가자 목록, 추첨 실행, **새 창에서 추첨/결과 보기** — `window.open(url, '_blank', 'width=1200,height=800')`
- **파일**: 업로드, 다운로드 링크, 새 창에서 다운로드
- **설정**: 웨비나 정보, 접근 정책, 이메일 템플릿, 썸네일, 대시보드 코드 등

### 5.9 웨비나 관련 API 요약

- 접속/세션: `access/track`, `access/exit`, `access/log`, `presence/ping`
- 등록: `register`, `check-registration`, `registrants`
- 채팅: `messages`
- Q&A: `questions`
- 경품: `giveaways`, `giveaways/[id]/enter`, `draw`, `participants`, `results`
- 폼: `forms`, `forms/[id]`, `forms/[id]/submit`, `forms/[id]/results`
- 통계: `stats`, `stats/access`, `stats/chat`, `stats/qa`, `stats/forms`, `stats/giveaways`, `stats/files`, `stats/registrants`, `stats/survey`, `stats/sessions`
- 내보내기: `export/today-access`, `export/qna`, `export/survey`

---

## 6. UTM 및 Visit 추적

### 6.1 UTM 파라미터

- **지원**: utm_source, utm_medium, utm_campaign, utm_term, utm_content, cid
- **추출/정규화**: `lib/utils/utm.ts` (extractUTMParams, normalizeUTM)
- **보관**: URL → localStorage `utm:${campaign.id}` (캠페인별), 쿠키 `ef_tracking`(선택), Visit API로 전송

### 6.2 Visit 기록

- **API**: `POST /api/public/campaigns/[campaignId]/visit`
- **호출 시점**: 랜딩/등록/설문 페이지 마운트 시 1회 (WelcomePage, RegistrationPage, SurveyPage, OnePredictRegistrationPage, WebinarFormWertPageContent 등)
- **Body**: session_id, utm_*, cid, referrer, user_agent
- **저장**: `event_access_logs` (campaign_id 또는 webinar_id, session_id, utm_*, cid, accessed_at, marketing_campaign_link_id 등)
- **세션**: `ef_session_id` 쿠키(30분 TTL), middleware에서 `/event/`, `/webinar/`, `/s/` 진입 시 없으면 생성

### 6.3 캠페인 링크 (CID)

- **테이블**: `campaign_link_meta` (client_id, cid, target_campaign_id, UTM 등)
- **역할**: 짧은 URL용 cid로 링크 식별, Visit 시 marketing_campaign_link_id 연결
- **관리**: 클라이언트 대시보드 > 광고/캠페인 > 캠페인 링크

---

## 7. 이메일 발송 시스템

### 7.1 웨비나 등록 이메일 (SMTP)

- **라이브러리**: nodemailer (Gmail SMTP)
- **함수**: `sendWebinarRegistrationEmail()` (`lib/email.ts`)
- **트리거**: `register-request` API 내 자동 발송은 **현재 주석 처리(비활성화)**. 수동 스크립트 사용 가능.
- **스크립트**: `scripts/send-webinar-email.ts`, `scripts/register-participants-from-excel.ts`
- **내용**: 웨비나 썸네일, 템플릿 문구(`email_template_text`), 입장 링크

### 7.2 클라이언트 캠페인 이메일

- **경로**: 클라이언트 대시보드 > 이메일(또는 캠페인 이메일)
- **API**: `/api/client/emails` (목록), `/api/client/emails/[id]` (상세), `generate`, `send`, `test-send`, `approve`, `cancel`, `audience-list`, `audience-preview`, `failed-recipients`, `mark-sent`, `reset-stuck` 등
- **기능**: 수신자 목록, 미리보기, 테스트 발송, 승인/발송, 실패 수신자, 정책(client_email_policies) 연동

---

## 8. 통계

### 8.1 웨비나 통계

- **접속**: 현재 접속자 수·목록(`webinar_live_presence`, last_seen_at ≥ 3분), 시간대별 접속자(`webinar_access_logs` 5분 버킷)
- **세션**: 입장/퇴장, 체류시간, 시청시간(watched_seconds_raw), 하트비트 기반
- **채팅**: 메시지 수, 시간대별
- **Q&A**: 질문 수, 답변 수, 상태별
- **폼/퀴즈**: 제출 수, 정답률 등
- **경품**: 참가 수, 당첨 수
- **파일**: 다운로드 수
- **등록자**: 등록 수
- **설문**: 라이브 내 설문 응답
- **수집 방식**: 라이브는 ping/track만, 집계는 크론(`webinar-access-snapshot`) + 5분 버킷, 통계 API는 관리자 호출(지연 로딩, 5분 갱신 권장)
- **API**: `GET /api/webinars/[webinarId]/stats?sections=...`, `stats/access`, `stats/sessions` 등

### 8.2 설문/등록/마케팅(이벤트) 통계

- **Visit**: `event_access_logs` — session_id 기준 dedup, UTM/cid/링크별 집계
- **전환**: 등록/설문 제출 시 `event_survey_entries` 등과 연결, `event_access_logs.entry_id`/`converted_at` 업데이트
- **집계**: 크론 `aggregate-marketing-stats` — 일별 `marketing_stats_daily` 등
- **대시보드**: 클라이언트 > 광고/캠페인 > 전환 성과, 링크별/UTM별 Visits, 전환 수, CVR
- **API**: `/api/clients/[clientId]/campaigns/summary`, `campaigns/links/[linkId]/stats`, `/api/clients/[clientId]/statistics/overview`

### 8.3 온디맨드 통계

- 시청/등록 수는 온디맨드·등록 테이블 기준 조회 (별도 접속 버킷은 웨비나와 동일 패턴 아님)

---

## 9. 권한 및 인증

### 9.1 인증 방식

- **Supabase Auth**: 이메일/비밀번호, OAuth(설정 시)
- **웨비나 이메일 인증**: `email_auth` / `name_email_auth` — 등록된 이메일만, 비밀번호 없이 임시 비밀번호로 로그인 처리
- **온디맨드**: 이메일+이름 기반 세션(쿠키/암호화 토큰)
- **공개 설문/등록**: 로그인 없이 참여 가능(캠페인 설정에 따름)

### 9.2 권한 체크

- **관리자**: `checkWebinarStatsPermission`, `checkWebinarAdmin` 등 — agency/client 멤버십, 슈퍼관리자
- **RLS**: Supabase Row Level Security — profiles, registrations, messages, questions, forms 등

---

## 10. API 및 라우트 요약

### 10.1 공개 API (인증 없음 또는 제한적)

- `POST /api/public/campaigns/[campaignId]/visit` — Visit
- `POST /api/public/event-survey/[campaignId]/register`, `submit`, `lookup`, `scan`
- `GET /api/public/event-survey/campaigns/[campaignId]/entries`, `stats` 등
- `POST /api/public/ondemand/[id]/survey/check`, `submit`
- `GET /api/public/webinars/[webinarId]/registrants` (공개 목록 등)

### 10.2 웨비나 API (참가자/관리자)

- 접속: `access/track`, `access/exit`, `access/log`, `presence/ping`
- 등록: `register`, `check-registration`, `registrants`
- 채팅: `messages`
- Q&A: `questions`
- 경품: `giveaways`, `giveaways/[id]/enter`, `draw`, `participants`, `results`
- 폼: `forms`, `forms/[id]/submit`, `forms/[id]/results`
- 통계: `stats`, `stats/access`, `stats/sessions` 등
- 내보내기: `export/today-access`, `export/qna`, `export/survey`

### 10.3 인증 API

- `POST /api/auth/email-signup` — 웨비나 이메일 인증 가입/로그인
- `POST /api/auth/dashboard` — 대시보드 세션
- `POST /api/auth/guest` — 게스트 토큰
- `POST /api/auth/refresh-jwt` — JWT 갱신

### 10.4 클라이언트/에이전시/슈퍼

- 클라이언트: `clients/[clientId]/campaigns`, `statistics`, `emails`, `branding`, `members` 등
- 에이전시: `agencies`, `agency/[id]/clients`, `domains`, `reports`
- 슈퍼: `super/agencies`, `super/clients`, `super/dashboard`

### 10.5 크론

- `GET /api/cron/webinar-access-snapshot` — 웨비나 접속 스냅샷(5분 버킷)
- `GET /api/cron/webinar-session-sweeper` — 오래된 활성 세션 종료
- `GET /api/cron/aggregate-marketing-stats` — 마케팅 일별 집계

---

## 참고 문서

- `docs/이벤트라이브_통계기능_전체명세서_v2.md`
- `docs/웨비나_통계_집계_수집_명세서.md`
- `docs/집계시스템_구현명세서.md`
- `docs/이메일_발송_시스템_명세서.md`
- `docs/설문조사_명세서.md`
- `docs/UTM_추적_시스템_사용_가이드.md`
- `docs/UTM_및_Visit_추적_시스템_구조.md`
- `docs/광고캠페인_모듈_명세서_v1.1_패치.md`

---

**문서 버전**: 1.0  
**최종 업데이트**: 2026-02-08
