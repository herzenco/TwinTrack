-- 012_family_code.sql
-- Add reusable family code to twin_pairs for easy caregiver onboarding.
-- Replaces per-person invite codes with a single shareable 4-digit PIN.

-- Add family_code column to twin_pairs
ALTER TABLE twin_pairs ADD COLUMN family_code TEXT;

-- Ensure codes are unique across all pairs
CREATE UNIQUE INDEX idx_twin_pairs_family_code ON twin_pairs(family_code) WHERE family_code IS NOT NULL;

-- =============================================================================
-- Function: join_with_family_code
-- Validates 4-digit family code, adds user as caregiver to the pair.
-- Reusable: multiple people can join with the same code (no expiry, no single-use).
-- SECURITY DEFINER to bypass RLS for cross-table writes.
-- =============================================================================
CREATE OR REPLACE FUNCTION join_with_family_code(
  p_code TEXT,
  p_user_id UUID,
  p_display_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pair_id UUID;
BEGIN
  -- Explicit permission check: caller must be the user being added
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: cannot join for another user';
  END IF;

  -- Find the pair by family code
  SELECT id INTO v_pair_id FROM twin_pairs WHERE family_code = p_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid family code';
  END IF;

  -- Check if user is already a member of this pair
  IF EXISTS (
    SELECT 1 FROM pair_members WHERE pair_id = v_pair_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You are already a member of this pair';
  END IF;

  -- Add user as caregiver
  INSERT INTO pair_members (pair_id, user_id, role, display_name)
  VALUES (v_pair_id, p_user_id, 'caregiver', p_display_name);

  -- Set this pair as the user's active pair if they don't have one
  UPDATE user_profiles
  SET active_pair_id = v_pair_id
  WHERE id = p_user_id AND active_pair_id IS NULL;

  RETURN v_pair_id;
END;
$$;
