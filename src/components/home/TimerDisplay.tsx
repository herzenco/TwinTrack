import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDuration, elapsedMs } from '../../utils/time';

interface TimerDisplayProps {
  startedAt: string;
  type: 'feed' | 'nap';
  twinColor: string;
  label?: string;
  onPausedTimeChange?: (pausedMs: number) => void;
}

export function TimerDisplay({ startedAt, type, twinColor, label, onPausedTimeChange }: TimerDisplayProps) {
  const [paused, setPaused] = useState(false);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [displayElapsed, setDisplayElapsed] = useState(() => elapsedMs(startedAt));
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setDisplayElapsed(elapsedMs(startedAt) - totalPausedMs);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, paused, totalPausedMs]);

  const handleTogglePause = useCallback(() => {
    if (paused) {
      // Resuming — add pause duration to total
      const pauseDuration = pauseStartRef.current ? Date.now() - pauseStartRef.current : 0;
      const newTotal = totalPausedMs + pauseDuration;
      setTotalPausedMs(newTotal);
      pauseStartRef.current = null;
      setPaused(false);
      onPausedTimeChange?.(newTotal);
    } else {
      // Pausing
      pauseStartRef.current = Date.now();
      setPaused(true);
    }
  }, [paused, totalPausedMs, onPausedTimeChange]);

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
        {!paused && (
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
                     ${paused ? 'opacity-50' : ''}`}
          style={{ color: twinColor }}
        >
          {timeString}
        </span>
      </div>

      {/* Pause indicator */}
      {paused && (
        <span className="text-xs font-semibold text-warning uppercase tracking-wider">
          Paused
        </span>
      )}

      {/* Pause / Resume button */}
      {type === 'feed' && (
        <button
          onClick={handleTogglePause}
          className={`w-full min-h-[60px] rounded-2xl text-base font-bold
                     active:scale-[0.97] transition-all
                     ${paused
                       ? 'bg-success/15 text-success border border-success/20'
                       : 'bg-white/[0.06] text-text-secondary border border-white/[0.08]'
                     }`}
        >
          {paused ? '▶  Resume' : '⏸  Pause'}
        </button>
      )}
    </div>
  );
}
