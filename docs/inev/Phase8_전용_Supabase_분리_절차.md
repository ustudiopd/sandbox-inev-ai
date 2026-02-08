# Phase 8: 전용 Supabase 분리 절차

**문서 버전**: v1.0  
**최종 업데이트**: 2026-02-09  
**목적**: 이벤트 단위로 공용 Supabase에서 전용 Supabase로 안전하게 분리

---

## 개요

Phase 8은 **운영 툴킷**으로, 클라이언트가 전용 Supabase를 요청할 때 이벤트 단위로 데이터를 안전하게 분리/이관할 수 있는 절차를 제공합니다.

### 사용 시나리오

1. **WERT 같은 케이스**: 고객이 전용 Supabase를 요청하여 데이터 격리
2. **규모 확장**: 클라이언트가 커져서 전용 인프라가 필요
3. **보안 요구사항**: 데이터 격리 요구사항 충족

---

## 1. Export 포맷

### 1.1 Export 파일 구조

```
exports/
  event-{eventId}/
    event-{eventId}-manifest.json      # 전체 데이터 (메타데이터 포함)
    event-{eventId}-summary.json       # 요약 정보
    event-{eventId}-leads.json         # 등록자 데이터
    event-{eventId}-event_participations.json
    event-{eventId}-event_survey_responses.json
    event-{eventId}-event_visits.json
    event-{eventId}-event_emails.json
    event-{eventId}-webinars.json
    event-{eventId}-short_links.json
    ...
```

### 1.2 Export 대상 테이블

**핵심 테이블 (필수)**:
- `events` - 이벤트 메타데이터
- `clients` - 클라이언트 정보
- `leads` - 등록자 (event_id FK)
- `event_participations` - 참여 관계 (event_id FK)
- `event_survey_responses` - 설문 응답 (event_id FK)
- `event_visits` - Visit/UTM 로그 (event_id FK)
- `event_emails` - 이메일 초안 (event_id FK)

**연관 테이블 (선택적)**:
- `webinars` - 웨비나 (event_id FK, Phase 6)
- `short_links` - ShortLink (event_id FK, Phase 7)
- `event_survey_campaigns` - 캠페인 (client_id FK, 선택적)
- `event_access_logs` - 접근 로그 (campaign_id FK, 선택적)
- `webinar_files` - 웨비나 파일 메타데이터 (webinar_id FK, 선택적)

**⚠️ 주의: Storage 파일은 별도 이관 필요**
- `webinar_files` 테이블의 메타데이터는 Export되지만, 실제 Supabase Storage 버킷(`webinar-files`, `webinar-thumbnails` 등)의 파일은 **별도로 이관해야 합니다**
- Storage 파일 이관은 **필수 단계**입니다 (DB만 옮기면 파일 접근 불가)

### 1.3 Export 실행

```bash
# 이벤트 단위 Export
node scripts/inev-export-event.mjs <eventId> [outputDir]

# 예시
node scripts/inev-export-event.mjs abc123-def456-ghi789 ./exports/event-123
```

**출력**:
- 매니페스트 파일 (전체 데이터)
- 개별 테이블 파일 (큰 데이터셋의 경우)
- 요약 파일 (통계 정보)

### 1.4 Export 매니페스트 필수 메타 필드

매니페스트 파일에는 다음 메타 필드가 **필수**로 포함됩니다:

```json
{
  "event_id": "원본 Event UUID",
  "exported_at": "ISO 8601 타임스탬프",
  "version": "1.0",
  "source_event_id": "원본 Event UUID (불변키, 추적용)",
  "source_project_ref": "원본 Supabase 프로젝트 ref (예: gbkivxdlebdtfudexbga)",
  "migrated_at": null,  // Import 시 설정됨
  "event": { ... },
  "client": { ... },
  "tables": { ... }
}
```

**불변키 목적**:
- `source_event_id`: 원본 Event ID를 추적하여 운영/분석 시 참조
- `source_project_ref`: 원본 Supabase 프로젝트 식별
- `migrated_at`: Import 완료 시점 기록

---

## 2. Import 절차

### 2.1 사전 준비

#### 2.1.1 전용 Supabase 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 새 프로젝트 생성
3. 프로젝트 URL 및 Service Role Key 확인

