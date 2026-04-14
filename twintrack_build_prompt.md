# TWINTRACK MVP — Claude Code Build Prompt

**Author:** Herzen Cortes | **Date:** April 2026 | **Version:** 1.1 — Supabase Backend

---

## 1. Project Overview

TwinTrack is a mobile-first web application purpose-built for tracking newborn twins. Unlike every existing baby tracker (Huckleberry, Baby Tracker, Feed Baby, Glow Baby, TwinTracker), which treat twins as an afterthought bolted onto a single-baby UI, TwinTrack is designed from the ground up for a parent with zero free hands at 3 AM.

The app launches as a responsive web app (PWA-capable) built with React + TypeScript + Supabase, targeting a future React Native mobile build. The entire architecture is designed for that migration path — Supabase has official React Native support.

**Core philosophy:** Speed over features. If a feature adds friction to the primary flow, it does not ship in v1.

### 1.1 Target User

- **Primary:** Mother of newborn twins, 0–6 months
- **Secondary:** Co-parent, grandparents, aunts/uncles, nanny — any caregiver with an account

**Key insight:** The user is sleep-deprived, often has at least one baby in arms, and needs to complete a log entry in under 3 seconds without reading anything.

### 1.2 Success Metrics

- Time-to-log a feed: under 5 seconds from app open
- Session length: under 30 seconds for routine logging
- D7 retention: >60%
- Core NPS driver: "Easiest app I've used one-handed"

---

## 2. Tech Stack

Build this project with the following stack. Do not deviate unless a specific technical constraint makes it impossible.

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite | Type safety, fast builds, direct path to React Native |
| Styling | Tailwind CSS | Rapid UI iteration, dark mode utilities |
| Auth | Supabase Auth | Email/password + Google + Apple sign-in, JWT-based, RLS-compatible |
| Database | Supabase PostgreSQL | Full SQL, Row Level Security, real-time subscriptions, foreign keys |
| Real-time | Supabase Realtime | Postgres Changes via WebSocket — live timer sync, event feed |
| Edge Functions | Supabase Edge Functions (Deno) | Invite code generation, server-side validation, scheduled cleanup |
| Hosting | Vercel or Netlify | CDN, SSL, CI/CD from GitHub |
| Encryption | Web Crypto API (AES-256-GCM) + pgcrypto | Client-side encryption of sensitive fields, server-side hashing |
| PWA | Vite PWA plugin (vite-plugin-pwa) | Installable, offline-capable, push notifications |
| State Mgmt | Zustand | Lightweight, no boilerplate, works with React Native later |
| Testing | Vitest + React Testing Library | Fast, Vite-native |

---

## 3. Database Schema (PostgreSQL)

All tables live in the public schema. Row Level Security (RLS) is enabled on every table. Use Supabase migrations for all schema changes.

### 3.1 Table: twin_pairs

```sql
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
```

### 3.2 Table: pair_members

```sql
CREATE TABLE pair_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES twin_pairs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT CHECK (role IN ('owner', 'caregiver')) NOT NULL DEFAULT 'caregiver',
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pair_id, user_id)
);
```

### 3.3 Table: events

```sql
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
```

### 3.4 Table: active_timers

```sql
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
```

Active timers are separate rows so all caregivers see them via Supabase Realtime subscriptions. When a timer is stopped, it becomes an event row and the timer row is deleted — do this in a Postgres function (transaction) to ensure atomicity.

### 3.5 Table: invites

```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES twin_pairs(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_by UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ
);
```

### 3.6 Table: user_profiles

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  active_pair_id UUID REFERENCES twin_pairs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.7 Postgres Functions

Create the following Postgres functions (called via RPC from the client):

- **stop_timer_and_create_event(timer_id, ...):** Deletes the active_timer row and inserts a new event row in a single transaction. Prevents orphaned timers or missing events if the client disconnects mid-operation.
- **redeem_invite(code, user_id, display_name):** Validates the invite code, checks expiry, adds the user to pair_members, marks the invite as redeemed, returns the pair_id. All in one transaction.
- **get_dashboard_summary(pair_id, hours):** Returns aggregated counts (feeds, diapers, nap minutes) per twin for the given time window. Runs server-side for performance.

