import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { useEvents } from '../../hooks/useEvents';
import { useActiveTimers } from '../../hooks/useActiveTimers';
import { TwinPanel } from './TwinPanel';
import { TandemFeedView } from './TandemFeedView';
import { ActiveNowBar } from './ActiveNowBar';
import { BottomSheet } from '../shared/BottomSheet';
import type { TwinLabel, FeedType, FeedSide, FeedSegment, DiaperSubtype, FeedUnit } from '../../types';

export function HomeScreen() {
  const pair = useAppStore((s) => s.activePair);
  const timers = useAppStore((s) => s.activeTimers);
  const events = useAppStore((s) => s.recentEvents);

  const { logFeed, logDiaper, logNap } = useEvents();
  const { startTimer, stopTimer, switchSide } = useActiveTimers();

  const [activeTwin, setActiveTwin] = useState<TwinLabel>('A');
  const [tandemSheetOpen, setTandemSheetOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if both twins have active feed timers (tandem mode)
  const feedTimerA = useMemo(
    () => timers.find((t) => t.twin_label === 'A' && t.type === 'feed'),
    [timers],
  );
  const feedTimerB = useMemo(
    () => timers.find((t) => t.twin_label === 'B' && t.type === 'feed'),
    [timers],
  );
  const isTandemActive = !!feedTimerA && !!feedTimerB;

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
    async (twin: TwinLabel, feedType: FeedType, amount: number, unit: FeedUnit) => {
      try {
        await logFeed(twin, 'bottle', {
          feed_amount: amount,
          feed_unit: unit,
          feed_type: feedType,
        });
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [logFeed],
  );

  const handleStartBreast = useCallback(
    async (twin: TwinLabel, side: FeedSide) => {
      try {
        await startTimer(twin, 'feed', side);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [startTimer],
  );

  const handleStartTandem = useCallback(
    async (sideA: FeedSide, sideB: FeedSide) => {
      try {
        await Promise.all([
          startTimer('A', 'feed', sideA),
          startTimer('B', 'feed', sideB),
        ]);
        setTandemSheetOpen(false);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [startTimer],
  );

  const handleLogDiaper = useCallback(
    async (twin: TwinLabel, subtype: DiaperSubtype) => {
      try {
        await logDiaper(twin, subtype);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [logDiaper],
  );

  const handleToggleNap = useCallback(
    async (twin: TwinLabel) => {
      try {
        await startTimer(twin, 'nap');
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [startTimer],
  );

  const handleSwitchBreast = useCallback(
    async (timerId: string, newSide: FeedSide) => {
      try {
        await switchSide(timerId, newSide);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [switchSide],
  );

  const handleStopTimer = useCallback(
    async (timerId: string, _pausedMs?: number, segments?: FeedSegment[]) => {
      const timer = timers.find((t) => t.id === timerId);
      console.log('[handleStopTimer] timerId:', timerId, 'found:', !!timer, 'total timers:', timers.length);
      if (!timer) return;

      try {
        await stopTimer(timerId, {
          feed_mode: timer.type === 'feed' ? 'breast' : undefined,
          feed_segments: segments && segments.length > 1 ? segments : undefined,
        });
      } catch {
        // Error already surfaced via SyncErrorBanner
      }
    },
    [timers, stopTimer],
  );

  // Retro-log handlers
  const handleRetroLogBottle = useCallback(
    async (twin: TwinLabel, feedType: FeedType, amount: number, unit: FeedUnit, timestamp: string) => {
      try {
        await logFeed(twin, 'bottle', {
          feed_amount: amount,
          feed_unit: unit,
          feed_type: feedType,
          timestamp,
        });
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [logFeed],
  );

  const handleRetroLogDiaper = useCallback(
    async (twin: TwinLabel, subtype: DiaperSubtype, timestamp: string) => {
      try {
        await logDiaper(twin, subtype, timestamp);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [logDiaper],
  );

  const handleRetroLogNap = useCallback(
    async (twin: TwinLabel, napStart: string, napEnd: string) => {
      try {
        const durationMs = new Date(napEnd).getTime() - new Date(napStart).getTime();
        await logNap(twin, napStart, napEnd, durationMs);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [logNap],
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

  // If tandem feed is active, show the tandem view
  if (isTandemActive) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <TandemFeedView
          pair={pair}
          timerA={feedTimerA}
          timerB={feedTimerB}
          onStopTimer={handleStopTimer}
          onSwitchBreast={handleSwitchBreast}
        />
      </div>
    );
  }

  // Check if either twin already has a feed timer (can't start tandem)
  const anyFeedTimerActive = !!feedTimerA || !!feedTimerB;

  // Timers for the twin NOT currently shown on mobile
  const otherTwinTimers = timers.filter((t) => t.twin_label !== activeTwin);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Active timers on the other twin (mobile only) */}
      <div className="md:hidden">
        <ActiveNowBar
          timers={otherTwinTimers}
          pair={pair}
          onTapTimer={(label) => setActiveTwin(label)}
        />
      </div>

      {/* Tandem feed button — only when no feed timers are running */}
      {!anyFeedTimerActive && (
        <div className="px-3 pt-3 md:hidden">
          <button
            onClick={() => setTandemSheetOpen(true)}
            className="w-full min-h-[56px] rounded-2xl font-bold text-base
                       active:scale-[0.97] transition-all text-[#0F1117]
                       flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${twinAColor}, ${twinBColor})`,
            }}
          >
            <span className="text-xl">🤱</span>
            Tandem Feed
          </button>
        </div>
      )}

      {/* Twin selector tabs — mobile */}
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
            onSwitchBreast={handleSwitchBreast}
            onRetroLogBottle={handleRetroLogBottle}
            onRetroLogDiaper={handleRetroLogDiaper}
            onRetroLogNap={handleRetroLogNap}
          />
        </div>
      </div>

      {/* Tablet+: side by side with tandem button */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 p-3 gap-3">
        {!anyFeedTimerActive && (
          <button
            onClick={() => setTandemSheetOpen(true)}
            className="w-full min-h-[52px] rounded-2xl font-bold text-base
                       active:scale-[0.97] transition-all text-[#0F1117]
                       flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${twinAColor}, ${twinBColor})`,
            }}
          >
            <span className="text-xl">🤱</span>
            Tandem Feed
          </button>
        )}
        <div className="flex flex-1 min-h-0 gap-3">
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
              onSwitchBreast={handleSwitchBreast}
              onRetroLogBottle={handleRetroLogBottle}
              onRetroLogDiaper={handleRetroLogDiaper}
              onRetroLogNap={handleRetroLogNap}
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
              onSwitchBreast={handleSwitchBreast}
              onRetroLogBottle={handleRetroLogBottle}
              onRetroLogDiaper={handleRetroLogDiaper}
              onRetroLogNap={handleRetroLogNap}
            />
          </div>
        </div>
      </div>

      {/* Tandem feed setup sheet */}
      <TandemSetupSheet
        open={tandemSheetOpen}
        onClose={() => setTandemSheetOpen(false)}
        pair={pair}
        onStart={handleStartTandem}
      />
    </div>
  );
}

function TandemSetupSheet({
  open,
  onClose,
  pair,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  pair: { twin_a_name: string; twin_a_color: string; twin_b_name: string; twin_b_color: string };
  onStart: (sideA: FeedSide, sideB: FeedSide) => void;
}) {
  const [sideA, setSideA] = useState<FeedSide>('left');
  const [sideB, setSideB] = useState<FeedSide>('right');

  const sides: { value: FeedSide; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'both', label: 'Both' },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Start Tandem Feed">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-text-secondary">
          Choose which side for each twin, then start both timers together.
        </p>

        {/* Twin A side selection */}
        <div>
          <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">
            {pair.twin_a_name} — Side
          </p>
          <div className="flex gap-2">
            {sides.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSideA(value)}
                className={`flex-1 min-h-[56px] rounded-xl text-sm font-bold transition-all active:scale-95
                  ${sideA === value ? 'text-[#0F1117]' : 'bg-white/5 text-text-secondary'}`}
                style={sideA === value ? { backgroundColor: pair.twin_a_color } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Twin B side selection */}
        <div>
          <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">
            {pair.twin_b_name} — Side
          </p>
          <div className="flex gap-2">
            {sides.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSideB(value)}
                className={`flex-1 min-h-[56px] rounded-xl text-sm font-bold transition-all active:scale-95
                  ${sideB === value ? 'text-[#0F1117]' : 'bg-white/5 text-text-secondary'}`}
                style={sideB === value ? { backgroundColor: pair.twin_b_color } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart(sideA, sideB)}
          className="w-full min-h-[72px] rounded-2xl text-lg font-bold
                     active:scale-[0.97] transition-all text-[#0F1117]"
          style={{
            background: `linear-gradient(135deg, ${pair.twin_a_color}, ${pair.twin_b_color})`,
          }}
        >
          Start Both Timers
        </button>
      </div>
    </BottomSheet>
  );
}
