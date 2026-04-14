import type { DashboardSummary, TwinPair, TwinLabel, ActiveTimer } from '../../types';
import { formatTimeAgo } from '../../utils/time';

interface SummaryCardProps {
  label: TwinLabel;
  pair: TwinPair;
  summary: DashboardSummary | null;
  lastFeedTimestamp: string | null;
  lastDiaperTimestamp: string | null;
  lastNapTimestamp: string | null;
  activeTimer: ActiveTimer | null;
}

export function SummaryCard({
  label,
  pair,
  summary,
  lastFeedTimestamp,
  lastDiaperTimestamp,
  lastNapTimestamp,
  activeTimer,
}: SummaryCardProps) {
  const isA = label === 'A';
  const name = isA ? pair.twin_a_name : pair.twin_b_name;
  const color = isA ? pair.twin_a_color : pair.twin_b_color;
  const emoji = isA ? pair.twin_a_emoji : pair.twin_b_emoji;

  const napHours = summary ? Math.floor(summary.nap_minutes / 60) : 0;
  const napMin = summary ? summary.nap_minutes % 60 : 0;

  return (
    <div
      className="rounded-2xl bg-bg-card/80 border p-4"
      style={{ borderColor: `${color}25` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{emoji}</span>
        <h3 className="text-sm font-bold" style={{ color }}>{name}</h3>
        {activeTimer && (
          <span
            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {activeTimer.type === 'feed' ? '🍼 Feeding' : '😴 Napping'}
          </span>
        )}
      </div>

      {/* 24h Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary">{summary?.feed_count ?? '--'}</p>
          <p className="text-[10px] text-text-secondary font-medium">Feeds</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary">{summary?.diaper_count ?? '--'}</p>
          <p className="text-[10px] text-text-secondary font-medium">Diapers</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary">
            {summary ? `${napHours}h${napMin > 0 ? ` ${napMin}m` : ''}` : '--'}
          </p>
          <p className="text-[10px] text-text-secondary font-medium">Nap Time</p>
        </div>
      </div>

      {/* Time since last */}
      <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Last feed</span>
          <span className="text-xs text-text-secondary font-medium">
            {lastFeedTimestamp ? formatTimeAgo(lastFeedTimestamp) : 'None'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Last diaper</span>
          <span className="text-xs text-text-secondary font-medium">
            {lastDiaperTimestamp ? formatTimeAgo(lastDiaperTimestamp) : 'None'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Last nap</span>
          <span className="text-xs text-text-secondary font-medium">
            {lastNapTimestamp ? formatTimeAgo(lastNapTimestamp) : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
}
