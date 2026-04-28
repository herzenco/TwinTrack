import { useState, useEffect } from 'react';
import type { TwinLabel, TwinPair } from '../../types';
import { elapsedMs } from '../../utils/time';

interface FeedIntervalMonitorProps {
  label: TwinLabel;
  pair: TwinPair;
  lastFeedTimestamp: string | null;
}

type FeedState = 'green' | 'yellow' | 'red';

export function FeedIntervalMonitor({ label, pair, lastFeedTimestamp }: FeedIntervalMonitorProps) {
  const [elapsed, setElapsed] = useState(0);

  const isA = label === 'A';
  const name = isA ? pair.twin_a_name : pair.twin_b_name;
  const color = isA ? pair.twin_a_color : pair.twin_b_color;

  const intervalMin = (isA ? pair.twin_a_feed_interval_minutes : pair.twin_b_feed_interval_minutes) ?? pair.feed_interval_minutes;
  const intervalMs = intervalMin * 60 * 1000;
  const yellowThresholdMs = intervalMs - 30 * 60 * 1000; // 30 min before due

  useEffect(() => {
    if (!lastFeedTimestamp) return;
    function tick() {
      setElapsed(elapsedMs(lastFeedTimestamp!));
    }
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [lastFeedTimestamp]);

  if (!lastFeedTimestamp) {
    return (
      <div className="rounded-xl bg-bg-card/80 p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold" style={{ color }}>{name}</span>
        </div>
        <p className="text-xs text-text-muted">No feeds logged yet</p>
      </div>
    );
  }

  const progress = Math.min(elapsed / intervalMs, 1.5);
  const overdueMs = Math.max(0, elapsed - intervalMs);
  const overdueMin = Math.round(overdueMs / 60000);
  const remainingMs = Math.max(0, intervalMs - elapsed);
  const remainingMin = Math.ceil(remainingMs / 60000);

  const state: FeedState =
    elapsed >= intervalMs ? 'red' : elapsed >= yellowThresholdMs ? 'yellow' : 'green';

  const stateColors: Record<FeedState, string> = {
    green: '#4ADE80',
    yellow: '#FBBF24',
    red: '#F87171',
  };

  const barColor = stateColors[state];

  return (
    <div className="rounded-xl bg-bg-card/80 p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold" style={{ color }}>{name}</span>
        <span
          className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${barColor}20`, color: barColor }}
        >
          {state === 'red'
            ? `${overdueMin}min overdue`
            : state === 'yellow'
              ? `${remainingMin}min left`
              : 'On schedule'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${Math.min(progress * 100, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Info row */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-text-muted">
          Interval: {intervalMin / 60}h
        </span>
        {state === 'red' && (
          <span className="text-[10px] font-medium text-danger">
            {name} is {overdueMin} min overdue for a feed
          </span>
        )}
        {state !== 'red' && (
          <span className="text-[10px] text-text-muted">
            Next feed in ~{remainingMin}min
          </span>
        )}
      </div>
    </div>
  );
}
