-- Phase 3: Visit 추적을 위한 event_access_logs 테이블 생성
-- 등록/전환 추적을 위한 접근 로그 저장

CREATE TABLE IF NOT EXISTS event_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES event_survey_campaigns(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  entry_id UUID REFERENCES event_survey_entries(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  
  -- UTM 파라미터
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- 추적 정보
  cid TEXT,
  referrer TEXT,
  user_agent TEXT,
  marketing_campaign_link_id UUID REFERENCES campaign_link_meta(id) ON DELETE SET NULL,
  
  -- 타임스탬프
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_event_access_logs_campaign_session ON event_access_logs(campaign_id, session_id);
CREATE INDEX IF NOT EXISTS idx_event_access_logs_entry ON event_access_logs(entry_id) WHERE entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_access_logs_converted ON event_access_logs(campaign_id, converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_access_logs_accessed ON event_access_logs(campaign_id, accessed_at);

-- RLS 정책 (공개 읽기, 서버만 쓰기)
ALTER TABLE event_access_logs ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (통계 조회용)
CREATE POLICY "event_access_logs_select_public" ON event_access_logs
  FOR SELECT
  USING (true);

-- 서버만 쓰기 (서비스 롤만)
CREATE POLICY "event_access_logs_insert_service_role" ON event_access_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "event_access_logs_update_service_role" ON event_access_logs
  FOR UPDATE
  USING (true);
