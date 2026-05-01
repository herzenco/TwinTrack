import { useState, useCallback, useRef, useEffect } from 'react';
import { formatDuration, elapsedMs } from '../../utils/time';
import type { TwinPair, ActiveTimer, FeedSide, FeedSegment } from '../../types';

interface TandemFeedViewProps {
  pair: TwinPair;
  timerA: ActiveTimer;
  timerB: ActiveTimer;
  onStopTimer: (timerId: string, pausedMs?: number, segments?: FeedSegment[]) => void;
  onSwitchBreast: (timerId: string, newSide: FeedSide) => void;
  onTogglePause: (timerId: string, pause: boolean) => void;
}

function getActiveElapsed(timer: ActiveTimer): number {
  const raw = elapsedMs(timer.started_at);
  let paused = timer.total_paused_ms ?? 0;
  if (timer.is_paused && timer.paused_at) {
    paused += Date.now() - new Date(timer.paused_at).getTime();
  }
  return Math.max(0, raw - paused);
}

function getTotalPausedMs(timer: ActiveTimer): number {
  let total = timer.total_paused_ms ?? 0;
  if (timer.is_paused && timer.paused_at) {
    total += Date.now() - new Date(timer.paused_at).getTime();
  }
  return total;
}

function TandemTimer({
  label,
  name,
  emoji,
  color,
  timer,
  onStop,
  onSwitch,
  onTogglePause,
}: {
  label: string;
  name: string;
  emoji: string;
  color: string;
  timer: ActiveTimer;
  onStop: (segments?: FeedSegment[]) => void;
  onSwitch: () => void;
  onTogglePause: () => void;
}) {
  const [elapsed, setElapsed] = useState(() => getActiveElapsed(timer));

  useEffect(() => {
    if (timer.is_paused) {
      setElapsed(getActiveElapsed(timer));
      return;
    }
    const interval = setInterval(() => {
      setElapsed(getActiveElapsed(timer));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

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
        {!timer.is_paused && (
          <div className="absolute inset-0 rounded-xl opacity-20 animate-pulse blur-lg"
            style={{ backgroundColor: color }} />
        )}
        <span
          className={`relative font-mono text-4xl font-bold tracking-wider
                     px-4 py-2 rounded-xl ${timer.is_paused ? 'opacity-40' : ''}`}
          style={{ color }}
        >
          {formatDuration(elapsed)}
        </span>
      </div>

      {timer.is_paused && (
        <span className="text-[10px] font-bold text-warning uppercase tracking-widest">Paused</span>
      )}

      {/* Pause / Resume */}
      <button
        onClick={onTogglePause}
        className={`w-full min-h-[52px] rounded-xl text-sm font-bold
                   active:scale-[0.97] transition-all
                   ${timer.is_paused
                     ? 'bg-success/15 text-success border border-success/20'
                     : 'bg-white/[0.06] text-text-secondary border border-white/[0.08]'
                   }`}
      >
        {timer.is_paused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* Switch side */}
      {timer.feed_side && timer.feed_side !== 'both' && (
        <button
          onClick={onSwitch}
          className="w-full min-h-[44px] rounded-xl text-xs font-bold
                     active:scale-[0.97] transition-all border border-dashed"
          style={{ borderColor: `${color}40`, color }}
        >
          Switch to {timer.feed_side === 'left' ? 'R →' : '← L'}
        </button>
      )}

      {/* Individual stop */}
      <button
        onClick={() => onStop()}
        className="w-full min-h-[44px] rounded-xl text-xs font-semibold
                   bg-white/[0.04] text-text-muted active:scale-[0.97] transition-all"
      >
        Stop {label} only
      </button>
    </div>
  );
}

function useTandemSegments(timer: ActiveTimer) {
  const segmentsRef = useRef<FeedSegment[]>([]);

  useEffect(() => {
    segmentsRef.current = [];
  }, [timer.id]);

  const switchSide = useCallback(() => {
    if (!timer.feed_side || timer.feed_side === 'both') return;
    const totalPaused = getTotalPausedMs(timer);
    const totalActiveMs = Date.now() - new Date(timer.started_at).getTime() - totalPaused;
    const previousMs = segmentsRef.current.reduce((s, seg) => s + seg.duration_ms, 0);
    const currentMs = Math.max(0, totalActiveMs - previousMs);
    segmentsRef.current.push({ side: timer.feed_side, duration_ms: currentMs });
  }, [timer]);

  const finalizeSegments = useCallback((): FeedSegment[] | undefined => {
    if (!timer.feed_side || timer.feed_side === 'both') return undefined;
    const totalPaused = getTotalPausedMs(timer);
    const totalActiveMs = Date.now() - new Date(timer.started_at).getTime() - totalPaused;
    const previousMs = segmentsRef.current.reduce((s, seg) => s + seg.duration_ms, 0);
    const currentMs = Math.max(0, totalActiveMs - previousMs);
    const all = [...segmentsRef.current, { side: timer.feed_side, duration_ms: currentMs }];
    return all.length > 1 ? all : undefined;
  }, [timer]);

  return { switchSide, finalizeSegments, segmentsRef };
}

export function TandemFeedView({ pair, timerA, timerB, onStopTimer, onSwitchBreast, onTogglePause }: TandemFeedViewProps) {
  const segA = useTandemSegments(timerA);
  const segB = useTandemSegments(timerB);

  const handlePauseBoth = useCallback(() => {
    if (!timerA.is_paused) onTogglePause(timerA.id, true);
    if (!timerB.is_paused) onTogglePause(timerB.id, true);
  }, [timerA, timerB, onTogglePause]);

  const handleResumeBoth = useCallback(() => {
    if (timerA.is_paused) onTogglePause(timerA.id, false);
    if (timerB.is_paused) onTogglePause(timerB.id, false);
  }, [timerA, timerB, onTogglePause]);

  const bothPaused = timerA.is_paused && timerB.is_paused;

  const handleStopBoth = useCallback(() => {
    onStopTimer(timerA.id, undefined, segA.finalizeSegments());
    onStopTimer(timerB.id, undefined, segB.finalizeSegments());
  }, [timerA, timerB, segA, segB, onStopTimer]);

  const handleSwitchA = useCallback(() => {
    if (!timerA.feed_side || timerA.feed_side === 'both') return;
    segA.switchSide();
    onSwitchBreast(timerA.id, timerA.feed_side === 'left' ? 'right' : 'left');
  }, [timerA, segA, onSwitchBreast]);

  const handleSwitchB = useCallback(() => {
    if (!timerB.feed_side || timerB.feed_side === 'both') return;
    segB.switchSide();
    onSwitchBreast(timerB.id, timerB.feed_side === 'left' ? 'right' : 'left');
  }, [timerB, segB, onSwitchBreast]);

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
          onStop={(segs) => onStopTimer(timerA.id, undefined, segs ?? segA.finalizeSegments())}
          onSwitch={handleSwitchA}
          onTogglePause={() => onTogglePause(timerA.id, !timerA.is_paused)}
        />
        <TandemTimer
          label={pair.twin_b_name}
          name={pair.twin_b_name}
          emoji={pair.twin_b_emoji}
          color={pair.twin_b_color}
          timer={timerB}
          onStop={(segs) => onStopTimer(timerB.id, undefined, segs ?? segB.finalizeSegments())}
          onSwitch={handleSwitchB}
          onTogglePause={() => onTogglePause(timerB.id, !timerB.is_paused)}
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
