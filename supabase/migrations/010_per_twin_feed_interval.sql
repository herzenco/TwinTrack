-- Add per-twin feed interval columns, defaulting to the existing shared value
ALTER TABLE twin_pairs
  ADD COLUMN twin_a_feed_interval_minutes INT,
  ADD COLUMN twin_b_feed_interval_minutes INT;

-- Backfill: copy the shared interval to both twins
UPDATE twin_pairs
SET twin_a_feed_interval_minutes = feed_interval_minutes,
    twin_b_feed_interval_minutes = feed_interval_minutes;

-- Make columns NOT NULL now that they're backfilled
ALTER TABLE twin_pairs
  ALTER COLUMN twin_a_feed_interval_minutes SET NOT NULL,
  ALTER COLUMN twin_a_feed_interval_minutes SET DEFAULT 180,
  ALTER COLUMN twin_b_feed_interval_minutes SET NOT NULL,
  ALTER COLUMN twin_b_feed_interval_minutes SET DEFAULT 180;
