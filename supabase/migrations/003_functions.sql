-- 003_functions.sql
-- TwinTrack: Postgres functions and triggers

-- =============================================================================
-- Function: stop_timer_and_create_event
-- Atomically deletes a timer and creates the corresponding event.
-- SECURITY DEFINER so it bypasses RLS, but we check membership explicitly.
-- =============================================================================
CREATE OR REPLACE FUNCTION stop_timer_and_create_event(
  p_timer_id UUID,
  p_logged_by_name TEXT,
  -- Optional feed fields
  p_feed_mode TEXT DEFAULT NULL,
  p_feed_amount NUMERIC DEFAULT NULL,
  p_feed_unit TEXT DEFAULT NULL,
  p_feed_type TEXT DEFAULT NULL
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
      feed_mode, feed_amount, feed_unit, feed_type, feed_side, duration_ms
    ) VALUES (
      v_timer.pair_id, v_timer.twin_label, 'feed', v_now, auth.uid(), p_logged_by_name,
      p_feed_mode, p_feed_amount, p_feed_unit, p_feed_type, v_timer.feed_side, v_duration_ms
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

-- =============================================================================
-- Function: redeem_invite
-- Validates invite code, checks expiry, adds user as caregiver, marks redeemed.
-- SECURITY DEFINER to bypass RLS for the cross-table writes.
-- =============================================================================
CREATE OR REPLACE FUNCTION redeem_invite(
  p_code TEXT,
  p_user_id UUID,
  p_display_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_pair_id UUID;
BEGIN
  -- Explicit permission check: caller must be the user being added
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: cannot redeem invite for another user';
  END IF;

  -- Find the invite
  SELECT * INTO v_invite FROM invites WHERE code = p_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if already redeemed
  IF v_invite.redeemed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code has already been redeemed';
  END IF;

  -- Check expiry
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite code has expired';
  END IF;

  v_pair_id := v_invite.pair_id;

  -- Check if user is already a member of this pair
  IF EXISTS (
    SELECT 1 FROM pair_members WHERE pair_id = v_pair_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this pair';
  END IF;

  -- Add user as caregiver
  INSERT INTO pair_members (pair_id, user_id, role, display_name)
  VALUES (v_pair_id, p_user_id, 'caregiver', p_display_name);

  -- Mark invite as redeemed
  UPDATE invites
  SET redeemed_by = p_user_id, redeemed_at = now()
  WHERE id = v_invite.id;

  -- Set this pair as the user's active pair if they don't have one
  UPDATE user_profiles
  SET active_pair_id = v_pair_id
  WHERE id = p_user_id AND active_pair_id IS NULL;

  RETURN v_pair_id;
END;
$$;

-- =============================================================================
-- Function: get_dashboard_summary
-- Returns aggregated counts per twin for the given time window.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_pair_id UUID,
  p_hours INT DEFAULT 24
)
RETURNS TABLE (
  twin_label TEXT,
  feed_count BIGINT,
  diaper_count BIGINT,
  nap_count BIGINT,
  total_nap_minutes NUMERIC,
  total_feed_duration_minutes NUMERIC,
  last_feed_at TIMESTAMPTZ,
  last_diaper_at TIMESTAMPTZ,
  last_nap_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Explicit permission check
  IF NOT EXISTS (
    SELECT 1 FROM pair_members
    WHERE pair_id = p_pair_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a member of this pair';
  END IF;

  RETURN QUERY
  SELECT
    e.twin_label,
    COUNT(*) FILTER (WHERE e.type = 'feed') AS feed_count,
    COUNT(*) FILTER (WHERE e.type = 'diaper') AS diaper_count,
    COUNT(*) FILTER (WHERE e.type = 'nap') AS nap_count,
    COALESCE(SUM(e.duration_ms) FILTER (WHERE e.type = 'nap') / 60000.0, 0) AS total_nap_minutes,
    COALESCE(SUM(e.duration_ms) FILTER (WHERE e.type = 'feed') / 60000.0, 0) AS total_feed_duration_minutes,
    MAX(e.timestamp) FILTER (WHERE e.type = 'feed') AS last_feed_at,
    MAX(e.timestamp) FILTER (WHERE e.type = 'diaper') AS last_diaper_at,
    MAX(e.timestamp) FILTER (WHERE e.type = 'nap') AS last_nap_at
  FROM events e
  WHERE e.pair_id = p_pair_id
    AND e.timestamp >= now() - (p_hours || ' hours')::INTERVAL
  GROUP BY e.twin_label
  ORDER BY e.twin_label;
END;
$$;

-- =============================================================================
-- Trigger function: auto-create user_profiles row on auth.users signup
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
