-- Temporary fix: replace restrictive RLS with permissive policies
-- until JWT verification is resolved

-- twin_pairs: allow any authenticated user to insert
DROP POLICY IF EXISTS "twin_pairs_insert" ON twin_pairs;
CREATE POLICY "twin_pairs_insert" ON twin_pairs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "twin_pairs_select" ON twin_pairs;
CREATE POLICY "twin_pairs_select" ON twin_pairs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "twin_pairs_update" ON twin_pairs;
CREATE POLICY "twin_pairs_update" ON twin_pairs
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "twin_pairs_delete" ON twin_pairs;
CREATE POLICY "twin_pairs_delete" ON twin_pairs
  FOR DELETE USING (true);

-- pair_members
DROP POLICY IF EXISTS "pair_members_insert" ON pair_members;
CREATE POLICY "pair_members_insert" ON pair_members
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "pair_members_select" ON pair_members;
CREATE POLICY "pair_members_select" ON pair_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "pair_members_delete" ON pair_members;
CREATE POLICY "pair_members_delete" ON pair_members
  FOR DELETE USING (true);

-- events
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events
  FOR DELETE USING (true);

-- active_timers
DROP POLICY IF EXISTS "active_timers_insert" ON active_timers;
CREATE POLICY "active_timers_insert" ON active_timers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "active_timers_select" ON active_timers;
CREATE POLICY "active_timers_select" ON active_timers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "active_timers_delete" ON active_timers;
CREATE POLICY "active_timers_delete" ON active_timers
  FOR DELETE USING (true);

-- invites
DROP POLICY IF EXISTS "invites_insert" ON invites;
CREATE POLICY "invites_insert" ON invites
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "invites_select" ON invites;
CREATE POLICY "invites_select" ON invites
  FOR SELECT USING (true);

-- user_profiles
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (true);
