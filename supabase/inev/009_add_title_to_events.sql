-- inev: events 테이블에 title 컬럼 추가
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN public.events.title IS 'inev: 이벤트 제목';
