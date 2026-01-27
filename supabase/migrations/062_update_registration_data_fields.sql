begin;

-- registration_data JSONB 필드에 새로운 필드 추가를 위한 문서화
-- 실제 스키마 변경은 필요 없음 (registration_data는 이미 JSONB 타입)
-- 이 마이그레이션은 문서화 목적

-- registration_data 구조 업데이트:
-- {
--   "email": "user@example.com",
--   "name": "홍길동",
--   "organization": "소속",
--   "department": "부서",
--   "position": "직함",
--   "yearsOfExperience": "연차(경력)",
--   "question": "웨비나와 관련하여 궁금한 사항",
--   "phoneCountryCode": "+82",
--   "privacyConsent": true
-- }

comment on column public.event_survey_entries.registration_data is 
'등록 상세 정보 (JSONB). 
필수 필드: email, name, organization, department, position, yearsOfExperience, phoneCountryCode, privacyConsent
선택 필드: question (웨비나와 관련하여 궁금한 사항)';

commit;