---

## 4. Row Level Security (RLS)

RLS is the backbone of security in Supabase. Every table MUST have RLS enabled. Do NOT use service_role key from the client — all client queries go through the anon key with RLS enforcement.

### 4.1 Core RLS Pattern

All data access is gated on pair membership. Create a helper function:

```sql
CREATE OR REPLACE FUNCTION is_pair_member(p_pair_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM pair_members
    WHERE pair_id = p_pair_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 4.2 Policies Per Table

- **twin_pairs:** SELECT where `is_pair_member(id)`. INSERT where `auth.uid() = created_by`. UPDATE where member is owner. DELETE by owner only.
- **pair_members:** SELECT where `is_pair_member(pair_id)`. INSERT via `redeem_invite` function only (SECURITY DEFINER). DELETE by owner only.
- **events:** SELECT where `is_pair_member(pair_id)`. INSERT where `is_pair_member(pair_id) AND logged_by_uid = auth.uid()`. UPDATE: NONE (events are immutable). DELETE by owner only.
- **active_timers:** SELECT where `is_pair_member(pair_id)`. INSERT where `is_pair_member(pair_id)`. DELETE where `is_pair_member(pair_id)` (any member can stop a timer).
- **invites:** SELECT where `created_by = auth.uid()`. INSERT where user is owner of the pair. UPDATE via `redeem_invite` function only.
- **user_profiles:** SELECT/UPDATE where `id = auth.uid()`. INSERT on signup trigger.

CRITICAL: Write these policies in the initial migration. Test them with the Supabase local dev CLI (`supabase db test`) before deploying. Never ship without RLS.

---

## 5. Authentication & Multi-User Access

### 5.1 Auth Flow

- Supabase Auth with email/password, Google OAuth, and Apple OAuth
- On signup, a trigger function creates a `user_profiles` row with the user's display name
- On first login, user is prompted to either create a new twin pair or join with an invite code
- A user can belong to multiple twin pairs (a nanny tracking for two families, grandparents with access)

### 5.2 Invite System

- Owner generates a 6-character alphanumeric invite code via an Edge Function
- Code is stored in the `invites` table with a 48-hour expiry
- New user enters the code during onboarding or from settings
- Redemption happens server-side via the `redeem_invite` Postgres function — validates code, checks expiry, adds member, all in one transaction
- Owner can revoke any caregiver's access from settings (deletes their `pair_members` row)

### 5.3 Roles

- **Owner:** Full access. Can rename twins, change settings, invite/remove caregivers, delete the twin pair.
- **Caregiver:** Can log events, view history, view dashboard. Cannot change pair settings or manage members.

### 5.4 Logging Attribution

Every event row includes `logged_by_uid` and `logged_by_name`. RLS enforces that `logged_by_uid` matches `auth.uid()` on insert — no spoofing possible. The dashboard and history views display this (e.g., "Mom logged a dirty diaper at 2:34 AM"). These fields are immutable — no UPDATE policy exists on events.

---

## 6. Real-Time Sync

Supabase Realtime provides WebSocket-based subscriptions to Postgres changes. This is how multi-device and multi-user sync works.

### 6.1 Subscriptions to Set Up

- **active_timers:** Subscribe to INSERT, UPDATE, DELETE where `pair_id = current pair`. All caregivers see live timers.
- **events:** Subscribe to INSERT where `pair_id = current pair`. New events from any caregiver appear in real time.
- **pair_members:** Subscribe to INSERT, DELETE where `pair_id = current pair`. Reflects when caregivers join or are removed.

### 6.2 Implementation Notes

- Use `supabase.channel()` with `postgres_changes` filter for each subscription
- RLS is enforced on Realtime — users only receive changes for pairs they belong to
- Handle reconnection: on reconnect, fetch latest state from database to avoid missed events
- Optimistic UI: show event locally immediately, confirm on server acknowledgement, rollback on failure

---

## 7. Core Features

### 7.1 Split-Screen Home

- Screen divided vertically: left = Twin A, right = Twin B
- Each side shows: baby name with color-coded badge, active timer (large, prominent, real-time), last feed time + type + side (for breast), last diaper time + type, last nap time or live nap timer
- Color-coded per twin (user-customizable in settings)
- Both twins are ALWAYS visible — the home screen IS the product
- On narrow screens (<380px), stack vertically with swipeable tabs

### 7.2 One-Handed Interaction Design

- All primary actions reachable with a single thumb tap from the home screen
- Minimum 60px height for all tap targets
- No navigation required to start/stop a timer
- Bottom-sheet modals for detail entry (slides up from bottom, thumb-reachable)
- No confirmation dialogs for common actions (start timer, log diaper)
- 5-second undo toast after every log entry (deletes the event row if tapped)

### 7.3 Feeding Tracker

**Bottle Feed:**
- Tap FEED, select BOTTLE
- Choose formula or breast milk
- Select amount (preset: 1–6 oz with custom input option)
- Tap LOG — done. Time and logger auto-captured.

**Breast Feed:**
- Tap FEED, select BREAST
- Select side: Left / Right / Both
- Tap START TIMER — inserts a row in `active_timers`, timer appears on home screen for all users
- One tap to stop — calls `stop_timer_and_create_event` RPC, saves event with duration and side
- **CRITICAL: Display the last-used breast side prominently on the home screen** so the parent knows which side to offer next. Show as a badge on the twin's panel (e.g., "Last: L"). The daily summary also tallies left vs. right usage.

**Simultaneous Feeding:**
- Both twins can have feed timers running simultaneously — the UNIQUE constraint on `active_timers` (pair_id, twin_label, type) allows one feed timer per twin
- Each timer is independent and visible on its respective panel for all connected users

### 7.4 Diaper Tracker

- Three quick-log buttons per twin: Wet / Dirty / Both
- One tap — no modal, no additional screens, direct INSERT to events table
- Time and logger auto-captured
- Optional note field accessible from history view (not inline)

### 7.5 Nap Tracker

- One-tap start/stop timer per twin
- Visual indicator on home screen while nap is active (pulsing glow)
- Stop calls `stop_timer_and_create_event` RPC — logs duration, start, end
- Both twins can nap simultaneously

### 7.6 Notes

- Free-form text notes attached to any event via history view
- Standalone notes (not attached to an event) from the home screen
- Notes are timestamped, searchable, and the `note_text` field is encrypted client-side before write

### 7.7 Runaway Timer Nudges

- Feed timer > configured threshold (default 45min bottle, 60min breast): show banner "Still feeding? [Yes] [Stop & Save]"
- Nap timer > 3 hours: show similar banner
- Banners are non-intrusive, dismissible, computed client-side from the `active_timers.started_at` value

---

## 8. Dashboard

Dedicated screen accessible from bottom nav. Provides a parent-facing summary with configurable alert thresholds.

### 8.1 Summary Cards

- One card per twin, color-coded
- Last 24h: total feeds, total diapers, total nap time (use `get_dashboard_summary` RPC)
- Current status: active timer, time since last feed/diaper/nap

### 8.2 Feed Interval Monitor

The primary dashboard feature. Parents need to feed newborns every 2–3 hours.

- Configurable interval (default 3h, adjustable 1.5h–4h in 15-min increments)
- Per twin: progress bar or countdown to next expected feed
- Visual states: GREEN (on schedule), YELLOW (<30 min remaining), RED (overdue)
- Overdue message: "Twin A is 22 minutes overdue for a feed"
- Optional PWA push notification when interval expires

### 8.3 Timeline View

- Chronological log, both twins, color-coded
- Each entry: event icon, twin name, time, who logged it, details
- Filter by: event type, twin, caregiver
- Tap any entry for full details or to add a note

### 8.4 Daily Summary

- Today's totals vs. yesterday's
- Breast side tracking: left vs. right count for the day
- Diaper breakdown by type
- Total nap time with individual durations

### 8.5 Activity Log (Who Logged What)

Filterable view for parents who want to see what happened while they were asleep or away.

- Columns: Time, Twin, Event, Details, Logged By
- Filter by caregiver
- Sortable by time
- Use Supabase `.range()` for server-side pagination

---

## 9. Security & Encryption

This app handles data about newborns. Security is not optional. Implement ALL of the following.

### 9.1 Row Level Security

Covered in detail in Section 4. RLS is enabled on every table. All client queries use the anon key. The service_role key is NEVER exposed to the client. Test every policy.

### 9.2 Client-Side Encryption

Encrypt sensitive fields before writing to Supabase so that even a database breach leaves the data unreadable.

- Use Web Crypto API (SubtleCrypto) with AES-256-GCM
- Generate a per-twin-pair encryption key on pair creation
- Key is derived from a passphrase the owner sets, using PBKDF2 with 600,000 iterations and a random salt
- The salt is stored in Supabase (on the `twin_pairs` row). The key is NEVER stored server-side.
- The derived key lives only in the browser's IndexedDB, encrypted with a key derived from the user's Supabase access token
- When a caregiver joins, the owner shares the passphrase out-of-band (verbally, text). Caregiver enters it once; key is derived and stored locally.
- Encrypted fields: `note_text`, `twin_a_name`, `twin_b_name`, any custom labels
- Non-encrypted fields: timestamps, event types, durations, `twin_label` (needed for queries and dashboard)

### 9.3 Server-Side Security

- Supabase Edge Functions validate invite codes server-side — never trust client-side validation for security-critical operations
- Use `pgcrypto` for hashing the encryption key verification hash (bcrypt)
- Postgres functions that modify data use SECURITY DEFINER with explicit permission checks inside the function body
- Rate limit Edge Functions: max 10 invite code generations per hour per user

### 9.4 Transport & Session Security

- All Supabase traffic is HTTPS by default
- Supabase Auth JWTs expire after 1 hour and auto-refresh via the client library
- Sensitive UI (settings, member management) requires re-authentication if session > 15 minutes
- No sensitive data in URL parameters — use Supabase client library for all data operations
- CSP headers configured on hosting provider (Vercel/Netlify)
- Supabase anon key is safe to expose (it's a public key), but the service_role key must NEVER appear in client code, environment variables exposed to the browser, or git history

### 9.5 Privacy

- No analytics or tracking SDKs in v1
- No third-party scripts loaded (only Supabase JS client)
- App does not request location, camera, or microphone permissions
- Data deletion: owner can delete the twin pair — CASCADE deletes all events, timers, members, and invites
- Account deletion: user can delete their Supabase auth account from settings, which cascades to their user_profile and pair_member rows

---

## 10. Design System

### 10.1 Principles

- **Dark mode is the default.** Parents use this at 3 AM. A white screen is hostile.
- **Bottom-heavy layout.** All interactive elements in the bottom 60% of the screen.
- **60px minimum tap targets.** No exceptions for primary actions.
- **Color-coded twins.** Default: Blue (#6C9BFF) for Twin A, Pink (#FF8FA4) for Twin B. Customizable.
- **No cognitive load.** Icons + color > text. The parent should never have to read to take an action.

### 10.2 Navigation

Bottom navigation bar with 3 tabs:

- Home (split-screen tracking)
- Dashboard (summary, feed interval monitor, timeline, activity log)
- Settings (twin config, invite management, feed intervals, encryption, account)

### 10.3 Typography

- Primary: DM Sans (system font fallback)
- Monospace (timers): DM Mono (system monospace fallback)

---

## 11. Interaction Conflict Handling

### 11.1 Log diaper while feed timer is running

Diaper is a one-tap action. Feed timer continues. No conflict.

### 11.2 Start feed on Twin B while Twin A's feed modal is open

Dismiss Twin A's modal, open Twin B's. If Twin A's timer was started, it continues. If modal was open but no timer started, it closes with no log.

### 11.3 Both twins napping, one wakes

Tap nap on the awake twin. That timer stops and saves. Other twin's timer continues.

### 11.4 Simultaneous logging by two caregivers

Each event is a separate row with its own timestamp and logger. No merge conflicts. If same type + same twin within 60 seconds, dashboard flags potential duplicate but does not auto-delete.

---

## 12. Onboarding Flow

1. Sign up (email/password, Google, or Apple via Supabase Auth)
2. Choose: "Create new twin pair" or "Join with invite code"
3. If creating: Enter twin names (skippable), pick colors, set encryption passphrase, set feed interval
4. If joining: Enter invite code, then enter encryption passphrase (shared by owner out-of-band)
5. Land on split-screen home. No tutorial overlay — the UI is self-explanatory.

---

## 13. Out of Scope (v1)

- Sleep analysis / AI insights
- Pediatrician export / reports
- Growth tracking / weight logging
- Apple Watch app
- Pumping tracker
- Native mobile app (React Native port is v2)
- Siri / voice assistant integration
- Light mode (dark only in v1)

---

## 14. File Structure

```
twintrack/
  src/
    components/
      home/
        TwinPanel.tsx
        StatusRow.tsx
        TimerDisplay.tsx
        ActionButton.tsx
        FeedModal.tsx
        NudgeBanner.tsx
        UndoToast.tsx
      dashboard/
        DashboardView.tsx
        FeedIntervalMonitor.tsx
        SummaryCard.tsx
        TimelineView.tsx
        ActivityLog.tsx
        DailySummary.tsx
      settings/
        SettingsView.tsx
        MemberManagement.tsx
        InviteCode.tsx
        TwinConfig.tsx
      auth/
        LoginScreen.tsx
        SignupScreen.tsx
        OnboardingFlow.tsx
      shared/
        BottomNav.tsx
        BottomSheet.tsx
    hooks/
      useAuth.ts
      useTwinPair.ts
      useEvents.ts
      useActiveTimers.ts
      useEncryption.ts
      useFeedInterval.ts
      useRealtime.ts
    lib/
      supabase.ts
      encryption.ts
      database.ts
      auth.ts
    store/
      appStore.ts
    types/
      database.ts        # generated via: supabase gen types typescript --local
      index.ts
    utils/
      time.ts
      formatters.ts
    App.tsx
    main.tsx
  supabase/
    migrations/
      001_initial_schema.sql
      002_rls_policies.sql
      003_functions.sql
    functions/
      generate-invite/index.ts
    seed.sql
    config.toml
  CLAUDE.md
  .env.local             # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## 15. CLAUDE.md (Place in project root)

