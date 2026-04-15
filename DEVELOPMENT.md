# TwinTrack Development Log

## Project Overview

TwinTrack is a mobile-first web application for tracking newborn twins. Built for sleep-deprived parents who need to log feeds, diapers, and naps with one hand at 3 AM. Unlike existing baby trackers, TwinTrack is designed from the ground up for twins with a split-screen UI, tandem feeding support, and multi-caregiver real-time sync.

**Live URL:** Deployed on Vercel (auto-deploys from `main` branch)
**Repo:** https://github.com/herzenco/TwinTrack

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 8 |
| Styling | Tailwind CSS 4 (dark mode only) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL with Row Level Security |
| Real-time | Supabase Realtime (WebSocket subscriptions) |
| State | Zustand |
| Encryption | Web Crypto API (AES-256-GCM) |
| PWA | vite-plugin-pwa with Workbox |
| Hosting | Vercel |

---

## Build Phases Completed

### Phase 1 — Project Foundation
- Scaffolded Vite + React + TypeScript project
- Installed all dependencies (Supabase, Zustand, React Router, Tailwind)
- Created directory structure matching the spec
- Set up Tailwind with custom dark-mode design tokens (twin colors, bg colors, typography)
- Created TypeScript types for all database entities
- Initialized Zustand store with auth, pair, timer, event, and UI state
- Created utility functions for time formatting and event detail formatting
- Set up `CLAUDE.md` with project conventions

### Phase 2 — Database (Supabase)
- Created 6 tables: `twin_pairs`, `pair_members`, `events`, `active_timers`, `invites`, `user_profiles`
- All tables have Row Level Security enabled
- RLS helper functions: `is_pair_member()`, `is_pair_owner()`
- Postgres functions:
  - `stop_timer_and_create_event()` — atomic timer stop + event create
  - `redeem_invite()` — validates code, checks expiry, adds member
  - `get_dashboard_summary()` — aggregated counts per twin
  - `handle_new_user()` — trigger that auto-creates user profile on signup
- Seed data for local development
- **Note:** RLS policies were temporarily set to permissive (`WITH CHECK (true)`) due to a JWT format mismatch (ES256 vs HS256) between Supabase Auth and PostgREST. The `auth.uid()` function doesn't resolve with the current key configuration.

### Phase 3 — Authentication
- Email/password signup and login via Supabase Auth
- `useAuth` hook manages session state, auto-refresh, and profile loading
- Client-side fallback creates `user_profiles` row if the database trigger doesn't fire
- Fixed React StrictMode double-mount issue that broke auth state listener
- Added `INITIAL_SESSION` event handling for persisted sessions
- Google OAuth removed (not configured)

### Phase 4 — Data Access Layer
- `lib/database.ts` — all Supabase operations (components never call `supabase.from()` directly)
- `lib/auth.ts` — auth operations (signUp, signIn, signOut, getSession, onAuthStateChange)
- Hooks:
  - `useAuth` — session management, profile loading/creation
  - `useTwinPair` — loads active twin pair and members
  - `useEvents` — fetches events with pagination, optimistic updates
  - `useActiveTimers` — timer CRUD
  - `useRealtime` — Supabase Realtime subscriptions
  - `useFeedInterval` — computes feed schedule status per twin

### Phase 5 — Security & Encryption
- `lib/encryption.ts` — AES-256-GCM encryption with PBKDF2 key derivation (600K iterations)
- Keys stored in IndexedDB (never localStorage, never server)
- `useEncryption` hook for encrypt/decrypt operations
- Invite Edge Function with rate limiting (created but not deployed — invite generation moved client-side)

### Phase 6 — Core UI Components (23 components)

**Home:**
- `HomeScreen` — mobile-first with swipeable twin tabs (side-by-side on tablet)
- `TwinPanel` — status cards (last feed with start/end time, next feed countdown, last diaper), action buttons
- `TimerDisplay` — large monospace timer with pulsing glow, pause/resume support
- `ActionButton` — 72-80px tap targets with press animation
- `FeedModal` — bottom sheet for bottle (type, amount presets) and breast (side selection)
- `NudgeBanner` — runaway timer alerts
- `UndoToast` — 5-second undo with inline note-taking (quick-note pills + free text)
- `TandemFeedView` — dual timer view for simultaneous breastfeeding

**Dashboard:**
- `DashboardView` — tabbed container (Overview, Timeline, Activity, Daily)
- `SummaryCard` — 24h feed/diaper/nap counts per twin
- `FeedIntervalMonitor` — progress bar with green/yellow/red states
- `TimelineView` — chronological event log with filters
- `ActivityLog` — editable table with Duration column, CSV export, edit/delete via bottom sheet
- `DailySummary` — today vs yesterday comparison

**Settings:**
- `SettingsView` — twin config, feed interval, invite management, account
- `TwinConfig` — edit names, colors, emojis
- `MemberManagement` — list caregivers, revoke access
- `InviteCode` — generate shareable invite link with native share + copy

**Auth:**
- `LoginScreen` — email/password, invite banner support
- `SignupScreen` — email/password with display name
- `OnboardingFlow` — create pair or join with code
- `JoinInvitePage` — handles `/join/:code` for link-based invites

