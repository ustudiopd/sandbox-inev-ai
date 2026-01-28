begin;

-- registrations 테이블에 registration_data JSONB 필드 추가
-- 등록 폼의 모든 상세 정보를 저장하기 위함
alter table public.registrations
  add column if not exists registration_data jsonb;

-- registration_data 인덱스 추가 (검색 성능 향상)
create index if not exists idx_registrations_registration_data 
  on public.registrations using gin(registration_data);

-- 주석 추가
comment on column public.registrations.registration_data is 
'등록 상세 정보 (JSONB). 등록 폼에서 입력한 모든 필드 정보를 저장합니다.
예시: {
  "email": "user@example.com",
  "name": "홍길동",
  "company": "회사명",
  "position": "직급",
  "jobTitle": "직급",
  "industry": "산업",
  "address": "주소",
  "country": "국가",
  "interestedProducts": ["제품1", "제품2"],
  "message": "메시지",
  "phoneCountryCode": "+82",
  "privacyConsent": true,
  "consentEmail": false,
  "consentPhone": false
}';

commit;
