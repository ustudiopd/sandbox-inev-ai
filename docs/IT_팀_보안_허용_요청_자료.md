# Zscaler 보안 허용 요청 자료 (IT 팀용)

**작성일**: 2026-02-03  
**목적**: Juniper 사내 보안 프록시(Zscaler)에서 `eventflow.kr` 도메인 차단 해제 요청

---

## 📋 요청 개요

### 차단 현황
- **차단 제품**: Zscaler
- **차단 사유**: Newly Registered and Observed Domains (신규 등록/관측 도메인)
- **차단된 URL**: `https://eventflow.kr/ondemand/854470`
- **차단 유형**: 도메인 평판/분류 미완성으로 인한 기본 정책 차단 (악성 사이트 아님)

### 요청 사항
- **Allowlist 추가**: `eventflow.kr` 도메인 전체 허용
- **카테고리 재분류**: 업무용 정상 사이트로 재분류 요청

---

## 1. 서비스 정보

### 기본 정보
- **서비스명**: EventFlow
- **도메인**: `https://eventflow.kr`
- **운영사**: 주식회사 유스튜디오 (U-STUDIO CO., LTD.)
- **서비스 유형**: B2B2C 멀티테넌시 웨비나 플랫폼

### 서비스 설명
EventFlow는 기업용 웨비나(온디맨드/라이브) 시청 및 상호작용(채팅, Q&A, 설문)을 제공하는 SaaS 플랫폼입니다. 
- 온디맨드 웨비나 시청 및 자료 접근
- 실시간 웨비나 참여 및 상호작용
- 설문조사 응답 및 결과 다운로드
- 이벤트 등록 및 관리

### 업무 필요성
- 온디맨드 웨비나 시청 및 자료 접근을 위한 업무 사이트
- 기업 교육/세미나 콘텐츠 접근 필수
- 실시간 웨비나 참여 및 상호작용 기능 제공

---

## 2. 기술적 보안 정보

