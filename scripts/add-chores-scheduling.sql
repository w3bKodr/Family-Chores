-- Migration: add scheduling and recurrence fields to chores
-- Run in staging first, then production

ALTER TABLE public.chores
  ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_day_of_month INTEGER DEFAULT NULL;

-- Index to speed up queries filtering by scheduled_date
CREATE INDEX IF NOT EXISTS idx_chores_scheduled_date ON public.chores(scheduled_date);

-- Notes:
-- - scheduled_date is used for one-off (ad-hoc) chores.
-- - recurrence_type can be 'weekly', 'biweekly', or 'monthly'.
-- - recurrence_interval is integer (1 for weekly, 2 for biweekly).
-- - recurrence_day_of_month stores 1..31 for monthly schedules (NULL otherwise).
