import { useState, useCallback, useRef } from 'react';
import { formatDuration, elapsedMs } from '../../utils/time';
import type { TwinPair, ActiveTimer } from '../../types';

interface TandemFeedViewProps {
  pair: TwinPair;
  timerA: ActiveTimer;
  timerB: ActiveTimer;
  onStopTimer: (timerId: string, pausedMs?: number) => void;
}

function usePausableTimer(startedAt: string) {
  const [paused, setPaused] = useState(false);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const pauseStartRef = useRef<number | null>(null);

  const getElapsed = useCallback(() => {
    const raw = elapsedMs(startedAt);
    const currentPause = paused && pauseStartRef.current ? Date.now() - pauseStartRef.current : 0;
    return raw - totalPausedMs - currentPause;
  }, [startedAt, paused, totalPausedMs]);

  const togglePause = useCallback(() => {
    if (paused) {
      const pauseDuration = pauseStartRef.current ? Date.now() - pauseStartRef.current : 0;
      setTotalPausedMs((prev) => prev + pauseDuration);
      pauseStartRef.current = null;
      setPaused(false);
    } else {
      pauseStartRef.current = Date.now();
      setPaused(true);
    }
  }, [paused]);

  const getTotalPausedMs = useCallback(() => {
    const currentPause = paused && pauseStartRef.current ? Date.now() - pauseStartRef.current : 0;
    return totalPausedMs + currentPause;
  }, [paused, totalPausedMs]);

  return { paused, getElapsed, togglePause, getTotalPausedMs };
}

function TandemTimer({
  label,
  name,
  emoji,
  color,
  timer,
  pauseState,
  onStop,
}: {
  label: string;
  name: string;
  emoji: string;
  color: string;
  timer: ActiveTimer;
  pauseState: ReturnType<typeof usePausableTimer>;
  onStop: () => void;
}) {
  const [elapsed, setElapsed] = useState(pauseState.getElapsed());

  // Tick
  useState(() => {
    const interval = setInterval(() => {
      if (!pauseState.paused) {
        setElapsed(pauseState.getElapsed());
      }
    }, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div
      className="flex-1 flex flex-col items-center gap-3 rounded-2xl p-4 border"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-sm font-bold" style={{ color }}>{name}</span>
        {timer.feed_side && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}>
            {timer.feed_side.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Timer */}
      <div className="relative">
        {!pauseState.paused && (
          <div className="absolute inset-0 rounded-xl opacity-20 animate-pulse blur-lg"
            style={{ backgroundColor: color }} />
        )}
        <span
          className={`relative font-mono text-4xl font-bold tracking-wider
                     px-4 py-2 rounded-xl ${pauseState.paused ? 'opacity-40' : ''}`}
          style={{ color }}
        >
          {formatDuration(elapsed)}
        </span>
      </div>

      {pauseState.paused && (
        <span className="text-[10px] font-bold text-warning uppercase tracking-widest">Paused</span>
      )}

      {/* Pause / Resume */}
      <button
        onClick={pauseState.togglePause}
        className={`w-full min-h-[52px] rounded-xl text-sm font-bold
                   active:scale-[0.97] transition-all
                   ${pauseState.paused
                     ? 'bg-success/15 text-success border border-success/20'
                     : 'bg-white/[0.06] text-text-secondary border border-white/[0.08]'
                   }`}
      >
        {pauseState.paused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* Individual stop */}
      <button
        onClick={onStop}
        className="w-full min-h-[44px] rounded-xl text-xs font-semibold
                   bg-white/[0.04] text-text-muted active:scale-[0.97] transition-all"
      >
        Stop {label} only
      </button>
    </div>
  );
}

export function TandemFeedView({ pair, timerA, timerB, onStopTimer }: TandemFeedViewProps) {
  const pauseA = usePausableTimer(timerA.started_at);
  const pauseB = usePausableTimer(timerB.started_at);

  const handlePauseBoth = useCallback(() => {
    if (!pauseA.paused) pauseA.togglePause();
    if (!pauseB.paused) pauseB.togglePause();
  }, [pauseA, pauseB]);

  const handleResumeBoth = useCallback(() => {
    if (pauseA.paused) pauseA.togglePause();
    if (pauseB.paused) pauseB.togglePause();
  }, [pauseA, pauseB]);

  const bothPaused = pauseA.paused && pauseB.paused;

  const handleStopBoth = useCallback(() => {
    onStopTimer(timerA.id, pauseA.getTotalPausedMs());
    onStopTimer(timerB.id, pauseB.getTotalPausedMs());
  }, [timerA, timerB, pauseA, pauseB, onStopTimer]);

  return (
    <div className="flex flex-col h-full px-3 py-3 gap-3">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-text-primary">🤱 Tandem Feed</h2>
        <p className="text-xs text-text-muted mt-1">Both twins feeding simultaneously</p>
      </div>

      {/* Two timers side by side */}
      <div className="flex gap-3 flex-1 min-h-0">
        <TandemTimer
          label={pair.twin_a_name}
          name={pair.twin_a_name}
          emoji={pair.twin_a_emoji}
          color={pair.twin_a_color}
          timer={timerA}
          pauseState={pauseA}
          onStop={() => onStopTimer(timerA.id, pauseA.getTotalPausedMs())}
        />
        <TandemTimer
          label={pair.twin_b_name}
          name={pair.twin_b_name}
          emoji={pair.twin_b_emoji}
          color={pair.twin_b_color}
          timer={timerB}
          pauseState={pauseB}
          onStop={() => onStopTimer(timerB.id, pauseB.getTotalPausedMs())}
        />
      </div>

      {/* Global controls */}
      <div className="flex flex-col gap-2.5 mt-auto">
        <button
          onClick={bothPaused ? handleResumeBoth : handlePauseBoth}
          className={`w-full min-h-[64px] rounded-2xl text-base font-bold
                     active:scale-[0.97] transition-all
                     ${bothPaused
                       ? 'bg-success/15 text-success border-2 border-success/25'
                       : 'bg-white/[0.06] text-text-secondary border-2 border-white/[0.08]'
                     }`}
        >
          {bothPaused ? '▶  Resume Both' : '⏸  Pause Both'}
        </button>

        <button
          onClick={handleStopBoth}
          className="w-full min-h-[72px] rounded-2xl text-lg font-bold
                     active:scale-[0.97] transition-all
                     bg-gradient-to-r text-[#0F1117]"
          style={{
            background: `linear-gradient(135deg, ${pair.twin_a_color}, ${pair.twin_b_color})`,
          }}
        >
          Stop Both Feeds
        </button>
      </div>
    </div>
  );
}