**Shared:**
- `BottomNav` — 3-tab navigation with safe-area padding
- `BottomSheet` — swipe-to-dismiss modal with drag handle

### Phase 7 — PWA
- `vite-plugin-pwa` configured with auto-update
- Workbox runtime caching for Supabase API (NetworkFirst) and Google Fonts (CacheFirst)
- Web app manifest for installability
- Apple mobile web app meta tags
- Google Fonts: DM Sans + DM Mono

---

## Key Features

### Feed Tracking
- **Bottle feed:** formula or breast milk, amount presets (1-6oz) or custom, one-tap log
- **Breast feed:** side selection (L/R/Both), timed session with start/stop
- **Pause/Resume:** one-tap pause when baby unlatches, paused time excluded from saved duration
- **Tandem feed:** start both twins simultaneously, individual or combined pause/resume/stop
- **Last breast side badge:** displayed on twin panel so parent knows which side to offer next
- **Feed schedule:** next feed time computed from configurable interval, color-coded (green/red)

### Diaper Tracking
- One-tap logging: Wet / Dirty / Both
- No confirmation dialogs

### Nap Tracking
- One-tap start/stop timer
- Duration calculated and saved

### Notes
- Quick-note pills after every log (context-specific: "Spit up", "Rash", "Blowout", etc.)
- Free-text notes
- Notes editable from Activity Log

### Activity Management
- Full activity table with Duration column
- Tap any row to edit all fields (twin, type, time, duration, details, notes)
- Delete events with confirmation
- CSV export of filtered activity data
- Filter by caregiver, sort ascending/descending

### Multi-User / Family
- **Link-based invites:** owner generates link (`/join/ABC123`), shares via text/native share
- Unauthenticated users: click link → sign up → auto-join via `sessionStorage` persistence
- Authenticated users: click link → one-tap join
- Invite codes: 6-character alphanumeric, 48-hour expiry
- Caregiver attribution on all events

### Onboarding
- Sign up → Create new twin pair OR Join with invite code/link
- Twin name, color, emoji, and feed interval configuration
- Skip-friendly defaults

---

## Environment Variables

```
VITE_SUPABASE_URL=https://vwkstsmosrxesqotjuks.supabase.co
VITE_SUPABASE_ANON_KEY=<JWT anon key>
```

These must be set in both `.env.local` (local dev) and Vercel Environment Variables (production). Vite bakes them into the bundle at build time.

---

## Deployment

- **Branch strategy:** `dev` for work-in-progress, `main` for production
- **Vercel:** auto-deploys on push to `main`
- **SPA routing:** `vercel.json` rewrites all routes to `index.html`
- **Build:** `tsc -b && vite build` (TypeScript must pass strict checks)
- **Peer deps:** `.npmrc` with `legacy-peer-deps=true` for vite-plugin-pwa compatibility

---

## Known Issues / TODOs

1. **RLS policies are permissive** — temporary fix due to JWT ES256/HS256 mismatch. Need to investigate Supabase PostgREST JWT verification settings.
2. **Database persistence** — many event/timer operations have `// TODO: persist via lib/database.ts` comments. Optimistic UI works but changes don't survive page refresh without Supabase writes.
3. **Edge Function not deployed** — invite generation uses client-side insert instead. Works but lacks server-side rate limiting.
4. **Encryption not wired** — encryption lib exists but twin names and notes are not yet encrypted in practice.
5. **Real-time subscriptions** — `useRealtime` hook exists but isn't called in the app yet.
6. **Google/Apple OAuth** — removed from UI, not configured in Supabase.
7. **PWA icons** — placeholder paths, need actual icon PNG files.

---

## File Structure

```
TwinTrack/
  src/
    components/
      home/         # HomeScreen, TwinPanel, TimerDisplay, ActionButton, FeedModal,
                    # NudgeBanner, UndoToast, TandemFeedView
      dashboard/    # DashboardView, SummaryCard, FeedIntervalMonitor, TimelineView,
                    # ActivityLog, DailySummary
      settings/     # SettingsView, TwinConfig, MemberManagement, InviteCode
      auth/         # LoginScreen, SignupScreen, OnboardingFlow, JoinInvitePage
      shared/       # BottomNav, BottomSheet
    hooks/          # useAuth, useTwinPair, useEvents, useActiveTimers, useEncryption,
                    # useFeedInterval, useRealtime, useInviteRedemption
    lib/            # supabase.ts, database.ts, auth.ts, encryption.ts, encryption-utils.ts
    store/          # appStore.ts (Zustand)
    types/          # index.ts (all TypeScript types)
    utils/          # time.ts, formatters.ts
    App.tsx
    main.tsx
  supabase/
    migrations/     # 001_initial_schema.sql, 002_rls_policies.sql, 003_functions.sql
    functions/      # generate-invite/index.ts (Edge Function)
    seed.sql
    config.toml
    full_migration.sql   # Combined migration for SQL Editor paste
    fix_rls_temp.sql     # Temporary permissive RLS policies
  CLAUDE.md              # Project conventions for AI assistants
  vercel.json            # SPA routing config
  .npmrc                 # legacy-peer-deps for build compatibility
```
