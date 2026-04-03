-- ============================================
-- 日程調整アプリ: Supabaseで実行するSQL
-- Supabaseのダッシュボード > SQL Editor にコピーして実行してください
-- ============================================

-- テーブル作成
CREATE TABLE events (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  deadline timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE candidate_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_hour int, -- 9,10,11... null=終日
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  candidate_date_id uuid NOT NULL REFERENCES candidate_dates(id) ON DELETE CASCADE,
  availability int NOT NULL CHECK (availability IN (0, 1, 2)),
  UNIQUE (respondent_id, candidate_date_id)
);

-- インデックス
CREATE INDEX idx_candidate_dates_event ON candidate_dates(event_id);
CREATE INDEX idx_respondents_event ON respondents(event_id);
CREATE INDEX idx_responses_respondent ON responses(respondent_id);
CREATE INDEX idx_responses_candidate ON responses(candidate_date_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- anonユーザー向けポリシー
CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);

CREATE POLICY "candidate_dates_select" ON candidate_dates FOR SELECT USING (true);
CREATE POLICY "candidate_dates_insert" ON candidate_dates FOR INSERT WITH CHECK (true);

CREATE POLICY "respondents_select" ON respondents FOR SELECT USING (true);
CREATE POLICY "respondents_insert" ON respondents FOR INSERT WITH CHECK (true);
CREATE POLICY "respondents_update" ON respondents FOR UPDATE USING (true);

CREATE POLICY "responses_select" ON responses FOR SELECT USING (true);
CREATE POLICY "responses_insert" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "responses_update" ON responses FOR UPDATE USING (true);
CREATE POLICY "responses_delete" ON responses FOR DELETE USING (true);
