import { useState, useCallback, useRef, useEffect } from 'react';
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

  const [activeTwin, setActiveTwin] = useState<TwinLabel>('A');
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe gesture handling for mobile twin switching
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const threshold = 60;
    if (touchDeltaX.current < -threshold && activeTwin === 'A') {
      setActiveTwin('B');
    } else if (touchDeltaX.current > threshold && activeTwin === 'B') {
      setActiveTwin('A');
    }
    touchDeltaX.current = 0;
  }, [activeTwin]);

  // Keyboard accessibility
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') setActiveTwin('A');
      if (e.key === 'ArrowRight') setActiveTwin('B');
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const twinAColor = pair.twin_a_color;
  const twinBColor = pair.twin_b_color;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Twin selector tabs — mobile: swipe between, tablet+: both visible */}
      <div className="flex gap-2 px-3 pt-3 pb-1 md:hidden">
        <button
          onClick={() => setActiveTwin('A')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold text-base
                      transition-all duration-200 min-h-[52px]
                      ${activeTwin === 'A' ? 'text-[#0F1117]' : 'bg-white/5 text-text-secondary'}`}
          style={activeTwin === 'A' ? { backgroundColor: twinAColor } : undefined}
        >
          <span className="text-lg">{pair.twin_a_emoji}</span>
          <span>{pair.twin_a_name}</span>
          {timers.some((t) => t.twin_label === 'A') && (
            <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTwin('B')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold text-base
                      transition-all duration-200 min-h-[52px]
                      ${activeTwin === 'B' ? 'text-[#0F1117]' : 'bg-white/5 text-text-secondary'}`}
          style={activeTwin === 'B' ? { backgroundColor: twinBColor } : undefined}
        >
          <span className="text-lg">{pair.twin_b_emoji}</span>
          <span>{pair.twin_b_name}</span>
          {timers.some((t) => t.twin_label === 'B') && (
            <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
          )}
        </button>
      </div>

      {/* Mobile: single panel with swipe */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden md:hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-3 h-full">
          <TwinPanel
            label={activeTwin}
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

      {/* Tablet+: side by side */}
      <div className="hidden md:flex flex-1 min-h-0 gap-3 p-3 overflow-y-auto">
        <div className="flex-1 min-h-0">
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
        <div className="flex-1 min-h-0">
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
