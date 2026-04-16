-- 006_collaborative_policies.sql
-- Allow pair members to update their own events and timers for collaborative use

-- Allow any pair member to update the note_text on events they logged
CREATE POLICY "events_update_own" ON events
  FOR UPDATE USING (
    is_pair_member(pair_id)
    AND logged_by_uid = auth.uid()
  );

-- Allow any pair member to delete any event in their pair
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events
  FOR DELETE USING (is_pair_member(pair_id));

-- Allow any pair member to update active timers (for switching breast side)
CREATE POLICY "active_timers_update" ON active_timers
  FOR UPDATE USING (is_pair_member(pair_id));
