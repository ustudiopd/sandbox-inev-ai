begin;

-- registration_data JSONB 필드에 message 필드 추가를 위한 문서화
-- 실제 스키마 변경은 필요 없음 (registration_data는 이미 JSONB 타입)
-- 이 마이그레이션은 문서화 목적

-- registration_data 구조에 message 필드 추가 가능:
-- {
--   "email": "user@example.com",
--   "name": "홍길동",
--   "phone": "010-1234-5678",
--   "company": "회사명",
--   "position": "직급",
--   "interestedProducts": ["guardione solution"],
--   "industry": "산업",
--   "address": "주소",
--   "country": "국가",
--   "message": "궁금한 내용이나 미리 전해두고 싶은 메시지"
-- }

comment on column public.event_survey_entries.registration_data is 
'등록 상세 정보 (JSONB). message 필드를 포함할 수 있으며, Q&A 세션 중 답변 예정 메시지를 저장합니다.';

commit;
