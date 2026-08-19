/*
# Create Productivity Grader tables (single-tenant, no auth)

This is a single-user app with no sign-in screen. All data is intentionally
shared/public within this project, so policies use `TO anon, authenticated`
with `USING (true)` / `WITH CHECK (true)` — the anon-key frontend can read
and write freely.

## New Tables

1. `daily_entries` — one row per date, stores all daily KPI metrics
   - date (text, primary key)
   - chats_handled, emails_handled, tasks_handled (int)
   - task_hours_logged, task_hours_submitted (numeric)
   - csat_ratings (int[]) — array of 1-5 star ratings
   - qa_score (numeric, nullable), qa_cases_reviewed (int)
   - escalations_raised (int)
   - escalation_accuracy_pct (numeric, nullable)
   - quiz_score (numeric, nullable)
   - punctuality_points (numeric)
   - updated_at (timestamptz)

2. `csat_notes` — optional notes attached to CSAT ratings
   - id (uuid PK)
   - entry_date (text, FK to daily_entries.date)
   - rating (int)
   - note (text, nullable)
   - created_at (timestamptz)

3. `tasks` — task items with status tracking
   - task_id (text PK, e.g. TSK-0001)
   - brief_explanation, submit_to (text)
   - amount, task_hours (numeric, nullable)
   - status (text: pending | submitted)
   - created_at, submitted_at (timestamptz)
   - linked_date (text)
   - additional_info (text, nullable)

4. `escalations` — escalation items with status tracking
   - escalation_id (text PK, e.g. ESC-0001)
   - case_number, escalate_to, reason (text)
   - status (text: open | escalated | resolved)
   - created_at, escalated_at (timestamptz)
   - linked_date (text)
   - additional_info (text, nullable)

5. `kpi_targets` — configurable KPI threshold definitions
   - metric_key (text PK)
   - label (text)
   - weight (numeric)
   - direction (text)
   - thresholds (jsonb)

6. `mood_checkins` — mood check-in records
   - id (uuid PK)
   - entry_date (text)
   - mood (text)
   - checkin_type (text: start | reflection)
   - created_at (timestamptz)

7. `reflections` — daily reflection entries
   - entry_date (text PK)
   - questions (jsonb), answers (jsonb)
   - ai_tips (jsonb)
   - ai_summary (text, nullable)
   - score (numeric, nullable)
   - grade (text, nullable)
   - created_at (timestamptz)

8. `journal_entries` — conversational journal messages
   - id (uuid PK)
   - entry_date (text)
   - user_message (text)
   - ai_response (text, nullable)
   - category (text, nullable)
   - linked_entry_date (text, nullable)
   - created_at (timestamptz)

9. `insights` — generated insight notifications
   - id (uuid PK)
   - insight_type (text)
   - title, body (text)
   - severity (text)
   - dismissed (boolean, default false)
   - created_at (timestamptz)

10. `achievements` — unlocked achievement badges
    - achievement_key (text PK)
    - title, description (text)
    - unlocked_at (timestamptz)

## Security
- RLS enabled on every table.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in — the anon-key frontend
  needs full CRUD access.
*/

