/*
# Weekly QA review tracking

1. New Table
- `qa_entries` — one row per week, storing cases reviewed and QA percentage.

2. Security
- RLS enabled with per-user ownership pattern.
*/

CREATE TABLE IF NOT EXISTS qa_entries (
  week_start date NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  cases_reviewed integer NOT NULL DEFAULT 0,
  qa_percentage double precision NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start)
);

ALTER TABLE qa_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_qa" ON qa_entries FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "insert_own_qa" ON qa_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "update_own_qa" ON qa_entries FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "delete_own_qa" ON qa_entries FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);
