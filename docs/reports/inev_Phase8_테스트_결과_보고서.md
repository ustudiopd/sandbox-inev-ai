# inev Phase 8 테스트 결과 보고서

**작성일**: 2026-02-09  
**Phase**: Phase 8 — 전용 Supabase 분리 절차  
**상태**: ✅ 구현 완료

---

## 요약

Phase 8은 **운영 툴킷**으로, 이벤트 단위로 공용 Supabase에서 전용 Supabase로 안전하게 데이터를 분리/이관할 수 있는 Export/Import 스크립트와 체크리스트를 제공합니다.

---

## 구현 내용

### 1. Export 스크립트 (`scripts/inev-export-event.mjs`)

**기능**:
- 이벤트 단위로 모든 관련 데이터를 JSON 포맷으로 Export
- 매니페스트 파일 생성 (전체 데이터 + 메타데이터)
- 개별 테이블 파일 생성 (큰 데이터셋의 경우)
- 요약 파일 생성 (통계 정보)

**Export 대상 테이블**:
- ✅ `events` - 이벤트 메타데이터
- ✅ `clients` - 클라이언트 정보
- ✅ `leads` - 등록자
- ✅ `event_participations` - 참여 관계
- ✅ `event_survey_responses` - 설문 응답
- ✅ `event_visits` - Visit/UTM 로그
- ✅ `event_emails` - 이메일 초안
- ✅ `webinars` - 웨비나 (선택적)
- ✅ `short_links` - ShortLink (선택적)
- ✅ `event_survey_campaigns` - 캠페인 (선택적)
- ✅ `event_access_logs` - 접근 로그 (선택적)

**사용법**:
```bash
node scripts/inev-export-event.mjs <eventId> [outputDir]
```

### 2. Import 스크립트 (`scripts/inev-import-event.mjs`)

**기능**:
- 매니페스트 파일을 읽어 전용 Supabase로 Import
- Dry-run 모드 지원 (검증만 수행)
- ID 매핑 자동 처리 (UUID는 새로 생성, 외래키 관계 유지)
- 단계별 Import 진행 상황 출력

**Import 순서**:
1. Client 확인/생성
2. Event 확인/생성
3. Leads Import
4. Event Participations Import
5. Event Survey Responses Import
6. Event Visits Import
7. Event Emails Import
8. Webinars Import (선택적)
9. Short Links Import (선택적)

**사용법**:
```bash
# Dry-run 모드
node scripts/inev-import-event.mjs <manifestPath> <targetSupabaseUrl> <targetServiceRoleKey> --dry-run

# 실제 Import
node scripts/inev-import-event.mjs <manifestPath> <targetSupabaseUrl> <targetServiceRoleKey>
```

### 3. 체크리스트 문서 (`docs/inev/Phase8_전용_Supabase_분리_절차.md`)

**내용**:
- Export 포맷 정의
- Import 절차 상세 설명
- 전용 Supabase 분리 시 체크리스트:
  - 환경 변수 체크리스트
  - 도메인 체크리스트
  - RLS (Row Level Security) 체크리스트
  - 권한 체크리스트
  - 데이터 무결성 체크리스트
  - 애플리케이션 체크리스트
- 리허설 절차
- 롤백 절차
- 주의사항

---

## DoD 충족 여부

### Phase 8 DoD 항목

1. **이벤트 단위 export 포맷 확정**
   - ✅ JSON 매니페스트 포맷 정의
   - ✅ 개별 테이블 파일 포맷 정의
   - ✅ 요약 파일 포맷 정의

2. **import 절차 체크리스트**
   - ✅ Import 절차 문서화 완료
   - ✅ 단계별 Import 순서 정의
   - ✅ ID 매핑 처리 로직 구현

3. **전용 Supabase 분리 시 체크리스트**
   - ✅ 환경 변수 체크리스트 작성
   - ✅ 도메인 체크리스트 작성
   - ✅ RLS 체크리스트 작성
   - ✅ 권한 체크리스트 작성
   - ✅ 데이터 무결성 체크리스트 작성
   - ✅ 애플리케이션 체크리스트 작성

4. **리허설 가능**
   - ✅ 리허설 절차 문서화 완료
   - ✅ Dry-run 모드 지원
   - ✅ 테스트 환경에서 리허설 가능

---

## 구현 파일 목록

### 스크립트
- `scripts/inev-export-event.mjs` - 이벤트 단위 Export 스크립트
- `scripts/inev-import-event.mjs` - 이벤트 단위 Import 스크립트

### 문서
- `docs/inev/Phase8_전용_Supabase_분리_절차.md` - Phase 8 절차 및 체크리스트 문서

---

## 다음 단계

Phase 8이 완료되었습니다.

**Phase 9는 구현하지 않음**: Phase 9는 시스템에서 구현하지 않고 Cursor 지침으로만 보관합니다 (`docs/inev/Phase9_인스턴스_Factory_지침.md`).

대신 다음 문서를 유지합니다:
- `docs/inev/Phase8_전용_Supabase_분리_절차.md` (이미 있음)
- `docs/inev/clients/<client_slug>/ops.md` (클라이언트별 운영 카드)

---

## 참고 사항

### Export/Import 스크립트 사용 시 주의사항

1. **백업 필수**: Export 전에 공용 Supabase 백업 확인
2. **Dry-run 권장**: Import 전에 반드시 Dry-run 모드로 검증
3. **단계별 확인**: 각 단계마다 데이터 확인
4. **스토리지 파일**: Supabase Storage 파일은 별도 이관 필요

### 리허설 권장

실제 분리 전에 테스트 환경에서 리허설을 수행하여 절차를 검증하는 것을 권장합니다.

---

**보고서 작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-09
