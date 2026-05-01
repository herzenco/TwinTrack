import { useState, useEffect, useCallback } from 'react';
import { formatDuration, elapsedMs } from '../../utils/time';

interface TimerDisplayProps {
  startedAt: string;
  type: 'feed' | 'nap';
  twinColor: string;
  label?: string;
  isPaused: boolean;
  totalPausedMs: number;
  pausedAt: string | null;
  onTogglePause: () => void;
}

export function TimerDisplay({
  startedAt,
  type,
  twinColor,
  label,
  isPaused,
  totalPausedMs,
  pausedAt,
  onTogglePause,
}: TimerDisplayProps) {
  const getActiveElapsed = useCallback(() => {
    const raw = elapsedMs(startedAt);
    let paused = totalPausedMs;
    if (isPaused && pausedAt) {
      paused += Date.now() - new Date(pausedAt).getTime();
    }
    return Math.max(0, raw - paused);
  }, [startedAt, isPaused, totalPausedMs, pausedAt]);

  const [displayElapsed, setDisplayElapsed] = useState(getActiveElapsed);

  useEffect(() => {
    if (isPaused) {
      // Update once to show frozen value
      setDisplayElapsed(getActiveElapsed());
      return;
    }

    const interval = setInterval(() => {
      setDisplayElapsed(getActiveElapsed());
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, getActiveElapsed]);

  const typeIcon = type === 'feed' ? '🍼' : '😴';
  const timeString = formatDuration(displayElapsed);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {label && (
        <span className="text-sm font-semibold text-text-secondary tracking-wide uppercase">
          {typeIcon} {label}
        </span>
      )}
      <div className="relative flex items-center justify-center w-full py-4">
        {/* Pulsing glow — stops when paused */}
        {!isPaused && (
          <>
            <div
              className="absolute inset-x-4 inset-y-0 rounded-2xl opacity-25 animate-pulse blur-xl"
              style={{ backgroundColor: twinColor }}
            />
            <div
              className="absolute inset-x-8 inset-y-2 rounded-2xl opacity-15 animate-pulse blur-md"
              style={{ backgroundColor: twinColor }}
            />
          </>
        )}
        <span
          className={`relative font-mono text-5xl md:text-4xl font-bold tracking-wider
                     px-6 py-4 rounded-2xl border border-white/10
                     ${isPaused ? 'opacity-50' : ''}`}
          style={{ color: twinColor }}
        >
          {timeString}
        </span>
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <span className="text-xs font-semibold text-warning uppercase tracking-wider">
          Paused
        </span>
      )}

      {/* Pause / Resume button */}
      {type === 'feed' && (
        <button
          onClick={onTogglePause}
          className={`w-full min-h-[60px] rounded-2xl text-base font-bold
                     active:scale-[0.97] transition-all
                     ${isPaused
                       ? 'bg-success/15 text-success border border-success/20'
                       : 'bg-white/[0.06] text-text-secondary border border-white/[0.08]'
                     }`}
        >
          {isPaused ? '▶  Resume' : '⏸  Pause'}
        </button>
      )}
    </div>
  );
}
