import { useState, useEffect } from 'react';
import { formatDuration, elapsedMs } from '../../utils/time';
import type { ActiveTimer, TwinPair } from '../../types';

interface ActiveNowBarProps {
  timers: ActiveTimer[];
  pair: TwinPair;
  onTapTimer?: (twinLabel: 'A' | 'B') => void;
}

function LiveClock({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => elapsedMs(startedAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(elapsedMs(startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono font-bold">{formatDuration(elapsed)}</span>;
}

export function ActiveNowBar({ timers, pair, onTapTimer }: ActiveNowBarProps) {
  if (timers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-3 pt-3">
      {timers.map((timer) => {
        const isA = timer.twin_label === 'A';
        const name = isA ? pair.twin_a_name : pair.twin_b_name;
        const color = isA ? pair.twin_a_color : pair.twin_b_color;
        const emoji = isA ? pair.twin_a_emoji : pair.twin_b_emoji;
        const typeIcon = timer.type === 'feed' ? '🍼' : '😴';
        const typeLabel = timer.type === 'feed'
          ? `Feeding${timer.feed_side ? ` (${timer.feed_side.charAt(0).toUpperCase()})` : ''}`
          : 'Napping';

        return (
          <button
            key={timer.id}
            onClick={() => onTapTimer?.(timer.twin_label)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl
                       active:scale-[0.98] transition-all border"
            style={{
              backgroundColor: `${color}10`,
              borderColor: `${color}25`,
            }}
          >
            <span className="text-lg">{emoji}</span>
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="text-sm font-bold truncate" style={{ color }}>
                {name}
              </span>
              <span className="text-xs text-text-muted">
                {typeIcon} {typeLabel} — started by {timer.started_by_name}
              </span>
            </div>
            <div style={{ color }}>
              <LiveClock startedAt={timer.started_at} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
