-- 001_initial_schema.sql
-- TwinTrack: All tables, constraints, and indexes

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- Table: twin_pairs
-- =============================================================================
CREATE TABLE twin_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  encryption_key_hash TEXT,
  encryption_salt TEXT,
  twin_a_name TEXT DEFAULT 'Baby A',
  twin_a_color TEXT DEFAULT '#6C9BFF',
  twin_a_emoji TEXT DEFAULT '👶',
  twin_b_name TEXT DEFAULT 'Baby B',
  twin_b_color TEXT DEFAULT '#FF8FA4',
  twin_b_emoji TEXT DEFAULT '👶',
  feed_interval_minutes INT DEFAULT 180,
  nap_nudge_minutes INT DEFAULT 180,
  feed_nudge_minutes INT DEFAULT 45,
  timezone TEXT DEFAULT 'America/New_York'
);

-- =============================================================================
-- Table: pair_members
-- =============================================================================
CREATE TABLE pair_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES twin_pairs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT CHECK (role IN ('owner', 'caregiver')) NOT NULL DEFAULT 'caregiver',
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pair_id, user_id)
);

-- =============================================================================
-- Table: events
-- =============================================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES twin_pairs(id) ON DELETE CASCADE NOT NULL,
  twin_label TEXT CHECK (twin_label IN ('A', 'B')) NOT NULL,
  type TEXT CHECK (type IN ('feed', 'diaper', 'nap', 'note')) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  logged_by_uid UUID REFERENCES auth.users(id) NOT NULL,
  logged_by_name TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT false,

  -- Feed fields
  feed_mode TEXT CHECK (feed_mode IN ('bottle', 'breast')),
  feed_amount NUMERIC,
  feed_unit TEXT CHECK (feed_unit IN ('oz', 'ml')),
  feed_type TEXT CHECK (feed_type IN ('formula', 'breastmilk')),
  feed_side TEXT CHECK (feed_side IN ('left', 'right', 'both')),
  duration_ms BIGINT,

  -- Diaper fields
  diaper_subtype TEXT CHECK (diaper_subtype IN ('wet', 'dirty', 'both')),

  -- Nap fields
  nap_start TIMESTAMPTZ,
  nap_end TIMESTAMPTZ,

  -- Note fields (encrypted client-side)
  note_text TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_pair_timestamp ON events(pair_id, timestamp DESC);
CREATE INDEX idx_events_pair_twin_type ON events(pair_id, twin_label, type);

-- =============================================================================
-- Table: active_timers
-- =============================================================================
CREATE TABLE active_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES twin_pairs(id) ON DELETE CASCADE NOT NULL,
  twin_label TEXT CHECK (twin_label IN ('A', 'B')) NOT NULL,
  type TEXT CHECK (type IN ('feed', 'nap')) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  started_by_uid UUID REFERENCES auth.users(id) NOT NULL,
  started_by_name TEXT NOT NULL,
  feed_side TEXT CHECK (feed_side IN ('left', 'right', 'both')),
  UNIQUE(pair_id, twin_label, type)
);

-- =============================================================================
-- Table: invites
-- =============================================================================
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES twin_pairs(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_by UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ
);

-- =============================================================================
-- Table: user_profiles
-- =============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  active_pair_id UUID REFERENCES twin_pairs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 002_rls_policies.sql
-- TwinTrack: Row Level Security policies for all tables

-- =============================================================================
-- Helper function: is_pair_member
-- =============================================================================
CREATE OR REPLACE FUNCTION is_pair_member(p_pair_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM pair_members
    WHERE pair_id = p_pair_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is the owner of a pair
CREATE OR REPLACE FUNCTION is_pair_owner(p_pair_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM pair_members
    WHERE pair_id = p_pair_id AND user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
ALTER TABLE twin_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pair_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- twin_pairs policies
-- =============================================================================

-- SELECT: user must be a member of the pair
CREATE POLICY "twin_pairs_select" ON twin_pairs
  FOR SELECT USING (is_pair_member(id));

-- INSERT: user must be the creator
CREATE POLICY "twin_pairs_insert" ON twin_pairs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- UPDATE: only the owner can update pair settings
CREATE POLICY "twin_pairs_update" ON twin_pairs
  FOR UPDATE USING (is_pair_owner(id));

-- DELETE: only the owner can delete the pair
CREATE POLICY "twin_pairs_delete" ON twin_pairs
  FOR DELETE USING (is_pair_owner(id));

-- =============================================================================
-- pair_members policies
-- =============================================================================

-- SELECT: any member of the pair can see other members
CREATE POLICY "pair_members_select" ON pair_members
  FOR SELECT USING (is_pair_member(pair_id));

-- INSERT: only via redeem_invite function (SECURITY DEFINER) or owner creating pair.
-- The owner's own membership row is inserted when they create the pair, so we allow
-- insert if the user is the creator of the pair (for the initial owner row).
CREATE POLICY "pair_members_insert" ON pair_members
  FOR INSERT WITH CHECK (
    -- Allow the pair creator to add themselves as owner
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM twin_pairs WHERE id = pair_id AND created_by = auth.uid()
    )
  );

-- DELETE: only the pair owner can remove members
CREATE POLICY "pair_members_delete" ON pair_members
  FOR DELETE USING (is_pair_owner(pair_id));

-- =============================================================================
-- events policies
-- =============================================================================

-- SELECT: any pair member can view events
CREATE POLICY "events_select" ON events
  FOR SELECT USING (is_pair_member(pair_id));

-- INSERT: pair member, and logged_by_uid must match the authenticated user
CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (
    is_pair_member(pair_id)
    AND logged_by_uid = auth.uid()
  );

-- UPDATE: NONE -- events are immutable (no update policy)

-- DELETE: only the pair owner can delete events
CREATE POLICY "events_delete" ON events
  FOR DELETE USING (is_pair_owner(pair_id));

-- =============================================================================
-- active_timers policies
-- =============================================================================

-- SELECT: any pair member
CREATE POLICY "active_timers_select" ON active_timers
  FOR SELECT USING (is_pair_member(pair_id));

-- INSERT: any pair member
CREATE POLICY "active_timers_insert" ON active_timers
  FOR INSERT WITH CHECK (is_pair_member(pair_id));

-- DELETE: any pair member can stop a timer
CREATE POLICY "active_timers_delete" ON active_timers
  FOR DELETE USING (is_pair_member(pair_id));

-- =============================================================================
-- invites policies
-- =============================================================================

-- SELECT: only the invite creator can see their invites
CREATE POLICY "invites_select" ON invites
  FOR SELECT USING (created_by = auth.uid());

-- INSERT: only the pair owner can create invites
CREATE POLICY "invites_insert" ON invites
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND is_pair_owner(pair_id)
  );

-- UPDATE: only via redeem_invite function (SECURITY DEFINER) -- no direct update policy

-- =============================================================================
-- user_profiles policies
-- =============================================================================

-- SELECT: user can only see their own profile
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- INSERT: handled by the signup trigger (SECURITY DEFINER), but also allow user
-- to create their own profile row
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- UPDATE: user can only update their own profile
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (id = auth.uid());
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
