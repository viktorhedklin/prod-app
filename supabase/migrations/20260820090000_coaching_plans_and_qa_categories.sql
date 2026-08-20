/*
# Persistent coaching plans + QA categories

1. New Table
- `coaching_plans` — persistent, follow-up-driven coaching plans that suggest an
  area to work on and check back in on a schedule.

2. Modified Tables
- `qa_entries` — add `categories` (jsonb array of failed/reviewed QA categories)
  so weekly QA entries can be tagged and trended per category.
- `tasks` — add `source_task_id` (the official task ID entered by the agent),
  distinct from the internal `task_id` primary key.
- `daily_entries` — add `internal_notes` (count, 0.5 productivity points each)
  and copy any existing `seek_feedback` values across so old data is preserved.

3. Security
- RLS enabled on `coaching_plans` with the same single-tenant `anon/authenticated`
  pattern used across the rest of the app.
- `qa_entries` keeps its per-owner policies but the app runs as a single anon user,
  so anon policies are added to keep QA review functional.

4. Notes
- All column additions are `IF NOT EXISTS` so this migration is safe to re-run.
*/

-- 1. coaching_plans
CREATE TABLE IF NOT EXISTS coaching_plans (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'active',
  focus_area text NOT NULL,
  goal text NOT NULL,
  why_it_matters text,
  action_steps jsonb NOT NULL DEFAULT '[]',
  cadence_days integer NOT NULL DEFAULT 3,
  next_follow_up_date text,
  last_check_in_date text,
  follow_up_prompt text,
  check_in_history jsonb NOT NULL DEFAULT '[]',
  source_metric text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE coaching_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_coaching_plans_sel" ON coaching_plans;
CREATE POLICY "anon_crud_coaching_plans_sel" ON coaching_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_coaching_plans_ins" ON coaching_plans;
CREATE POLICY "anon_crud_coaching_plans_ins" ON coaching_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_coaching_plans_upd" ON coaching_plans;
CREATE POLICY "anon_crud_coaching_plans_upd" ON coaching_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_coaching_plans_del" ON coaching_plans;
CREATE POLICY "anon_crud_coaching_plans_del" ON coaching_plans FOR DELETE TO anon, authenticated USING (true);

-- 2. qa_entries: categories + anon access
ALTER TABLE qa_entries
  ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '[]';

-- The app is single-tenant with an anon key (auth.uid() is null), so the
-- owner_id NOT NULL constraint from the original qa_entries migration would
-- block inserts. Make it nullable.
ALTER TABLE qa_entries ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE qa_entries ALTER COLUMN owner_id SET DEFAULT NULL;

DROP POLICY IF EXISTS "anon_crud_qa_entries_sel" ON qa_entries;
CREATE POLICY "anon_crud_qa_entries_sel" ON qa_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_qa_entries_ins" ON qa_entries;
CREATE POLICY "anon_crud_qa_entries_ins" ON qa_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_qa_entries_upd" ON qa_entries;
CREATE POLICY "anon_crud_qa_entries_upd" ON qa_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_qa_entries_del" ON qa_entries;
CREATE POLICY "anon_crud_qa_entries_del" ON qa_entries FOR DELETE TO anon, authenticated USING (true);

-- 3. tasks: official task id
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_task_id text;

-- 4. daily_entries: internal notes (0.5 productivity points each)
ALTER TABLE daily_entries
  ADD COLUMN IF NOT EXISTS internal_notes integer NOT NULL DEFAULT 0;

UPDATE daily_entries
SET internal_notes = seek_feedback
WHERE internal_notes = 0 AND seek_feedback > 0;