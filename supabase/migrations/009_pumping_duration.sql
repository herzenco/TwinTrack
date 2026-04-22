-- 009_pumping_duration.sql
-- Add duration tracking to pumping sessions

ALTER TABLE pumping_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 0;
