-- 008_pumping_sessions.sql
-- TwinTrack: Pumping session tracking for mothers

CREATE TABLE IF NOT EXISTS pumping_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES twin_pairs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_oz NUMERIC(5,2) NOT NULL DEFAULT 0,
  right_oz NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_oz NUMERIC(5,2) GENERATED ALWAYS AS (left_oz + right_oz) STORED,
  note TEXT,
  logged_by_uid UUID NOT NULL DEFAULT auth.uid(),
  logged_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by pair + time
CREATE INDEX IF NOT EXISTS idx_pumping_sessions_pair_ts
  ON pumping_sessions(pair_id, timestamp DESC);

-- Enable RLS
ALTER TABLE pumping_sessions ENABLE ROW LEVEL SECURITY;

-- Policies: pair members can read, insert, update, and delete their own pair's sessions
DROP POLICY IF EXISTS "Pair members can read pumping sessions" ON pumping_sessions;
CREATE POLICY "Pair members can read pumping sessions"
  ON pumping_sessions FOR SELECT
  USING (is_pair_member(pair_id));

DROP POLICY IF EXISTS "Pair members can insert pumping sessions" ON pumping_sessions;
CREATE POLICY "Pair members can insert pumping sessions"
  ON pumping_sessions FOR INSERT
  WITH CHECK (is_pair_member(pair_id) AND logged_by_uid = auth.uid());

DROP POLICY IF EXISTS "Pair members can update pumping sessions" ON pumping_sessions;
CREATE POLICY "Pair members can update pumping sessions"
  ON pumping_sessions FOR UPDATE
  USING (is_pair_member(pair_id) AND logged_by_uid = auth.uid());

DROP POLICY IF EXISTS "Pair members can delete pumping sessions" ON pumping_sessions;
CREATE POLICY "Pair members can delete pumping sessions"
  ON pumping_sessions FOR DELETE
  USING (is_pair_member(pair_id));

-- Enable realtime
ALTER TABLE pumping_sessions REPLICA IDENTITY FULL;
