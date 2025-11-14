begin;

-- 설문조사 폼 로딩 성능 최적화를 위한 인덱스 추가

-- form_submissions 조회 최적화 (제출 여부 확인)
-- 복합 인덱스로 form_id와 participant_id 조회 성능 향상
create index if not exists idx_form_submissions_form_participant 
on public.form_submissions(form_id, participant_id);

-- forms 조회 최적화 (복합 인덱스)
-- id와 webinar_id를 함께 사용하는 쿼리 최적화
create index if not exists idx_forms_id_webinar_id 
on public.forms(id, webinar_id);

commit;

