/*
# Weekly entries + coach memory

1. New Tables
- `weekly_entries` — enter aggregate weekly data (past or current week) instead of
  one day at a time, so trends get a baseline even for weeks you didn't log daily.
- `coach_profile` — single-row copy of the coach's understanding of the user
  (role, goals, struggles, style). Persisted so it can never be wiped by clearing
  browser storage.
- `coach_memories` — the coach's long-term memory: durable facts it learns over
  time from reflections, journal entries, and coaching check-ins.

2. Security
- RLS enabled with the same single-tenant `anon/authenticated` pattern used across
  the rest of the app.
*/

-- 1. weekly_entries (keyed by week_start Monday)
CREATE TABLE IF NOT EXISTS weekly_entries (
  week_start text PRIMARY KEY,
  chats_handled integer NOT NULL DEFAULT 0,
  emails_handled integer NOT NULL DEFAULT 0,
  seek_feedback integer NOT NULL DEFAULT 0,
  tasks_handled integer NOT NULL DEFAULT 0,
  task_hours_logged integer NOT NULL DEFAULT 0,
  task_hours_submitted integer NOT NULL DEFAULT 0,
  internal_notes integer NOT NULL DEFAULT 0,
  csat_ratings jsonb NOT NULL DEFAULT '[]',
  escalations_raised integer NOT NULL DEFAULT 0,
  escalation_accuracy_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE weekly_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_weekly_entries_sel" ON weekly_entries;
CREATE POLICY "anon_crud_weekly_entries_sel" ON weekly_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_weekly_entries_ins" ON weekly_entries;
CREATE POLICY "anon_crud_weekly_entries_ins" ON weekly_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_weekly_entries_upd" ON weekly_entries;
CREATE POLICY "anon_crud_weekly_entries_upd" ON weekly_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_weekly_entries_del" ON weekly_entries;
CREATE POLICY "anon_crud_weekly_entries_del" ON weekly_entries FOR DELETE TO anon, authenticated USING (true);

-- 2. coach_profile (single row)
CREATE TABLE IF NOT EXISTS coach_profile (
  id text PRIMARY KEY DEFAULT 'single',
  role text,
  main_goal text,
  big_goal text,
  strengths text,
  struggles text,
  stress_sources text,
  motivation text,
  demotivators text,
  coaching_style text DEFAULT 'balanced',
  context text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE coach_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_coach_profile_sel" ON coach_profile;
CREATE POLICY "anon_crud_coach_profile_sel" ON coach_profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_coach_profile_ins" ON coach_profile;
CREATE POLICY "anon_crud_coach_profile_ins" ON coach_profile FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_coach_profile_upd" ON coach_profile;
CREATE POLICY "anon_crud_coach_profile_upd" ON coach_profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_coach_profile_del" ON coach_profile;
CREATE POLICY "anon_crud_coach_profile_del" ON coach_profile FOR DELETE TO anon, authenticated USING (true);

-- 3. coach_memories (growing long-term memory)
CREATE TABLE IF NOT EXISTS coach_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  source text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE coach_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_coach_memories_sel" ON coach_memories;
CREATE POLICY "anon_crud_coach_memories_sel" ON coach_memories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_crud_coach_memories_ins" ON coach_memories;
CREATE POLICY "anon_crud_coach_memories_ins" ON coach_memories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_coach_memories_upd" ON coach_memories;
CREATE POLICY "anon_crud_coach_memories_upd" ON coach_memories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_crud_coach_memories_del" ON coach_memories;
CREATE POLICY "anon_crud_coach_memories_del" ON coach_memories FOR DELETE TO anon, authenticated USING (true);