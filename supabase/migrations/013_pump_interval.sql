-- 013_pump_interval.sql
-- Add pump interval setting to twin_pairs for scheduling pumping sessions.

ALTER TABLE twin_pairs ADD COLUMN pump_interval_minutes INT DEFAULT 180;
