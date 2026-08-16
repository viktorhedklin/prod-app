/*
# Shift metrics and todo fields

1. daily_entries
- Add internal_notes (count of internal notes, 0.5 prod points each)
- Existing seek_feedback values are copied across so old data is not lost

2. tasks
- Add completion_date for the due / submit-by date
- Add source_task_id for the official task ID entered by the agent
*/

ALTER TABLE daily_entries
  ADD COLUMN IF NOT EXISTS internal_notes integer NOT NULL DEFAULT 0;

UPDATE daily_entries
SET internal_notes = seek_feedback
WHERE internal_notes = 0 AND seek_feedback > 0;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completion_date text;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_task_id text;

UPDATE tasks
SET completion_date = linked_date
WHERE completion_date IS NULL;
