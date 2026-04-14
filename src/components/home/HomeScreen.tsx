import { useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { TwinPanel } from './TwinPanel';
import type { TwinLabel, FeedType, FeedSide, DiaperSubtype } from '../../types';

export function HomeScreen() {
  const pair = useAppStore((s) => s.activePair);
  const timers = useAppStore((s) => s.activeTimers);
  const events = useAppStore((s) => s.recentEvents);
  const addEvent = useAppStore((s) => s.addEvent);
  const setUndoEvent = useAppStore((s) => s.setUndoEvent);
  const addTimer = useAppStore((s) => s.addTimer);
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);

  const handleLogBottle = useCallback(
    (twin: TwinLabel, feedType: FeedType, amount: number, unit: 'oz' | 'ml') => {
      const event = {
        id: crypto.randomUUID(),
        pair_id: pair?.id ?? '',
        twin_label: twin,
        type: 'feed' as const,
        timestamp: new Date().toISOString(),
        logged_by_uid: user?.id ?? '',
        logged_by_name: profile?.display_name ?? 'Unknown',
        encrypted: false,
        feed_mode: 'bottle' as const,
        feed_amount: amount,
        feed_unit: unit,
        feed_type: feedType,
        feed_side: null,
        duration_ms: null,
        diaper_subtype: null,
        nap_start: null,
        nap_end: null,
        note_text: null,
        created_at: new Date().toISOString(),
      };
      addEvent(event);
      setUndoEvent(event);
      // TODO: persist via lib/database.ts
    },
    [pair, user, profile, addEvent, setUndoEvent],
  );

  const handleStartBreast = useCallback(
    (twin: TwinLabel, side: FeedSide) => {
      const timer = {
        id: crypto.randomUUID(),
        pair_id: pair?.id ?? '',
        twin_label: twin,
        type: 'feed' as const,
        started_at: new Date().toISOString(),
        started_by_uid: user?.id ?? '',
        started_by_name: profile?.display_name ?? 'Unknown',
        feed_side: side,
      };
      addTimer(timer);
      // TODO: persist via lib/database.ts
    },
    [pair, user, profile, addTimer],
  );

  const handleLogDiaper = useCallback(
    (twin: TwinLabel, subtype: DiaperSubtype) => {
      const event = {
        id: crypto.randomUUID(),
        pair_id: pair?.id ?? '',
        twin_label: twin,
        type: 'diaper' as const,
        timestamp: new Date().toISOString(),
        logged_by_uid: user?.id ?? '',
        logged_by_name: profile?.display_name ?? 'Unknown',
        encrypted: false,
        feed_mode: null,
        feed_amount: null,
        feed_unit: null,
        feed_type: null,
        feed_side: null,
        duration_ms: null,
        diaper_subtype: subtype,
        nap_start: null,
        nap_end: null,
        note_text: null,
        created_at: new Date().toISOString(),
      };
      addEvent(event);
      setUndoEvent(event);
      // TODO: persist via lib/database.ts
    },
    [pair, user, profile, addEvent, setUndoEvent],
  );

  const handleToggleNap = useCallback(
    (twin: TwinLabel) => {
      const timer = {
        id: crypto.randomUUID(),
        pair_id: pair?.id ?? '',
        twin_label: twin,
        type: 'nap' as const,
        started_at: new Date().toISOString(),
        started_by_uid: user?.id ?? '',
        started_by_name: profile?.display_name ?? 'Unknown',
        feed_side: null,
      };
      addTimer(timer);
      // TODO: persist via lib/database.ts
    },
    [pair, user, profile, addTimer],
  );

  const handleStopTimer = useCallback(
    (timerId: string) => {
      const timer = timers.find((t) => t.id === timerId);
      if (!timer) return;

      // Remove timer optimistically
      useAppStore.getState().removeTimer(timerId);

      // Create event from timer
      const now = new Date().toISOString();
      const durationMs = Date.now() - new Date(timer.started_at).getTime();
      const event = {
        id: crypto.randomUUID(),
        pair_id: pair?.id ?? '',
        twin_label: timer.twin_label,
        type: timer.type,
        timestamp: timer.started_at,
        logged_by_uid: user?.id ?? '',
        logged_by_name: profile?.display_name ?? 'Unknown',
        encrypted: false,
        feed_mode: timer.type === 'feed' ? ('breast' as const) : null,
        feed_amount: null,
        feed_unit: null,
        feed_type: null,
        feed_side: timer.feed_side,
        duration_ms: durationMs,
        diaper_subtype: null,
        nap_start: timer.type === 'nap' ? timer.started_at : null,
        nap_end: timer.type === 'nap' ? now : null,
        note_text: null,
        created_at: now,
      };
      addEvent(event);
      setUndoEvent(event);
      // TODO: call stop_timer_and_create_event RPC via lib/database.ts
    },
    [timers, pair, user, profile, addEvent, setUndoEvent],
  );

  if (!pair) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Loading twin pair...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Split screen: side by side on >=380px, stacked on narrow */}
      <div className="flex-1 flex flex-col min-[380px]:flex-row gap-2 p-2 min-h-0 overflow-y-auto">
        <div className="flex-1 min-h-0 min-[380px]:max-w-[50%]">
          <TwinPanel
            label="A"
            pair={pair}
            timers={timers}
            events={events}
            onLogBottle={handleLogBottle}
            onStartBreast={handleStartBreast}
            onLogDiaper={handleLogDiaper}
            onToggleNap={handleToggleNap}
            onStopTimer={handleStopTimer}
          />
        </div>
        <div className="flex-1 min-h-0 min-[380px]:max-w-[50%]">
          <TwinPanel
            label="B"
            pair={pair}
            timers={timers}
            events={events}
            onLogBottle={handleLogBottle}
            onStartBreast={handleStartBreast}
            onLogDiaper={handleLogDiaper}
            onToggleNap={handleToggleNap}
            onStopTimer={handleStopTimer}
          />
        </div>
      </div>
    </div>
  );
}
