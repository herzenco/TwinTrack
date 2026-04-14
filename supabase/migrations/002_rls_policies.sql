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