Copy the following into `CLAUDE.md` at the project root. Claude Code reads this at the start of every session.

```markdown
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
```

---

## 16. Build Order

Build in this order. Each phase should be fully working before starting the next.

**Phase 1 — Supabase Foundation:** Create Supabase project. Write initial migration (all tables, indexes, RLS policies, functions). Set up Supabase local dev (`supabase init`, `supabase start`). Generate TypeScript types. Create Vite + React + Tailwind project. Initialize Supabase client in `lib/supabase.ts`.

**Phase 2 — Auth:** Email/password signup and login. Google OAuth. User profile creation trigger. Onboarding flow (create pair or join with code). Basic app shell with bottom nav and routing.

**Phase 3 — Core Tracking:** Split-screen home. Feed modal (bottle + breast with side selection). Diaper one-tap logging. Nap timer. All events writing to Supabase with `logged_by` attribution. Undo toast (deletes event row within 5 seconds).

**Phase 4 — Real-Time:** Supabase Realtime subscriptions for `active_timers`, `events`, `pair_members`. Stop-timer RPC (atomic delete + insert). Multi-device sync — test with two browser windows.

**Phase 5 — Dashboard:** Summary cards (via `get_dashboard_summary` RPC). Feed interval monitor with color-coded status. Timeline view. Daily summary with breast side tracking. Activity log with caregiver filter.

**Phase 6 — Multi-User:** Invite code Edge Function. Redeem invite RPC. Member management UI. Role enforcement in RLS. Revoke access flow.

**Phase 7 — Encryption:** Web Crypto encryption service. PBKDF2 key derivation from passphrase. Encrypt `note_text` and twin names before write. Decrypt on read. Key verification hash. Caregiver passphrase entry flow.

**Phase 8 — Polish:** PWA manifest + service worker. Offline detection + graceful degradation. Nudge banners. Responsive breakpoints. Error handling. Loading states. Empty states. Optimistic UI updates.

---

*End of prompt document. Build it.*
