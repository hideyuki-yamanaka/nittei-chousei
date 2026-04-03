-- ============================================
-- v2: イベント管理機能の追加
-- Supabaseのダッシュボード > SQL Editor にコピーして実行してください
-- ============================================

-- eventsテーブルに削除日カラムを追加（ゴミ箱機能用）
ALTER TABLE events ADD COLUMN deleted_at timestamptz;

-- eventsの更新・削除ポリシーを追加
CREATE POLICY "events_update" ON events FOR UPDATE USING (true);
CREATE POLICY "events_delete" ON events FOR DELETE USING (true);
