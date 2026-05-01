-- 011_timer_pause_sync.sql
-- Add pause state columns to active_timers so pause syncs across devices.

ALTER TABLE active_timers
  ADD COLUMN is_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN paused_at TIMESTAMPTZ,
  ADD COLUMN total_paused_ms BIGINT NOT NULL DEFAULT 0;

-- Replace the stop_timer RPC to account for DB-tracked pause time.
CREATE OR REPLACE FUNCTION stop_timer_and_create_event(
  p_timer_id UUID,
  p_logged_by_name TEXT DEFAULT NULL,
  p_feed_mode TEXT DEFAULT NULL,
  p_feed_amount NUMERIC DEFAULT NULL,
  p_feed_unit TEXT DEFAULT NULL,
  p_feed_type TEXT DEFAULT NULL,
  p_feed_segments JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timer RECORD;
  v_event_id UUID;
  v_event JSONB;
  v_now TIMESTAMPTZ := now();
  v_duration_ms BIGINT;
  v_total_paused BIGINT;
  v_logged_name TEXT;
BEGIN
  -- Fetch the timer row
  SELECT * INTO v_timer FROM active_timers WHERE id = p_timer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer not found: %', p_timer_id;
  END IF;

  -- Explicit permission check
  IF NOT EXISTS (
    SELECT 1 FROM pair_members
    WHERE pair_id = v_timer.pair_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a member of this pair';
  END IF;

  v_logged_name := COALESCE(p_logged_by_name, v_timer.started_by_name);

  -- Calculate total paused time (include current pause if still paused)
  v_total_paused := v_timer.total_paused_ms;
  IF v_timer.is_paused AND v_timer.paused_at IS NOT NULL THEN
    v_total_paused := v_total_paused +
      EXTRACT(EPOCH FROM (v_now - v_timer.paused_at)) * 1000;
  END IF;

  -- Duration = wall clock time minus paused time
  v_duration_ms := GREATEST(0,
    EXTRACT(EPOCH FROM (v_now - v_timer.started_at)) * 1000 - v_total_paused
  );

  -- Delete the timer
  DELETE FROM active_timers WHERE id = p_timer_id;

  -- Insert the event
  IF v_timer.type = 'feed' THEN
    INSERT INTO events (
      pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
      feed_mode, feed_amount, feed_unit, feed_type, feed_side, feed_segments, duration_ms
    ) VALUES (
      v_timer.pair_id, v_timer.twin_label, 'feed',
      v_timer.started_at,
      auth.uid(), v_logged_name,
      p_feed_mode, p_feed_amount, p_feed_unit, p_feed_type,
      v_timer.feed_side, p_feed_segments, v_duration_ms
    )
    RETURNING id INTO v_event_id;
  ELSIF v_timer.type = 'nap' THEN
    INSERT INTO events (
      pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
      nap_start, nap_end, duration_ms
    ) VALUES (
      v_timer.pair_id, v_timer.twin_label, 'nap',
      v_timer.started_at,
      auth.uid(), v_logged_name,
      v_timer.started_at, v_now, v_duration_ms
    )
    RETURNING id INTO v_event_id;
  END IF;

  SELECT to_jsonb(e.*) INTO v_event FROM events e WHERE e.id = v_event_id;
  RETURN v_event;
END;
$$;
