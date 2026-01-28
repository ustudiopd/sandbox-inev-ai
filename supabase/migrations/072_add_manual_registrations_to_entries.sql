-- manual 등록 정보를 event_survey_entries에 추가
-- 웨비나 426307의 manual 등록을 등록 캠페인(/149403)에 추가

BEGIN;

-- 캠페인 ID 확인
DO $$
DECLARE
  campaign_id_val UUID := '3a88682e-6fab-463c-8328-6b403c8c5c7a';
  current_survey_no INT;
  new_survey_no INT;
BEGIN
  -- 현재 next_survey_no 확인
  SELECT next_survey_no INTO current_survey_no
  FROM event_survey_campaigns
  WHERE id = campaign_id_val;
  
  -- 1. 양승철 (pd@ustudio.co.kr) - 관리자 - 2026-01-26 20:50:33
  new_survey_no := current_survey_no;
  INSERT INTO event_survey_entries (
    campaign_id,
    name,
    company,
    phone_norm,
    survey_no,
    code6,
    completed_at,
    registration_data,
    created_at
  ) VALUES (
    campaign_id_val,
    '양승철',
    '유스튜디오',
    '01000000000', -- 전화번호 없음 (기본값)
    new_survey_no,
    LPAD(new_survey_no::text, 6, '0'),
    '2026-01-26 20:50:33.803388+00'::timestamptz,
    jsonb_build_object(
      'email', 'pd@ustudio.co.kr',
      'name', '양승철',
      'company', '유스튜디오',
      'role', '관리자',
      'registered_via', 'manual'
    ),
    '2026-01-26 20:50:33.803388+00'::timestamptz
  ) ON CONFLICT (campaign_id, phone_norm) DO NOTHING;
  
  -- 2. 원프레딕트 (eventflow@onepredict.com) - 참가자 - 2026-01-27 00:00:12
  new_survey_no := current_survey_no + 1;
  INSERT INTO event_survey_entries (
    campaign_id,
    name,
    company,
    phone_norm,
    survey_no,
    code6,
    completed_at,
    registration_data,
    created_at
  ) VALUES (
    campaign_id_val,
    '원프레딕트',
    '원프레딕트',
    '01000000001', -- 전화번호 없음 (기본값, 다른 번호 사용)
    new_survey_no,
    LPAD(new_survey_no::text, 6, '0'),
    '2026-01-27 00:00:12.902287+00'::timestamptz,
    jsonb_build_object(
      'email', 'eventflow@onepredict.com',
      'name', '원프레딕트',
      'company', '원프레딕트',
      'role', '참가자',
      'registered_via', 'manual'
    ),
    '2026-01-27 00:00:12.902287+00'::timestamptz
  ) ON CONFLICT (campaign_id, phone_norm) DO NOTHING;
  
  -- next_survey_no 업데이트 (2개 추가했으므로 +2)
  UPDATE event_survey_campaigns
  SET next_survey_no = current_survey_no + 2
  WHERE id = campaign_id_val;
  
  RAISE NOTICE 'Manual 등록 정보 추가 완료: survey_no % ~ %', current_survey_no, current_survey_no + 1;
END $$;

COMMIT;
