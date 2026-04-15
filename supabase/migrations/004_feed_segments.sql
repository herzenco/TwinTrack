-- 004_feed_segments.sql
-- Add feed_segments JSONB column to events for per-breast duration tracking.
-- Update stop_timer_and_create_event to accept segments and use feed start time.

-- Additive column — no data loss, existing rows get NULL
ALTER TABLE events ADD COLUMN IF NOT EXISTS feed_segments JSONB;

-- =============================================================================
-- Function: stop_timer_and_create_event (updated)
-- Now accepts feed_segments and sets feed event timestamp to timer start time
-- so the next-feed interval counts from the beginning of the feed.
-- =============================================================================
CREATE OR REPLACE FUNCTION stop_timer_and_create_event(
  p_timer_id UUID,
  p_logged_by_name TEXT,
  -- Optional feed fields
  p_feed_mode TEXT DEFAULT NULL,
  p_feed_amount NUMERIC DEFAULT NULL,
  p_feed_unit TEXT DEFAULT NULL,
  p_feed_type TEXT DEFAULT NULL,
  p_feed_segments JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timer RECORD;
  v_event_id UUID;
  v_now TIMESTAMPTZ := now();
  v_duration_ms BIGINT;
BEGIN
  -- Fetch the timer row
  SELECT * INTO v_timer FROM active_timers WHERE id = p_timer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer not found: %', p_timer_id;
  END IF;

  -- Explicit permission check: caller must be a member of the pair
  IF NOT EXISTS (
    SELECT 1 FROM pair_members
    WHERE pair_id = v_timer.pair_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a member of this pair';
  END IF;

  -- Calculate duration
  v_duration_ms := EXTRACT(EPOCH FROM (v_now - v_timer.started_at)) * 1000;

  -- Delete the timer
  DELETE FROM active_timers WHERE id = p_timer_id;

  -- Insert the event
  IF v_timer.type = 'feed' THEN
    INSERT INTO events (
      pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
      feed_mode, feed_amount, feed_unit, feed_type, feed_side, duration_ms, feed_segments
    ) VALUES (
      v_timer.pair_id, v_timer.twin_label, 'feed', v_timer.started_at, auth.uid(), p_logged_by_name,
      p_feed_mode, p_feed_amount, p_feed_unit, p_feed_type, v_timer.feed_side, v_duration_ms, p_feed_segments
    )
    RETURNING id INTO v_event_id;
  ELSIF v_timer.type = 'nap' THEN
    INSERT INTO events (
      pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
      nap_start, nap_end, duration_ms
    ) VALUES (
      v_timer.pair_id, v_timer.twin_label, 'nap', v_now, auth.uid(), p_logged_by_name,
      v_timer.started_at, v_now, v_duration_ms
    )
    RETURNING id INTO v_event_id;
  END IF;

  RETURN v_event_id;
END;
$$;
