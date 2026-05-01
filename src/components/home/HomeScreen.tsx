import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { useEvents } from '../../hooks/useEvents';
import { useActiveTimers } from '../../hooks/useActiveTimers';
import { TwinPanel } from './TwinPanel';
import { TandemFeedView } from './TandemFeedView';
import { ActiveNowBar } from './ActiveNowBar';
import { BottomSheet } from '../shared/BottomSheet';
import type { TwinLabel, FeedType, FeedSide, FeedSegment, DiaperSubtype, FeedUnit } from '../../types';
import { fmtOz } from '../../utils/formatters';

export function HomeScreen() {
  const pair = useAppStore((s) => s.activePair);
  const timers = useAppStore((s) => s.activeTimers);
  const events = useAppStore((s) => s.recentEvents);
  const pumpingSessions = useAppStore((s) => s.pumpingSessions);

  const { logFeed, logDiaper, logNap } = useEvents();
  const { startTimer, stopTimer, switchSide, togglePause } = useActiveTimers();

  const [activeTwin, setActiveTwin] = useState<TwinLabel>('A');
  const [tandemSheetOpen, setTandemSheetOpen] = useState(false);
  const [prevFeedBothOpen, setPrevFeedBothOpen] = useState(false);
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
    async (twin: TwinLabel, feedType: FeedType, amount: number, unit: FeedUnit, timestamp?: string) => {
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

  const handleTogglePause = useCallback(
    async (timerId: string, pause: boolean) => {
      try {
        await togglePause(timerId, pause);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [togglePause],
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
    async (timerId: string, _unused?: number, segments?: FeedSegment[]) => {
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

  const handleRetroLogBreast = useCallback(
    async (twin: TwinLabel, side: FeedSide, startTime: string, endTime: string) => {
      try {
        const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
        await logFeed(twin, 'breast', {
          feed_side: side,
          duration_ms: durationMs,
          timestamp: startTime,
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

  const handlePrevFeedBothBottle = useCallback(
    async (feedType: FeedType, amount: number, unit: FeedUnit, timestamp: string) => {
      try {
        await Promise.all([
          logFeed('A', 'bottle', { feed_amount: amount, feed_unit: unit, feed_type: feedType, timestamp }),
          logFeed('B', 'bottle', { feed_amount: amount, feed_unit: unit, feed_type: feedType, timestamp }),
        ]);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [logFeed],
  );

  const handlePrevFeedBothBreast = useCallback(
    async (sideA: FeedSide, sideB: FeedSide, startTime: string, endTime: string) => {
      try {
        const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
        await Promise.all([
          logFeed('A', 'breast', { feed_side: sideA, duration_ms: durationMs, timestamp: startTime }),
          logFeed('B', 'breast', { feed_side: sideB, duration_ms: durationMs, timestamp: startTime }),
        ]);
      } catch {
        // Error surfaced via SyncErrorBanner
      }
    },
    [logFeed],
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
          onTogglePause={handleTogglePause}
        />
      </div>
    );
  }

  // Check if either twin already has a feed timer (can't start tandem)
  const anyFeedTimerActive = !!feedTimerA || !!feedTimerB;

  // Pumping & BM balance for today
  const pumpBmSummary = useMemo(() => {
    const today = new Date().toDateString();
    const todayPumps = pumpingSessions.filter((s) => new Date(s.timestamp).toDateString() === today);
    const pumpedOz = todayPumps.reduce((sum, s) => sum + s.total_oz, 0);

    const todayEvents = events.filter((e) => new Date(e.timestamp).toDateString() === today);
    const bmBottleFedOz = todayEvents
      .filter((e) => e.type === 'feed' && e.feed_mode === 'bottle' && e.feed_type === 'breastmilk')
      .reduce((sum, e) => sum + (e.feed_amount ?? 0), 0);

    return { pumpedOz, bmBottleFedOz, estimatedRemaining: Math.max(0, pumpedOz - bmBottleFedOz) };
  }, [pumpingSessions, events]);

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

      {/* Tandem feed & previous feed both — only when no feed timers are running */}
      {!anyFeedTimerActive && (
        <div className="px-3 pt-3 flex gap-2 md:hidden">
          <button
            onClick={() => setTandemSheetOpen(true)}
            className="flex-1 min-h-[56px] rounded-2xl font-bold text-base
                       active:scale-[0.97] transition-all text-[#0F1117]
                       flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${twinAColor}, ${twinBColor})`,
            }}
          >
            <span className="text-xl">🤱</span>
            Tandem Feed
          </button>
          <button
            onClick={() => setPrevFeedBothOpen(true)}
            className="min-h-[56px] px-4 rounded-2xl font-bold text-sm
                       active:scale-[0.97] transition-all text-text-secondary
                       flex items-center justify-center gap-2
                       border border-dashed border-white/[0.15] bg-white/[0.04]"
          >
            <span className="text-lg">⏪</span>
            Both
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
        <div className="p-3 flex flex-col gap-3 min-h-full">
          {/* Breast Milk Today */}
          <div className="rounded-2xl bg-bg-card/60 border border-white/[0.06] px-4 py-3 flex items-center gap-4">
            <span className="text-xl">🤱</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide mb-1">Breast Milk Today</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-text-secondary">
                  Pumped: <span className="font-bold text-text-primary">{fmtOz(pumpBmSummary.pumpedOz)}oz</span>
                </span>
                <span className="text-text-secondary">
                  Fed: <span className="font-bold text-text-primary">{fmtOz(pumpBmSummary.bmBottleFedOz)}oz</span>
                </span>
                <span className="text-text-secondary">
                  Remaining: <span className="font-bold text-success">{fmtOz(pumpBmSummary.estimatedRemaining)}oz</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
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
              onTogglePause={handleTogglePause}
              onRetroLogBottle={handleRetroLogBottle}
              onRetroLogBreast={handleRetroLogBreast}
              onRetroLogDiaper={handleRetroLogDiaper}
              onRetroLogNap={handleRetroLogNap}
            />
          </div>
        </div>
      </div>

      {/* Tablet+: side by side with tandem button */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 p-3 gap-3 overflow-y-auto">
        {/* Breast Milk Today — tablet */}
        <div className="rounded-2xl bg-bg-card/60 border border-white/[0.06] px-4 py-3 flex items-center gap-4">
          <span className="text-xl">🤱</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide mb-1">Breast Milk Today</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-text-secondary">
                Pumped: <span className="font-bold text-text-primary">{fmtOz(pumpBmSummary.pumpedOz)}oz</span>
              </span>
              <span className="text-text-secondary">
                Fed: <span className="font-bold text-text-primary">{fmtOz(pumpBmSummary.bmBottleFedOz)}oz</span>
              </span>
              <span className="text-text-secondary">
                Remaining: <span className="font-bold text-success">{fmtOz(pumpBmSummary.estimatedRemaining)}oz</span>
              </span>
            </div>
          </div>
        </div>

        {!anyFeedTimerActive && (
          <div className="flex gap-3">
            <button
              onClick={() => setTandemSheetOpen(true)}
              className="flex-1 min-h-[52px] rounded-2xl font-bold text-base
                         active:scale-[0.97] transition-all text-[#0F1117]
                         flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${twinAColor}, ${twinBColor})`,
              }}
            >
              <span className="text-xl">🤱</span>
              Tandem Feed
            </button>
            <button
              onClick={() => setPrevFeedBothOpen(true)}
              className="min-h-[52px] px-5 rounded-2xl font-bold text-sm
                         active:scale-[0.97] transition-all text-text-secondary
                         flex items-center justify-center gap-2
                         border border-dashed border-white/[0.15] bg-white/[0.04]"
            >
              <span className="text-lg">⏪</span>
              Previous Feed — Both
            </button>
          </div>
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
              onTogglePause={handleTogglePause}
              onRetroLogBottle={handleRetroLogBottle}
              onRetroLogBreast={handleRetroLogBreast}
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
              onTogglePause={handleTogglePause}
              onRetroLogBottle={handleRetroLogBottle}
              onRetroLogBreast={handleRetroLogBreast}
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

      {/* Previous feed both twins */}
      <PreviousFeedBothSheet
        open={prevFeedBothOpen}
        onClose={() => setPrevFeedBothOpen(false)}
        pair={pair}
        onLogBottle={handlePrevFeedBothBottle}
        onLogBreast={handlePrevFeedBothBreast}
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

function PreviousFeedBothSheet({
  open,
  onClose,
  pair,
  onLogBottle,
  onLogBreast,
}: {
  open: boolean;
  onClose: () => void;
  pair: { twin_a_name: string; twin_a_color: string; twin_b_name: string; twin_b_color: string };
  onLogBottle: (feedType: FeedType, amount: number, unit: FeedUnit, timestamp: string) => void;
  onLogBreast: (sideA: FeedSide, sideB: FeedSide, startTime: string, endTime: string) => void;
}) {
  const [mode, setMode] = useState<'bottle' | 'breast' | null>(null);

  // Bottle state
  const [feedType, setFeedType] = useState<FeedType>('formula');
  const [amount, setAmount] = useState<number>(3);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Breast state
  const [sideA, setSideA] = useState<FeedSide>('left');
  const [sideB, setSideB] = useState<FeedSide>('right');
  const [durationMin, setDurationMin] = useState('');

  // Shared
  const [startTime, setStartTime] = useState(() => nowLocalStr());

  function nowLocalStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function resetAndClose() {
    setMode(null);
    setFeedType('formula');
    setAmount(3);
    setCustomAmount('');
    setShowCustom(false);
    setSideA('left');
    setSideB('right');
    setDurationMin('');
    setStartTime(nowLocalStr());
    onClose();
  }

  function handleLogBottle() {
    const finalAmount = showCustom ? parseFloat(customAmount) || 0 : amount;
    if (finalAmount <= 0) return;
    const ts = new Date(startTime).toISOString();
    onLogBottle(feedType, finalAmount, 'oz', ts);
    resetAndClose();
  }

  function handleLogBreast() {
    const dur = parseFloat(durationMin) || 0;
    if (dur <= 0) return;
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(new Date(startIso).getTime() + dur * 60000).toISOString();
    onLogBreast(sideA, sideB, startIso, endIso);
    resetAndClose();
  }

  const sides: { value: FeedSide; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'both', label: 'Both' },
  ];

  const PRESETS = [1, 2, 3, 4, 5, 6];

  return (
    <BottomSheet open={open} onClose={resetAndClose} title="Previous Feed — Both Twins">
      {/* Type selection */}
      {!mode && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">Log a past feed for both twins at once.</p>
          <button
            onClick={() => setMode('bottle')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🍼</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Bottle</p>
              <p className="text-sm text-text-secondary">Formula or breast milk</p>
            </div>
          </button>
          <button
            onClick={() => setMode('breast')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🤱</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Breast</p>
              <p className="text-sm text-text-secondary">Log a completed session for both</p>
            </div>
          </button>
        </div>
      )}

      {/* Bottle flow */}
      {mode === 'bottle' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setMode(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* When */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">When</p>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20
                         [color-scheme:dark]"
            />
          </div>

          {/* Feed type */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Type</p>
            <div className="flex gap-3">
              {(['formula', 'breastmilk'] as FeedType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFeedType(t)}
                  className={`flex-1 min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
                    ${feedType === t
                      ? 'text-[#0F1117] bg-white/80'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                >
                  {t === 'formula' ? 'Formula' : 'Breast Milk'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Amount (oz)</p>
            {!showCustom ? (
              <div className="grid grid-cols-4 gap-3">
                {PRESETS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
                      ${amount === a
                        ? 'text-[#0F1117] bg-white/80'
                        : 'bg-white/5 text-text-primary hover:bg-white/10'
                      }`}
                  >
                    {a}oz
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className="min-h-[56px] rounded-2xl text-base font-medium bg-white/5 text-text-secondary
                             hover:bg-white/10 active:scale-95 transition-all col-span-2"
                >
                  Custom...
                </button>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.0"
                  autoFocus
                  className="flex-1 min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary text-center
                             text-xl font-mono border border-white/10 focus:outline-none
                             focus:border-white/20 placeholder:text-text-muted"
                />
                <span className="text-base text-text-secondary font-medium">oz</span>
                <button
                  onClick={() => { setShowCustom(false); setCustomAmount(''); }}
                  className="text-sm text-text-muted hover:text-text-secondary px-3 py-2 min-h-[44px]"
                >
                  Presets
                </button>
              </div>
            )}
          </div>

          {/* Log button */}
          <button
            onClick={handleLogBottle}
            className="w-full min-h-[72px] rounded-2xl text-lg font-bold
                       active:scale-[0.97] transition-all text-[#0F1117]"
            style={{
              background: `linear-gradient(135deg, ${pair.twin_a_color}, ${pair.twin_b_color})`,
            }}
          >
            Log {showCustom ? customAmount || '0' : amount}oz for Both
          </button>
        </div>
      )}

      {/* Breast flow */}
      {mode === 'breast' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setMode(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* When */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Started at</p>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20
                         [color-scheme:dark]"
            />
          </div>

          {/* Twin A side */}
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

          {/* Twin B side */}
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

          {/* Duration */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Duration (minutes)</p>
            <div className="grid grid-cols-4 gap-3">
              {[5, 10, 15, 20, 25, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationMin(String(d))}
                  className={`min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
                    ${durationMin === String(d)
                      ? 'text-[#0F1117] bg-white/80'
                      : 'bg-white/5 text-text-primary hover:bg-white/10'
                    }`}
                >
                  {d}m
                </button>
              ))}
              <div className="col-span-2 flex gap-2 items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  value={[5, 10, 15, 20, 25, 30].includes(Number(durationMin)) ? '' : durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder="Custom"
                  className="flex-1 min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary text-center
                             text-base font-mono border border-white/10 focus:outline-none
                             focus:border-white/20 placeholder:text-text-muted"
                />
                <span className="text-sm text-text-secondary font-medium">min</span>
              </div>
            </div>
          </div>

          {/* Duration preview */}
          {parseFloat(durationMin) > 0 && (
            <p className="text-center text-text-secondary text-sm">
              Duration: <span className="font-bold text-text-primary">
                {parseFloat(durationMin) >= 60
                  ? `${Math.floor(parseFloat(durationMin) / 60)}h ${Math.round(parseFloat(durationMin) % 60)}m`
                  : `${durationMin}min`}
              </span>
            </p>
          )}

          {/* Log button */}
          <button
            onClick={handleLogBreast}
            disabled={!durationMin || parseFloat(durationMin) <= 0}
            className="w-full min-h-[72px] rounded-2xl text-lg font-bold
                       active:scale-[0.97] transition-all text-[#0F1117]
                       disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${pair.twin_a_color}, ${pair.twin_b_color})`,
            }}
          >
            Log Breast Feed for Both
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
