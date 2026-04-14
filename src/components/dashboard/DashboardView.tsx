import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { SummaryCard } from './SummaryCard';
import { FeedIntervalMonitor } from './FeedIntervalMonitor';
import { TimelineView } from './TimelineView';
import { ActivityLog } from './ActivityLog';
import { DailySummary } from './DailySummary';
import type { DashboardSummary } from '../../types';

type DashboardTab = 'overview' | 'timeline' | 'activity' | 'daily';

const TABS: { key: DashboardTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'activity', label: 'Activity' },
  { key: 'daily', label: 'Daily' },
];

export function DashboardView() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const pair = useAppStore((s) => s.activePair);
  const events = useAppStore((s) => s.recentEvents);
  const timers = useAppStore((s) => s.activeTimers);
  const members = useAppStore((s) => s.pairMembers);

  // TODO: fetch from get_dashboard_summary RPC
  const summaryA: DashboardSummary | null = useMemo(() => {
    if (!pair) return null;
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const dayEvents = events.filter(
      (e) => e.twin_label === 'A' && new Date(e.timestamp).getTime() > dayAgo,
    );
    return {
      twin_label: 'A',
      feed_count: dayEvents.filter((e) => e.type === 'feed').length,
      diaper_count: dayEvents.filter((e) => e.type === 'diaper').length,
      nap_minutes: dayEvents
        .filter((e) => e.type === 'nap' && e.duration_ms)
        .reduce((sum, e) => sum + Math.round((e.duration_ms ?? 0) / 60000), 0),
    };
  }, [events, pair]);

  const summaryB: DashboardSummary | null = useMemo(() => {
    if (!pair) return null;
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const dayEvents = events.filter(
      (e) => e.twin_label === 'B' && new Date(e.timestamp).getTime() > dayAgo,
    );
    return {
      twin_label: 'B',
      feed_count: dayEvents.filter((e) => e.type === 'feed').length,
      diaper_count: dayEvents.filter((e) => e.type === 'diaper').length,
      nap_minutes: dayEvents
        .filter((e) => e.type === 'nap' && e.duration_ms)
        .reduce((sum, e) => sum + Math.round((e.duration_ms ?? 0) / 60000), 0),
    };
  }, [events, pair]);

  const lastFeedA = events.find((e) => e.twin_label === 'A' && e.type === 'feed')?.timestamp ?? null;
  const lastFeedB = events.find((e) => e.twin_label === 'B' && e.type === 'feed')?.timestamp ?? null;
  const lastDiaperA = events.find((e) => e.twin_label === 'A' && e.type === 'diaper')?.timestamp ?? null;
  const lastDiaperB = events.find((e) => e.twin_label === 'B' && e.type === 'diaper')?.timestamp ?? null;
  const lastNapA = events.find((e) => e.twin_label === 'A' && e.type === 'nap')?.timestamp ?? null;
  const lastNapB = events.find((e) => e.twin_label === 'B' && e.type === 'nap')?.timestamp ?? null;

  const activeFeedTimerA = timers.find((t) => t.twin_label === 'A' && t.type === 'feed') ?? null;
  const activeFeedTimerB = timers.find((t) => t.twin_label === 'B' && t.type === 'feed') ?? null;

  const caregiverNames = useMemo(
    () => [...new Set(members.map((m) => m.display_name))],
    [members],
  );

  if (!pair) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-text-primary">Dashboard</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-bg-secondary rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeTab === tab.key
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
            <SummaryCard
              label="A"
              pair={pair}
              summary={summaryA}
              lastFeedTimestamp={lastFeedA}
              lastDiaperTimestamp={lastDiaperA}
              lastNapTimestamp={lastNapA}
              activeTimer={activeFeedTimerA}
            />
            <SummaryCard
              label="B"
              pair={pair}
              summary={summaryB}
              lastFeedTimestamp={lastFeedB}
              lastDiaperTimestamp={lastDiaperB}
              lastNapTimestamp={lastNapB}
              activeTimer={activeFeedTimerB}
            />
          </div>

          {/* Feed interval monitors */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-secondary">Feed Interval</h2>
            <FeedIntervalMonitor label="A" pair={pair} lastFeedTimestamp={lastFeedA} />
            <FeedIntervalMonitor label="B" pair={pair} lastFeedTimestamp={lastFeedB} />
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <TimelineView events={events} pair={pair} />
      )}

      {activeTab === 'activity' && (
        <ActivityLog events={events} pair={pair} caregivers={caregiverNames} />
      )}

      {activeTab === 'daily' && (
        <DailySummary events={events} pair={pair} />
      )}
    </div>
  );
}
