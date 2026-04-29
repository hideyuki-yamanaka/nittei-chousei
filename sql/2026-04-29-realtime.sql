-- ============================================================
-- iPhone / iPad シームレス同期(Supabase Realtime)を有効化する
-- 対象: events, candidate_dates, respondents, responses
--
-- 実行手順:
--   Supabase ダッシュボード → 該当プロジェクト → SQL Editor
--   このファイル全体を貼り付けて Run
-- 既に publication 登録済みでもエラーにならんよう例外処理しています。
-- ============================================================

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE events';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE candidate_dates';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE respondents';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE responses';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ─── 確認用 ───
-- 以下を実行して 4 テーブルが含まれていれば OK:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
