begin;

-- event_survey_entries에 상세 등록 정보 필드 추가 (JSONB로 저장)
alter table public.event_survey_entries
  add column if not exists registration_data jsonb;

-- registration_data 인덱스 추가 (검색 성능 향상)
create index if not exists idx_entries_registration_data 
  on public.event_survey_entries using gin(registration_data);

-- registration_data 구조 예시:
-- {
--   "email": "user@example.com",
--   "firstName": "홍",
--   "lastName": "길동",
--   "jobTitle": "과장",
--   "postalCode": "12345",
--   "city": "서울특별시",
--   "country": "대한민국",
--   "phoneCountryCode": "+82",
--   "consentEmail": true,
--   "consentPhone": false,
--   "privacyConsent": true
-- }

commit;
