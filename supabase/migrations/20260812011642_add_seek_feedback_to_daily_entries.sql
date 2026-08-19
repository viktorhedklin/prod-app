/*
# Add Byseek feedback tracking to daily productivity

1. Modified Tables
- `daily_entries`
- Add `seek_feedback` as a non-negative integer count of Byseek feedback forms completed that day.
- Existing rows automatically use 0 through the database default.

2. Scoring
- The application awards 0.5 productivity points for each recorded Byseek feedback form.

3. Security
- No access model changes are made.
- The existing row-level security policies on `daily_entries` remain in place for the single-tenant app.

4. Important Notes
- This is additive only and does not remove or alter existing data.
- The column is added only when it does not already exist, so this migration is safe to re-run.
*/

ALTER TABLE daily_entries
  ADD COLUMN IF NOT EXISTS seek_feedback integer NOT NULL DEFAULT 0;