-- 1. daily_entries
CREATE TABLE IF NOT EXISTS daily_entries (
  date text PRIMARY KEY,
  chats_handled integer NOT NULL DEFAULT 0,
  emails_handled integer NOT NULL DEFAULT 0,
  tasks_handled integer NOT NULL DEFAULT 0,
  task_hours_logged numeric NOT NULL DEFAULT 0,
  task_hours_submitted numeric NOT NULL DEFAULT 0,
  csat_ratings integer[] NOT NULL DEFAULT '{}',
  qa_score numeric,
  qa_cases_reviewed integer NOT NULL DEFAULT 0,
  escalations_raised integer NOT NULL DEFAULT 0,
  escalation_accuracy_pct numeric,
  quiz_score numeric,
  punctuality_points numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_daily_entries_sel" ON daily_entries;
CREATE POLICY "anon_crud_daily_entries_sel" ON daily_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_daily_entries_ins" ON daily_entries;
CREATE POLICY "anon_crud_daily_entries_ins" ON daily_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_daily_entries_upd" ON daily_entries;
CREATE POLICY "anon_crud_daily_entries_upd" ON daily_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_daily_entries_del" ON daily_entries;
CREATE POLICY "anon_crud_daily_entries_del" ON daily_entries FOR DELETE TO anon, authenticated USING (true);

-- 2. csat_notes
CREATE TABLE IF NOT EXISTS csat_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date text NOT NULL,
  rating integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE csat_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_csat_notes_sel" ON csat_notes;
CREATE POLICY "anon_crud_csat_notes_sel" ON csat_notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_csat_notes_ins" ON csat_notes;
CREATE POLICY "anon_crud_csat_notes_ins" ON csat_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_csat_notes_upd" ON csat_notes;
CREATE POLICY "anon_crud_csat_notes_upd" ON csat_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_csat_notes_del" ON csat_notes;
CREATE POLICY "anon_crud_csat_notes_del" ON csat_notes FOR DELETE TO anon, authenticated USING (true);

-- 3. tasks
CREATE TABLE IF NOT EXISTS tasks (
  task_id text PRIMARY KEY,
  brief_explanation text NOT NULL,
  submit_to text NOT NULL,
  amount numeric,
  task_hours numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  linked_date text NOT NULL,
  additional_info text
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_tasks_sel" ON tasks;
CREATE POLICY "anon_crud_tasks_sel" ON tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_tasks_ins" ON tasks;
CREATE POLICY "anon_crud_tasks_ins" ON tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_tasks_upd" ON tasks;
CREATE POLICY "anon_crud_tasks_upd" ON tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_tasks_del" ON tasks;
CREATE POLICY "anon_crud_tasks_del" ON tasks FOR DELETE TO anon, authenticated USING (true);

-- 4. escalations
CREATE TABLE IF NOT EXISTS escalations (
  escalation_id text PRIMARY KEY,
  case_number text NOT NULL,
  escalate_to text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  escalated_at timestamptz,
  linked_date text NOT NULL,
  additional_info text
);
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_escalations_sel" ON escalations;
CREATE POLICY "anon_crud_escalations_sel" ON escalations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_escalations_ins" ON escalations;
CREATE POLICY "anon_crud_escalations_ins" ON escalations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_escalations_upd" ON escalations;
CREATE POLICY "anon_crud_escalations_upd" ON escalations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_escalations_del" ON escalations;
CREATE POLICY "anon_crud_escalations_del" ON escalations FOR DELETE TO anon, authenticated USING (true);

-- 5. kpi_targets
CREATE TABLE IF NOT EXISTS kpi_targets (
  metric_key text PRIMARY KEY,
  label text NOT NULL,
  weight numeric NOT NULL,
  direction text NOT NULL,
  thresholds jsonb NOT NULL
);
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_kpi_targets_sel" ON kpi_targets;
CREATE POLICY "anon_crud_kpi_targets_sel" ON kpi_targets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_kpi_targets_ins" ON kpi_targets;
CREATE POLICY "anon_crud_kpi_targets_ins" ON kpi_targets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_kpi_targets_upd" ON kpi_targets;
CREATE POLICY "anon_crud_kpi_targets_upd" ON kpi_targets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_kpi_targets_del" ON kpi_targets;
CREATE POLICY "anon_crud_kpi_targets_del" ON kpi_targets FOR DELETE TO anon, authenticated USING (true);

-- 6. mood_checkins
CREATE TABLE IF NOT EXISTS mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date text NOT NULL,
  mood text NOT NULL,
  checkin_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_mood_checkins_sel" ON mood_checkins;
CREATE POLICY "anon_crud_mood_checkins_sel" ON mood_checkins FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_mood_checkins_ins" ON mood_checkins;
CREATE POLICY "anon_crud_mood_checkins_ins" ON mood_checkins FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_mood_checkins_upd" ON mood_checkins;
CREATE POLICY "anon_crud_mood_checkins_upd" ON mood_checkins FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_mood_checkins_del" ON mood_checkins;
CREATE POLICY "anon_crud_mood_checkins_del" ON mood_checkins FOR DELETE TO anon, authenticated USING (true);

-- 7. reflections
CREATE TABLE IF NOT EXISTS reflections (
  entry_date text PRIMARY KEY,
  questions jsonb NOT NULL DEFAULT '[]',
  answers jsonb NOT NULL DEFAULT '[]',
  ai_tips jsonb NOT NULL DEFAULT '[]',
  ai_summary text,
  score numeric,
  grade text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_reflections_sel" ON reflections;
CREATE POLICY "anon_crud_reflections_sel" ON reflections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_reflections_ins" ON reflections;
CREATE POLICY "anon_crud_reflections_ins" ON reflections FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_reflections_upd" ON reflections;
CREATE POLICY "anon_crud_reflections_upd" ON reflections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_reflections_del" ON reflections;
CREATE POLICY "anon_crud_reflections_del" ON reflections FOR DELETE TO anon, authenticated USING (true);

-- 8. journal_entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date text NOT NULL,
  user_message text NOT NULL,
  ai_response text,
  category text,
  linked_entry_date text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_journal_entries_sel" ON journal_entries;
CREATE POLICY "anon_crud_journal_entries_sel" ON journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_journal_entries_ins" ON journal_entries;
CREATE POLICY "anon_crud_journal_entries_ins" ON journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_journal_entries_upd" ON journal_entries;
CREATE POLICY "anon_crud_journal_entries_upd" ON journal_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_journal_entries_del" ON journal_entries;
CREATE POLICY "anon_crud_journal_entries_del" ON journal_entries FOR DELETE TO anon, authenticated USING (true);

-- 9. insights
CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_insights_sel" ON insights;
CREATE POLICY "anon_crud_insights_sel" ON insights FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_insights_ins" ON insights;
CREATE POLICY "anon_crud_insights_ins" ON insights FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_insights_upd" ON insights;
CREATE POLICY "anon_crud_insights_upd" ON insights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_insights_del" ON insights;
CREATE POLICY "anon_crud_insights_del" ON insights FOR DELETE TO anon, authenticated USING (true);

-- 10. achievements
CREATE TABLE IF NOT EXISTS achievements (
  achievement_key text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_achievements_sel" ON achievements;
CREATE POLICY "anon_crud_achievements_sel" ON achievements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_achievements_ins" ON achievements;
CREATE POLICY "anon_crud_achievements_ins" ON achievements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_achievements_upd" ON achievements;
CREATE POLICY "anon_crud_achievements_upd" ON achievements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_achievements_del" ON achievements;
CREATE POLICY "anon_crud_achievements_del" ON achievements FOR DELETE TO anon, authenticated USING (true);

-- Seed default KPI targets if table is empty
INSERT INTO kpi_targets (metric_key, label, weight, direction, thresholds)
SELECT * FROM (VALUES
  ('productivity', 'Productivity', 0.30, 'higher_is_better', '{"S":110,"A_plus":95,"A":85,"B":75,"C":70}'::jsonb),
  ('csat', 'CSAT', 0.30, 'higher_is_better', '{"S":4.50,"A_plus":4.45,"A":4.40,"B":4.15,"C":4.10}'::jsonb),
  ('qa', 'QA (Chat & Email)', 0.20, 'higher_is_better', '{"S":97,"A_plus":95,"A":92,"B":88,"C":83}'::jsonb),
  ('esc_rate', 'Escalation Rate %', 0.05, 'lower_is_better', '{"S":6.30,"A_plus":7.10,"A":9.10,"B":12.50,"C":13.50}'::jsonb),
  ('esc_accuracy', 'Escalation Accuracy %', 0.05, 'higher_is_better', '{"S":97.50,"A_plus":97.00,"A":96.00,"B":94.00,"C":91.00}'::jsonb),
  ('quiz', 'Quiz Score', 0.05, 'higher_is_better', '{"S":95,"A_plus":90,"A":85,"B":80,"C":0}'::jsonb),
  ('punctuality', 'Punctuality Points', 0.05, 'higher_is_better', '{"S":10,"A_plus":9,"A":8,"B":6.5,"C":5}'::jsonb)
) AS t(metric_key, label, weight, direction, thresholds)
WHERE NOT EXISTS (SELECT 1 FROM kpi_targets LIMIT 1);