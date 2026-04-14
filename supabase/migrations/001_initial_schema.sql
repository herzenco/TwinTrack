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
