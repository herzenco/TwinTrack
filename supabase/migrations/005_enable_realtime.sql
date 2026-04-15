-- 005_enable_realtime.sql
-- Enable Supabase Realtime for collaborative sync across devices/users

-- Set REPLICA IDENTITY FULL so DELETE payloads include the full row (needed for id)
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE active_timers REPLICA IDENTITY FULL;
ALTER TABLE pair_members REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE active_timers;
ALTER PUBLICATION supabase_realtime ADD TABLE pair_members;
