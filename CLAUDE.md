# TwinTrack

## Stack
React 18, TypeScript strict, Vite, Tailwind CSS, Supabase (Auth + PostgreSQL + Realtime + Edge Functions), Zustand, Web Crypto API.

## Conventions
- All components are functional with hooks. No class components.
- TypeScript strict mode. No `any` types.
- Supabase queries go through lib/database.ts -- never call supabase.from() directly in components.
- Encryption goes through lib/encryption.ts.
- All event inserts must include logged_by_uid and logged_by_name from the current session.
- All timestamps stored as TIMESTAMPTZ, displayed in the user's local timezone.
- Tailwind for all styling. No inline styles. No CSS modules.
- Dark mode is the only mode. Design everything for dark backgrounds.
- Generate TypeScript types from the database with: supabase gen types typescript --local > src/types/database.ts

## Supabase Rules
- RLS is enabled on every table. Test policies with supabase db test.
- logged_by_uid must match auth.uid() in RLS INSERT policies.
- Use Postgres functions (RPC) for multi-step operations (stop timer + create event).
- Never expose the service_role key to the client.
- Use supabase.channel() for real-time subscriptions.

## UI Rules
- Minimum 60px tap targets for all primary actions.
- Bottom-heavy layout. Interactive elements in bottom 60% of viewport.
- No confirmation dialogs for routine logging.
- 5-second undo toast after every log entry.
- Both twins visible on home screen at all times.

## Don'ts
- Don't add analytics or tracking.
- Don't load third-party scripts beyond the Supabase client.
- Don't store sensitive data in localStorage -- use IndexedDB with encryption.
- Don't bypass RLS with service_role key.
- Don't add features not in the PRD.
