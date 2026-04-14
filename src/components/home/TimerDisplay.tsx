import { useState, useEffect } from 'react';
import { formatDuration, elapsedMs } from '../../utils/time';

interface TimerDisplayProps {
  startedAt: string;
  type: 'feed' | 'nap';
  twinColor: string;
  label?: string;
}

export function TimerDisplay({ startedAt, type, twinColor, label }: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState(() => elapsedMs(startedAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(elapsedMs(startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const typeIcon = type === 'feed' ? '🍼' : '😴';
  const timeString = formatDuration(elapsed);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {label && (
        <span className="text-sm font-semibold text-text-secondary tracking-wide uppercase">
          {typeIcon} {label}
        </span>
      )}
      <div className="relative flex items-center justify-center w-full py-4">
        {/* Large pulsing glow */}
        <div
          className="absolute inset-x-4 inset-y-0 rounded-2xl opacity-25 animate-pulse blur-xl"
          style={{ backgroundColor: twinColor }}
        />
        <div
          className="absolute inset-x-8 inset-y-2 rounded-2xl opacity-15 animate-pulse blur-md"
          style={{ backgroundColor: twinColor }}
        />
        <span
          className="relative font-mono text-5xl md:text-4xl font-bold tracking-wider
                     px-6 py-4 rounded-2xl border border-white/10"
          style={{ color: twinColor }}
        >
          {timeString}
        </span>
      </div>
    </div>
  );
}
