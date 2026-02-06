-- webinar_user_sessions 테이블에 (webinar_id, session_id) UNIQUE 제약 추가
-- 동일 session_id로 중복 row 생성을 원천 차단

begin;

-- UNIQUE 제약 추가
-- 같은 webinar_id와 session_id 조합은 하나만 존재할 수 있음
alter table public.webinar_user_sessions
add constraint webinar_user_sessions_webinar_session_unique 
unique (webinar_id, session_id);

comment on constraint webinar_user_sessions_webinar_session_unique 
on public.webinar_user_sessions is 
'동일 webinar_id와 session_id 조합의 중복 row 생성을 방지. 세션 생성 시 UPSERT 사용 필요';

commit;
