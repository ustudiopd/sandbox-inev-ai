-- 노트 테이블 생성
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Novel.sh JSONContent 형식
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 노트 댓글 테이블 생성
CREATE TABLE IF NOT EXISTS note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notes_client_id ON notes(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_author_id ON note_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_created_at ON note_comments(created_at DESC);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_comments_updated_at
  BEFORE UPDATE ON note_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 활성화
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;

-- 노트 조회 정책: 클라이언트 멤버는 모두 조회 가능
CREATE POLICY "클라이언트 멤버는 노트 조회 가능"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_members
      WHERE client_members.client_id = notes.client_id
      AND client_members.user_id = auth.uid()
    )
  );

-- 노트 작성 정책: 클라이언트 멤버는 모두 작성 가능
CREATE POLICY "클라이언트 멤버는 노트 작성 가능"
  ON notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_members
      WHERE client_members.client_id = notes.client_id
      AND client_members.user_id = auth.uid()
    )
  );

-- 노트 수정 정책: 작성자만 수정 가능
CREATE POLICY "작성자는 노트 수정 가능"
  ON notes FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- 노트 삭제 정책: 작성자만 삭제 가능
CREATE POLICY "작성자는 노트 삭제 가능"
  ON notes FOR DELETE
  USING (author_id = auth.uid());

-- 댓글 조회 정책: 클라이언트 멤버는 모두 조회 가능
CREATE POLICY "클라이언트 멤버는 댓글 조회 가능"
  ON note_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      JOIN client_members ON client_members.client_id = notes.client_id
      WHERE notes.id = note_comments.note_id
      AND client_members.user_id = auth.uid()
    )
  );

-- 댓글 작성 정책: 클라이언트 멤버는 모두 작성 가능
CREATE POLICY "클라이언트 멤버는 댓글 작성 가능"
  ON note_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      JOIN client_members ON client_members.client_id = notes.client_id
      WHERE notes.id = note_comments.note_id
      AND client_members.user_id = auth.uid()
    )
  );

-- 댓글 수정 정책: 작성자만 수정 가능
CREATE POLICY "작성자는 댓글 수정 가능"
  ON note_comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- 댓글 삭제 정책: 작성자만 삭제 가능
CREATE POLICY "작성자는 댓글 삭제 가능"
  ON note_comments FOR DELETE
  USING (author_id = auth.uid());
