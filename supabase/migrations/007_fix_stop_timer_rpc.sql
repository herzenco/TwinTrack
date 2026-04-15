-- 007_fix_stop_timer_rpc.sql
-- Fix stop_timer_and_create_event to accept feed_segments,
-- return the full event row, and set feed timestamp to timer start.

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
  v_logged_name TEXT;
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

  -- Resolve logged_by_name: use param, or fall back to the timer starter name
  v_logged_name := COALESCE(p_logged_by_name, v_timer.started_by_name);

  -- Calculate duration
  v_duration_ms := EXTRACT(EPOCH FROM (v_now - v_timer.started_at)) * 1000;

  -- Delete the timer
  DELETE FROM active_timers WHERE id = p_timer_id;

  -- Insert the event
  IF v_timer.type = 'feed' THEN
    INSERT INTO events (
      pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
      feed_mode, feed_amount, feed_unit, feed_type, feed_side, feed_segments, duration_ms
    ) VALUES (
      v_timer.pair_id, v_timer.twin_label, 'feed',
      v_timer.started_at,  -- timestamp = when feed started
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
      v_timer.started_at,  -- timestamp = when nap started
      auth.uid(), v_logged_name,
      v_timer.started_at, v_now, v_duration_ms
    )
    RETURNING id INTO v_event_id;
  END IF;

  -- Return the full event as JSONB
  SELECT to_jsonb(e.*) INTO v_event FROM events e WHERE e.id = v_event_id;
  RETURN v_event;
END;
$$;