#### 2.1.2 스키마 적용

전용 Supabase에 inev.ai 스키마를 적용합니다:

```bash
# inev.ai 스키마 파일들을 전용 Supabase에 적용
# supabase/inev/*.sql 파일들을 순서대로 실행
```

**필수 마이그레이션**:
- `001_initial_schema.sql` - 기본 스키마
- `002_event_survey_responses.sql` - 설문 응답
- `003_event_visits.sql` - Visit/UTM
- `004_event_emails.sql` - 이메일
- `005_add_client_domain_fields.sql` - 도메인 필드
- `006_create_short_links_with_event.sql` - ShortLink

#### 2.1.3 환경 변수 확인

전용 Supabase의 환경 변수를 확인합니다:
- `NEXT_PUBLIC_SUPABASE_URL`: 전용 Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY`: 전용 Supabase Service Role Key

### 2.2 Import 실행

```bash
# Dry-run 모드 (검증만)
node scripts/inev-import-event.mjs <manifestPath> <targetSupabaseUrl> <targetServiceRoleKey> --dry-run

# 실제 Import
node scripts/inev-import-event.mjs <manifestPath> <targetSupabaseUrl> <targetServiceRoleKey>

# 예시
node scripts/inev-import-event.mjs \
  ./exports/event-123/event-abc123-manifest.json \
  https://xxx.supabase.co \
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --dry-run
```

### 2.3 Import 순서

1. **Client 확인/생성**: Client slug로 기존 Client 확인, 없으면 생성
2. **Event 확인/생성**: Event code로 기존 Event 확인, 없으면 생성
3. **Leads Import**: 등록자 데이터 import
4. **Event Participations Import**: 참여 관계 import
5. **Event Survey Responses Import**: 설문 응답 import
6. **Event Visits Import**: Visit/UTM 로그 import
7. **Event Emails Import**: 이메일 초안 import
8. **Webinars Import**: 웨비나 데이터 import (선택적)
9. **Short Links Import**: ShortLink 데이터 import (선택적)

### 2.4 ID 매핑

Import 시 UUID는 새로 생성되지만, 외래키 관계는 유지됩니다:
- `leads.event_id` → 새 Event ID로 매핑
- `event_participations.lead_id` → 새 Lead ID로 매핑
- `event_survey_responses.lead_id` → 새 Lead ID로 매핑
- 등등...

**불변키 보존**:
- 원본 Event ID는 `source_event_id`로 매니페스트에 보존됩니다
- Import 후에도 원본 ID 추적이 가능합니다 (운영/분석 목적)

### 2.5 중복 Import 방지 정책

**기본 정책**: Import는 **1회성**입니다.

- **같은 manifest를 두 번 Import하는 경우**:
  - Event code가 동일하면 기존 Event를 발견하고 **새로 생성하지 않음**
  - 하지만 **데이터는 중복으로 들어갈 수 있음** (FK 제약조건 위반 가능)
  - **권장**: 같은 manifest는 한 번만 Import하고, 재실행 시에는 **새 이벤트로 들어가거나 차단**해야 함

**재Import 시나리오**:
1. **차단 (권장)**: Import 스크립트가 manifest의 `migrated_at` 필드를 확인하여 이미 Import된 경우 차단
2. **새 이벤트로 생성**: Event code를 변경하거나 새 manifest 생성
3. **수동 삭제 후 재Import**: 기존 데이터를 수동으로 삭제한 후 재Import

**권장 사항**: Import 전에 반드시 Dry-run으로 검증하고, 실제 Import는 1회만 수행하세요.

---

## 3. 전용 Supabase 분리 체크리스트

### 3.1 환경 변수 체크리스트

- [ ] `NEXT_PUBLIC_SUPABASE_URL`: 전용 Supabase URL 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: 전용 Supabase Service Role Key 설정
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 전용 Supabase Anon Key 설정 (클라이언트용)
- [ ] 기존 공용 Supabase 환경 변수 제거 또는 주석 처리

### 3.2 도메인 체크리스트

- [ ] `canonical_domain` 설정 확인 (필요 시)
- [ ] `subdomain_domain` 설정 확인 (기본값: `{slug}.inev.ai`)
- [ ] `public_base_url` 계산 확인 (`canonical_domain ?? subdomain_domain`)
- [ ] Vercel 프로젝트 도메인 연결 확인
- [ ] DNS 설정 확인 (canonical_domain 사용 시)
- [ ] **Auth Redirect URL 등록**: Supabase Dashboard → Authentication → URL Configuration에서 전용 도메인 등록
- [ ] **Site URL 설정**: 전용 Supabase의 Site URL이 `public_base_url`과 일치하는지 확인
- [ ] **OAuth Redirect URL** (있는 경우): Google/GitHub 등 OAuth Provider의 Redirect URL 업데이트

### 3.3 RLS (Row Level Security) 체크리스트

- [ ] `clients` 테이블 RLS 정책 확인
- [ ] `events` 테이블 RLS 정책 확인
- [ ] `leads` 테이블 RLS 정책 확인
- [ ] `event_participations` 테이블 RLS 정책 확인
- [ ] `event_survey_responses` 테이블 RLS 정책 확인
- [ ] `event_visits` 테이블 RLS 정책 확인
- [ ] `event_emails` 테이블 RLS 정책 확인
- [ ] `webinars` 테이블 RLS 정책 확인 (있는 경우)
- [ ] `short_links` 테이블 RLS 정책 확인 (있는 경우)
- [ ] `my_client_ids()` 함수 동작 확인

**RLS 검증 최소 시나리오 (필수 테스트)**:

다음 3가지 시나리오를 반드시 테스트하세요:

**(A) 내 client_id로 조회 OK**
```sql
-- Admin 사용자로 로그인한 상태에서
SELECT * FROM events WHERE client_id IN (SELECT my_client_ids());
-- → 정상적으로 자신의 이벤트만 조회되어야 함
```

**(B) 다른 client_id 접근 403/0 rows**
```sql
-- 다른 클라이언트의 이벤트 ID로 접근 시도
SELECT * FROM events WHERE id = '다른_클라이언트_event_id';
-- → 0 rows 반환 또는 403 에러 (RLS 정책에 따라)
```

**(C) Public route에서 필요한 최소 데이터만 노출**
```sql
-- anon 사용자로 Public 페이지에서 접근 가능한 데이터 확인
-- 예: 이벤트 목록, 이벤트 상세 (제한된 필드만)
SELECT id, code, slug, module_registration FROM events WHERE id = 'public_event_id';
-- → Public에서 접근 가능한 필드만 노출되어야 함
-- → Admin 전용 필드는 노출되지 않아야 함
```

**RLS 검증 체크리스트**:
- [ ] 시나리오 (A) 테스트 통과
- [ ] 시나리오 (B) 테스트 통과
- [ ] 시나리오 (C) 테스트 통과

### 3.4 권한 체크리스트

- [ ] **Auth 사용자(운영자 계정) 처리**: 전용 Supabase에서 Admin 계정 생성/초대/Redirect URL 등록이 **필수**
- [ ] Admin 사용자 생성 확인 (Supabase Dashboard → Authentication → Users)
- [ ] `client_members` 테이블에 Admin 추가 확인 (새로 생성된 Admin user_id로)
- [ ] 슈퍼어드민 권한 확인 (필요 시)
- [ ] **Auth 이슈**: 운영자 로그인 계정은 "데이터"가 아니라 "Auth" 이슈이므로, 전용 Supabase에서 별도로 생성해야 함

### 3.5 데이터 무결성 체크리스트

- [ ] Export 데이터 검증 (레코드 수 확인)
- [ ] Import 후 데이터 검증 (레코드 수 확인)
- [ ] 외래키 관계 확인 (FK 제약조건 확인)
- [ ] 유니크 제약조건 확인 (중복 데이터 확인)

**데이터 무결성 검증 쿼리 (표준)**:

Import 후 다음 SQL로 소스/타깃 데이터 수치를 비교하세요:

```sql
-- 소스 (공용 Supabase)에서 카운트
SELECT 
  'leads' as table_name, COUNT(*) as source_count
