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
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs font-medium text-text-secondary">{typeIcon} {label}</span>
      )}
      <div
        className="relative flex items-center justify-center"
      >
        {/* Pulsing glow ring */}
        <div
          className="absolute inset-0 rounded-xl opacity-30 animate-pulse blur-md"
          style={{ backgroundColor: twinColor }}
        />
        <span
          className="relative font-mono text-3xl font-bold tracking-wider px-4 py-2
                     rounded-xl border border-white/10"
          style={{ color: twinColor }}
        >
          {timeString}
        </span>
      </div>
    </div>
  );
}
