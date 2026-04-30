-- ============================================
-- v3: candidate_dates の UPDATE / DELETE ポリシーを追加
-- これがないと「保存時に古い候補日時が消えず、毎回行が増えていく」バグが発生する
-- Supabaseのダッシュボード > SQL Editor にコピーして実行してください
-- ============================================

CREATE POLICY "candidate_dates_update" ON candidate_dates FOR UPDATE USING (true);
CREATE POLICY "candidate_dates_delete" ON candidate_dates FOR DELETE USING (true);

-- 既存のゴミデータを掃除したい場合（オプション）：
--   特定のイベントの重複行を削除して、現在の最終状態だけ残す例
--   ※ 実行前に必ずバックアップを取ること
--
-- WITH ranked AS (
--   SELECT id,
--          ROW_NUMBER() OVER (PARTITION BY event_id, date, COALESCE(start_hour::text, 'allday') ORDER BY sort_order DESC, id DESC) AS rn
--   FROM candidate_dates
-- )
-- DELETE FROM candidate_dates WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