FROM leads WHERE event_id = '원본_event_id'
UNION ALL
SELECT 'event_participations', COUNT(*) FROM event_participations WHERE event_id = '원본_event_id'
UNION ALL
SELECT 'event_survey_responses', COUNT(*) FROM event_survey_responses WHERE event_id = '원본_event_id'
UNION ALL
SELECT 'event_visits', COUNT(*) FROM event_visits WHERE event_id = '원본_event_id'
UNION ALL
SELECT 'event_access_logs', COUNT(*) FROM event_access_logs WHERE campaign_id IN (
  SELECT id FROM event_survey_campaigns WHERE client_id = '원본_client_id'
);

-- 타깃 (전용 Supabase)에서 카운트
SELECT 
  'leads' as table_name, COUNT(*) as target_count
FROM leads WHERE event_id = '새_event_id'
UNION ALL
SELECT 'event_participations', COUNT(*) FROM event_participations WHERE event_id = '새_event_id'
UNION ALL
SELECT 'event_survey_responses', COUNT(*) FROM event_survey_responses WHERE event_id = '새_event_id'
UNION ALL
SELECT 'event_visits', COUNT(*) FROM event_visits WHERE event_id = '새_event_id'
UNION ALL
SELECT 'event_access_logs', COUNT(*) FROM event_access_logs WHERE campaign_id IN (
  SELECT id FROM event_survey_campaigns WHERE client_id = '새_client_id'
);
```

**검증 기준**:
- 각 테이블의 레코드 수가 소스/타깃에서 일치해야 함
- 차이가 있으면 Import 로그 확인 및 재검증 필요

### 3.6 애플리케이션 체크리스트

- [ ] Vercel 환경 변수 업데이트
- [ ] 애플리케이션 재배포
- [ ] 핵심 기능 테스트 (등록, 설문, 이메일 등)
- [ ] Public 페이지 접근 테스트
- [ ] Admin 페이지 접근 테스트

---

## 4. 리허설 절차

### 4.1 리허설 목적

실제 분리 전에 테스트 환경에서 리허설을 수행하여 절차를 검증합니다.

### 4.2 리허설 단계

1. **테스트 Supabase 프로젝트 생성**
   - 전용 Supabase와 동일한 설정으로 테스트 프로젝트 생성

2. **Export 실행**
   ```bash
   node scripts/inev-export-event.mjs <eventId> ./exports/rehearsal-{eventId}
   ```

3. **Dry-run Import 실행**
   ```bash
   node scripts/inev-import-event.mjs \
     ./exports/rehearsal-{eventId}/event-{eventId}-manifest.json \
     https://test-xxx.supabase.co \
     test-service-role-key \
     --dry-run
   ```

4. **실제 Import 실행 (테스트 환경)**
   ```bash
   node scripts/inev-import-event.mjs \
     ./exports/rehearsal-{eventId}/event-{eventId}-manifest.json \
     https://test-xxx.supabase.co \
     test-service-role-key
   ```

5. **검증**
   - 데이터 레코드 수 확인
   - 외래키 관계 확인
   - 애플리케이션 동작 확인

6. **롤백 (필요 시)**
   - 테스트 Supabase 프로젝트 삭제 또는 데이터 삭제

### 4.3 리허설 체크리스트

- [ ] Export 성공 확인
- [ ] Dry-run Import 성공 확인
- [ ] 실제 Import 성공 확인
- [ ] 데이터 무결성 확인
- [ ] 애플리케이션 동작 확인
- [ ] 롤백 절차 확인

---

## 5. 롤백 절차

### 5.1 롤백 시나리오

Import 실패 또는 데이터 불일치 시 롤백이 필요합니다.

### 5.2 롤백 방법

1. **전용 Supabase 프로젝트 삭제** (가장 간단)
   - Supabase Dashboard에서 프로젝트 삭제
   - 필요 시 새 프로젝트 생성 후 재시도

2. **데이터만 삭제** (프로젝트 유지)
   ```sql
   -- 전용 Supabase에서 데이터만 삭제
   DELETE FROM event_survey_responses WHERE event_id = '...';
   DELETE FROM event_visits WHERE event_id = '...';
   DELETE FROM event_emails WHERE event_id = '...';
   DELETE FROM event_participations WHERE event_id = '...';
   DELETE FROM leads WHERE event_id = '...';
   DELETE FROM events WHERE id = '...';
   DELETE FROM clients WHERE id = '...';
   ```

3. **환경 변수 롤백**
   - Vercel 환경 변수를 공용 Supabase로 복원
   - 애플리케이션 재배포

---

## 6. 주의사항

### 6.1 데이터 손실 방지

- **Export 전 백업**: 공용 Supabase 백업 확인
- **Import 전 검증**: Dry-run 모드로 먼저 검증
- **단계별 확인**: 각 단계마다 데이터 확인

### 6.2 UUID 매핑

- Import 시 UUID는 새로 생성됩니다
- 외래키 관계는 자동으로 매핑됩니다
- 원본 ID와 새 ID의 매핑은 로그에 기록됩니다

### 6.3 동시성 고려

- Import 중에는 해당 이벤트에 대한 쓰기 작업을 중지해야 합니다
- Import 완료 후 애플리케이션 환경 변수를 업데이트합니다

### 6.4 스토리지 파일 (Storage 이관)

**⚠️ 중요**: Supabase Storage에 저장된 파일은 **별도로 이관해야 합니다**.

**Storage 파일 범위**:
- `webinar-files` 버킷: 웨비나 첨부 파일 (PDF, PPT, DOC 등)
- `webinar-thumbnails` 버킷: 웨비나 썸네일 이미지
- 기타 버킷: 이벤트별로 사용하는 이미지/파일

**Storage 이관 절차**:

1. **원본 Supabase에서 파일 목록 확인**
   ```sql
   -- webinar_files 테이블에서 파일 경로 확인
   SELECT file_path, file_name FROM webinar_files WHERE webinar_id IN (
     SELECT id FROM webinars WHERE event_id = '원본_event_id'
   );
   ```

2. **전용 Supabase에 버킷 생성** (없는 경우)
   - Supabase Dashboard → Storage → 새 버킷 생성
   - 버킷 이름: `webinar-files`, `webinar-thumbnails` 등

3. **파일 다운로드 및 업로드**
   - 원본 Supabase Storage에서 파일 다운로드
   - 전용 Supabase Storage에 업로드 (동일한 경로 구조 유지 권장)

4. **Storage 이관 스크립트 예시** (수동 또는 자동화)
   ```bash
   # Supabase CLI 또는 Storage API를 사용하여 파일 이관
   # 또는 수동으로 Supabase Dashboard에서 다운로드/업로드
   ```

**Storage 이관 체크리스트**:
- [ ] 원본 Storage에서 파일 목록 확인
- [ ] 전용 Supabase에 버킷 생성 (필요 시)
- [ ] 파일 다운로드 완료
- [ ] 파일 업로드 완료
- [ ] 파일 접근 테스트 (Public URL 확인)

**주의사항**:
- DB만 옮기면 파일 접근이 불가능합니다
- Storage 이관은 **필수 단계**입니다 (웨비나 파일이 있는 경우)
- 파일 경로가 변경되면 `webinar_files.file_path`도 업데이트 필요

---

## 7. DoD (Definition of Done)

### Phase 8 완료 기준

- [ ] 이벤트 단위 export 포맷 확정 (JSON 매니페스트)
- [ ] Export 스크립트 구현 완료 (`scripts/inev-export-event.mjs`)
- [ ] Import 스크립트 구현 완료 (`scripts/inev-import-event.mjs`)
- [ ] Import 절차 체크리스트 문서화 완료
- [ ] 전용 Supabase 분리 시 체크리스트 작성 완료 (env/도메인/RLS)
- [ ] 리허설 가능: 이벤트 1개를 공용 → 전용으로 옮기는 리허설 성공

---

## 8. 참고 문서

- [inev 리빌딩 전체 구현 계획](./inev_리빌딩_전체구현계획.md)
- [inev.ai 개발 · 배포 운영 명세서](./inev.ai_개발_배포_운영_명세서.md)
- [Supabase 백업 복구 가이드](../guides/Supabase_백업_복구_가이드.md)

---

**문서 작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-09 (Phase 8 Export/Import 스크립트 및 체크리스트 작성 완료, 운영 구멍 7가지 봉인 완료)
