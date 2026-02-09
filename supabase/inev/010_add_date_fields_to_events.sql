-- inev: events 테이블에 캠페인 기간 및 이벤트 날짜 필드 추가
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS campaign_start_date date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS campaign_end_date date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_date date; -- 단일 날짜
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_start_date date; -- 시작일 (기간 선택 시)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_end_date date; -- 종료일 (기간 선택 시)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_date_type text DEFAULT 'single' CHECK (event_date_type IN ('single', 'range')); -- 단일 또는 기간

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_events_campaign_dates ON public.events(campaign_start_date, campaign_end_date);
CREATE INDEX IF NOT EXISTS idx_events_event_dates ON public.events(event_date, event_start_date, event_end_date);

COMMENT ON COLUMN public.events.campaign_start_date IS 'inev: 캠페인 시작일';
COMMENT ON COLUMN public.events.campaign_end_date IS 'inev: 캠페인 종료일';
COMMENT ON COLUMN public.events.event_date IS 'inev: 이벤트 날짜 (단일)';
COMMENT ON COLUMN public.events.event_start_date IS 'inev: 이벤트 시작일 (기간 선택 시)';
COMMENT ON COLUMN public.events.event_end_date IS 'inev: 이벤트 종료일 (기간 선택 시)';
COMMENT ON COLUMN public.events.event_date_type IS 'inev: 이벤트 날짜 타입 (single: 단일, range: 기간)';