### HTTPS/TLS
- ✅ **HTTPS 사용**: 모든 통신은 HTTPS로 암호화
- ✅ **TLS 버전**: TLS 1.2 이상 지원
- ✅ **인증서**: Vercel 자동 발급 (Let's Encrypt 또는 Vercel 인증서)
- ✅ **자동 갱신**: 인증서 자동 갱신 및 관리

**확인 방법**:
- 브라우저에서 `https://eventflow.kr` 접속 시 자물쇠 아이콘 확인
- 인증서 정보: 브라우저 개발자 도구 → Security 탭에서 확인 가능

### 보안 헤더 (현재 설정)
- **Secure Cookie**: HTTPS 환경에서만 쿠키 전송 (`secure` 플래그)
- **SameSite**: CSRF 방지를 위한 SameSite 쿠키 정책 적용

### 보안 헤더 (추가 가능)
다음 보안 헤더를 추가할 수 있습니다:
- **HSTS (Strict-Transport-Security)**: HTTPS 강제
- **CSP (Content-Security-Policy)**: XSS 방지
- **X-Frame-Options**: 클릭재킹 방지
- **Referrer-Policy**: 리퍼러 정보 제어
- **X-Content-Type-Options**: MIME 타입 스니핑 방지

---

## 3. 인프라 및 배포 정보

### 호스팅 플랫폼
- **배포 플랫폼**: Vercel (서버리스)
- **인프라**: AWS 기반 (Vercel 인프라)
- **지역**: 싱가포르 (sin1)

### 도메인 및 네트워크
- **도메인**: `eventflow.kr`
- **IP 주소**: 동적 (Vercel 서버리스 아키텍처)
- **CDN**: Vercel Edge Network 사용
- **DNS**: Vercel DNS 관리

**참고**: 서버리스 아키텍처로 인해 고정 IP 주소가 없습니다. 도메인 기반 허용이 필요합니다.

### 데이터베이스 및 백엔드
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth
- **실시간 통신**: Supabase Realtime (WebSocket over HTTPS/WSS)

---

## 4. 개인정보 보호 및 보안 인증

### 개인정보처리방침
- **URL**: `https://eventflow.kr/privacy`
- **시행일**: 2025년 1월 27일
- **버전**: Privacy Policy v1.0
- **문의**: privacy@eventflow.kr

### 보안 인증
- ✅ **ISO/IEC 27001:2022**: 주식회사 유스튜디오가 국제 정보보호 관리체계 표준 인증 보유
- **인증 범위**: 정보보호 관리체계
- **인증 법인**: 주식회사 유스튜디오 (U-STUDIO CO., LTD.)

### 개인정보 보호 조치
- **전송 구간 암호화**: HTTPS (TLS 1.2 이상)
- **저장 데이터 암호화**: 데이터베이스 암호화 (Supabase 기본 제공)
- **접근 제어**: RLS (Row Level Security) 적용
- **최소 수집 원칙**: 서비스 제공에 필요한 최소한의 개인정보만 수집

---

## 5. 접속 필요 URL 목록

### 허용 요청 대상 도메인/경로

#### 전체 도메인 허용 (권장)
```
eventflow.kr
www.eventflow.kr (사용 중이면)
```

#### 특정 경로만 필요한 경우
```
eventflow.kr/ondemand/*
eventflow.kr/webinar/*
eventflow.kr/event/*
eventflow.kr/api/*
```

#### 외부 자산 (필요 시)
```
*.supabase.co (데이터베이스/인증/실시간 통신)
*.vercel.app (Vercel 프리뷰 환경, 선택사항)
```

### 실제 사용 예시 URL
- 온디맨드 웨비나: `https://eventflow.kr/ondemand/854470`
- 실시간 웨비나: `https://eventflow.kr/webinar/[webinarId]`
- 이벤트 페이지: `https://eventflow.kr/event/[path]`

---

## 6. 보안 확인 체크리스트

### ✅ 확인 완료 항목
- [x] HTTPS/TLS 정상 작동
- [x] 개인정보처리방침 공개
- [x] 이용약관 공개
- [x] 회사 정보 명시
- [x] 연락처 제공 (privacy@eventflow.kr)
- [x] ISO/IEC 27001:2022 인증 보유
- [x] 데이터 암호화 (전송/저장)
- [x] 접근 제어 (RLS)

### 📋 추가 가능 항목 (필요 시)
- [ ] HSTS 헤더 추가
- [ ] CSP 헤더 추가
- [ ] X-Frame-Options 헤더 추가
- [ ] 보안 헤더 점검 리포트

---

## 7. Zscaler 요청 템플릿

### 요청 메일 제목
```
[보안 허용 요청] eventflow.kr 도메인 Allowlist 추가 요청
```

### 요청 내용 (복사하여 사용)

```
안녕하세요,

업무상 필요로 인해 다음 도메인의 접근 허용을 요청드립니다.

■ 차단 현황
- 차단 제품: Zscaler
- 차단 사유: Newly Registered and Observed Domains
- 차단된 URL: https://eventflow.kr/ondemand/854470

■ 허용 요청 대상
- 도메인: eventflow.kr (전체)
- 서브도메인: www.eventflow.kr (사용 중이면)

■ 업무 필요성
- 온디맨드 웨비나 시청 및 자료 접근을 위한 업무 사이트
- 기업 교육/세미나 콘텐츠 접근 필수

■ 서비스 정보
- 서비스명: EventFlow
- 운영사: 주식회사 유스튜디오 (U-STUDIO CO., LTD.)
- 서비스 유형: B2B2C 멀티테넌시 웨비나 플랫폼
- 개인정보처리방침: https://eventflow.kr/privacy

■ 보안 확인 사항
- HTTPS/TLS 정상 작동 (TLS 1.2 이상)
- ISO/IEC 27001:2022 인증 보유
- 개인정보처리방침 공개
- 데이터 암호화 (전송/저장)

■ 요청 사항
1. Allowlist에 eventflow.kr 도메인 추가
2. 카테고리 재분류: 업무용 정상 사이트로 재분류

감사합니다.
```

---

## 8. 참고 자료

### 관련 링크
- **개인정보처리방침**: https://eventflow.kr/privacy
- **서비스 홈페이지**: https://eventflow.kr
- **문의 이메일**: privacy@eventflow.kr

### 기술 문서
- **개인정보처리방침 명세서**: `docs/EventFlow_개인정보처리방침_명세서.md`
- **서비스 개요**: `README.md`

---

## 9. FAQ

### Q1. 왜 차단되었나요?
**A**: `eventflow.kr` 도메인이 신규 등록되어 Zscaler의 "Newly Registered and Observed Domains" 카테고리에 분류되었습니다. 악성 사이트가 아니라 도메인 평판/분류가 아직 안정적으로 쌓이지 않아 기본 정책에 걸린 것입니다.

### Q2. 고정 IP 주소가 있나요?
**A**: 아니요. Vercel 서버리스 아키텍처를 사용하므로 고정 IP 주소가 없습니다. 도메인 기반 허용이 필요합니다.

### Q3. 보안 헤더는 어떻게 확인하나요?
**A**: 브라우저 개발자 도구(F12) → Network 탭 → 응답 헤더에서 확인할 수 있습니다. 또는 온라인 도구(예: securityheaders.com)를 사용할 수 있습니다.

### Q4. 추가 보안 조치가 필요한가요?
**A**: 현재 HTTPS/TLS, 데이터 암호화, 접근 제어 등 기본 보안 조치가 완료되어 있습니다. 필요 시 HSTS, CSP 등 추가 보안 헤더를 설정할 수 있습니다.

---

## 10. 연락처

### 개인정보 보호 책임자
- **이메일**: privacy@eventflow.kr
- **회사**: 주식회사 유스튜디오 (U-STUDIO CO., LTD.)

### 기술 문의
- **이메일**: privacy@eventflow.kr

---

**문서 버전**: v1.0  
**최종 업데이트**: 2026-02-03
