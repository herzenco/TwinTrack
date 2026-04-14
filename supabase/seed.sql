-- seed.sql
-- TwinTrack: Seed data for local development
-- NOTE: These UUIDs are deterministic for reproducible local dev.
-- The auth.users rows must be created via Supabase Auth in local dev,
-- but we seed the app-level tables here assuming those users exist.

-- =============================================================================
-- Test user IDs (must match users created in Supabase local auth)
-- Create these users via the Supabase dashboard or supabase auth commands:
--   User 1 (owner):     test-owner@example.com / password123
--   User 2 (caregiver): test-caregiver@example.com / password123
-- =============================================================================
DO $$
DECLARE
  v_owner_id UUID := '00000000-0000-0000-0000-000000000001';
  v_caregiver_id UUID := '00000000-0000-0000-0000-000000000002';
  v_pair_id UUID := '11111111-1111-1111-1111-111111111111';
  v_now TIMESTAMPTZ := now();
BEGIN

  -- =========================================================================
  -- User profiles
  -- =========================================================================
  INSERT INTO user_profiles (id, display_name, active_pair_id)
  VALUES
    (v_owner_id, 'Mom', v_pair_id),
    (v_caregiver_id, 'Dad', v_pair_id)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- Twin pair
  -- =========================================================================
  INSERT INTO twin_pairs (id, created_by, twin_a_name, twin_b_name, twin_a_color, twin_b_color, timezone)
  VALUES (
    v_pair_id,
    v_owner_id,
    'Luca',
    'Mia',
    '#6C9BFF',
    '#FF8FA4',
    'America/New_York'
  )
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- Pair members
  -- =========================================================================
  INSERT INTO pair_members (pair_id, user_id, role, display_name)
  VALUES
    (v_pair_id, v_owner_id, 'owner', 'Mom'),
    (v_pair_id, v_caregiver_id, 'caregiver', 'Dad')
  ON CONFLICT (pair_id, user_id) DO NOTHING;

  -- =========================================================================
  -- Sample events (last 24 hours)
  -- =========================================================================

  -- Feeds for Twin A (Luca)
  INSERT INTO events (pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
    feed_mode, feed_amount, feed_unit, feed_type, duration_ms)
  VALUES
    (v_pair_id, 'A', 'feed', v_now - INTERVAL '8 hours', v_owner_id, 'Mom',
      'bottle', 3, 'oz', 'formula', NULL),
    (v_pair_id, 'A', 'feed', v_now - INTERVAL '5 hours', v_caregiver_id, 'Dad',
      'breast', NULL, NULL, NULL, 900000),
    (v_pair_id, 'A', 'feed', v_now - INTERVAL '2 hours', v_owner_id, 'Mom',
      'bottle', 4, 'oz', 'breastmilk', NULL);

  -- Feeds for Twin B (Mia)
  INSERT INTO events (pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
    feed_mode, feed_amount, feed_unit, feed_type, feed_side, duration_ms)
  VALUES
    (v_pair_id, 'B', 'feed', v_now - INTERVAL '7 hours', v_owner_id, 'Mom',
      'breast', NULL, NULL, NULL, 'left', 720000),
    (v_pair_id, 'B', 'feed', v_now - INTERVAL '4 hours', v_owner_id, 'Mom',
      'breast', NULL, NULL, NULL, 'right', 840000),
    (v_pair_id, 'B', 'feed', v_now - INTERVAL '1 hour', v_caregiver_id, 'Dad',
      'bottle', 3.5, 'oz', 'formula', NULL, NULL);

  -- Diapers
  INSERT INTO events (pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
    diaper_subtype)
  VALUES
    (v_pair_id, 'A', 'diaper', v_now - INTERVAL '6 hours', v_owner_id, 'Mom', 'wet'),
    (v_pair_id, 'A', 'diaper', v_now - INTERVAL '3 hours', v_caregiver_id, 'Dad', 'dirty'),
    (v_pair_id, 'A', 'diaper', v_now - INTERVAL '30 minutes', v_owner_id, 'Mom', 'both'),
    (v_pair_id, 'B', 'diaper', v_now - INTERVAL '5.5 hours', v_owner_id, 'Mom', 'wet'),
    (v_pair_id, 'B', 'diaper', v_now - INTERVAL '2 hours', v_caregiver_id, 'Dad', 'both');

  -- Naps
  INSERT INTO events (pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
    nap_start, nap_end, duration_ms)
  VALUES
    (v_pair_id, 'A', 'nap', v_now - INTERVAL '4 hours', v_owner_id, 'Mom',
      v_now - INTERVAL '6 hours', v_now - INTERVAL '4 hours', 7200000),
    (v_pair_id, 'B', 'nap', v_now - INTERVAL '3 hours', v_caregiver_id, 'Dad',
      v_now - INTERVAL '5 hours', v_now - INTERVAL '3 hours', 7200000);

  -- Notes
  INSERT INTO events (pair_id, twin_label, type, timestamp, logged_by_uid, logged_by_name,
    note_text)
  VALUES
    (v_pair_id, 'A', 'note', v_now - INTERVAL '1.5 hours', v_owner_id, 'Mom',
      'Seemed extra fussy after last feed, might be gassy'),
    (v_pair_id, 'B', 'note', v_now - INTERVAL '45 minutes', v_caregiver_id, 'Dad',
      'Smiling a lot today!');

  -- =========================================================================
  -- Active timer (Twin B currently napping)
  -- =========================================================================
  INSERT INTO active_timers (pair_id, twin_label, type, started_at, started_by_uid, started_by_name)
  VALUES (v_pair_id, 'B', 'nap', v_now - INTERVAL '20 minutes', v_caregiver_id, 'Dad')
  ON CONFLICT (pair_id, twin_label, type) DO NOTHING;

  -- =========================================================================
  -- Sample invite (unused)
  -- =========================================================================
  INSERT INTO invites (pair_id, code, created_by, expires_at)
  VALUES (v_pair_id, 'ABC123', v_owner_id, v_now + INTERVAL '48 hours');

END $$;
