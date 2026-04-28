import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { TwinLabel, TwinPair, ActiveTimer, TrackedEvent, FeedType, FeedSide, FeedSegment, DiaperSubtype } from '../../types';
import { TimerDisplay } from './TimerDisplay';
import { ActionButton } from './ActionButton';
import { FeedModal } from './FeedModal';
import { RetroLogModal } from './RetroLogModal';
import { NudgeBanner } from './NudgeBanner';
import { formatTime } from '../../utils/time';
import { fmtOz } from '../../utils/formatters';

interface TwinPanelProps {
  label: TwinLabel;
  pair: TwinPair;
  timers: ActiveTimer[];
  events: TrackedEvent[];
  onLogBottle: (twin: TwinLabel, feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp?: string) => void;
  onStartBreast: (twin: TwinLabel, side: FeedSide) => void;
  onLogDiaper: (twin: TwinLabel, subtype: DiaperSubtype) => void;
  onToggleNap: (twin: TwinLabel) => void;
  onStopTimer: (timerId: string, pausedMs?: number, segments?: FeedSegment[]) => void;
  onSwitchBreast: (timerId: string, newSide: FeedSide) => void;
  onRetroLogBottle: (twin: TwinLabel, feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp: string) => void;
  onRetroLogBreast: (twin: TwinLabel, side: FeedSide, startTime: string, endTime: string) => void;
  onRetroLogDiaper: (twin: TwinLabel, subtype: DiaperSubtype, timestamp: string) => void;
  onRetroLogNap: (twin: TwinLabel, napStart: string, napEnd: string) => void;
}

function getNextFeedTime(lastFeedTimestamp: string, intervalMinutes: number): { time: string; overdue: boolean; diffMin: number } {
  const nextFeed = new Date(new Date(lastFeedTimestamp).getTime() + intervalMinutes * 60000);
  const now = Date.now();
  const diffMin = Math.round((nextFeed.getTime() - now) / 60000);
  return {
    time: formatTime(nextFeed.toISOString()),
    overdue: diffMin < 0,
    diffMin,
  };
}

function getFeedSchedule(
  lastFeedTimestamp: string,
  intervalMinutes: number,
  count: number,
): { time: string; diffMin: number; overdue: boolean }[] {
  const baseMs = new Date(lastFeedTimestamp).getTime();
  const intervalMs = intervalMinutes * 60000;
  const now = Date.now();
  const schedule: { time: string; diffMin: number; overdue: boolean }[] = [];
  for (let i = 1; i <= count; i++) {
    const feedMs = baseMs + intervalMs * i;
    const diffMin = Math.round((feedMs - now) / 60000);
    schedule.push({
      time: formatTime(new Date(feedMs).toISOString()),
      diffMin,
      overdue: diffMin < 0,
    });
  }
  return schedule;
}

export function TwinPanel({
  label,
  pair,
  timers,
  events,
  onLogBottle,
  onStartBreast,
  onLogDiaper,
  onToggleNap,
  onStopTimer,
  onSwitchBreast,
  onRetroLogBottle,
  onRetroLogBreast,
  onRetroLogDiaper,
  onRetroLogNap,
}: TwinPanelProps) {
  const [feedModalOpen, setFeedModalOpen] = useState(false);
  const [retroModalOpen, setRetroModalOpen] = useState(false);
  const feedPausedMsRef = useRef(0);
  const segmentsRef = useRef<FeedSegment[]>([]);
  const feedIsPausedRef = useRef(false);
  const feedPauseStartRef = useRef<number | null>(null);

  const isA = label === 'A';
  const name = isA ? pair.twin_a_name : pair.twin_b_name;
  const color = isA ? pair.twin_a_color : pair.twin_b_color;
  const emoji = isA ? pair.twin_a_emoji : pair.twin_b_emoji;

  const feedTimer = timers.find((t) => t.twin_label === label && t.type === 'feed');
  const napTimer = timers.find((t) => t.twin_label === label && t.type === 'nap');
  const hasActiveTimer = !!feedTimer || !!napTimer;

  const lastFeed = useMemo(
    () => events.find((e) => e.twin_label === label && e.type === 'feed'),
    [events, label],
  );
  const lastDiaper = useMemo(
    () => events.find((e) => e.twin_label === label && e.type === 'diaper'),
    [events, label],
  );

  const lastBreastSide = useMemo(() => {
    const breastFeed = events.find(
      (e) => e.twin_label === label && e.type === 'feed' && e.feed_mode === 'breast' && e.feed_side,
    );
    return breastFeed?.feed_side ?? null;
  }, [events, label]);

  const feedIntervalMin = (isA ? pair.twin_a_feed_interval_minutes : pair.twin_b_feed_interval_minutes) ?? pair.feed_interval_minutes;

  const nextFeed = useMemo(() => {
    if (!lastFeed) return null;
    return getNextFeedTime(lastFeed.timestamp, feedIntervalMin);
  }, [lastFeed, feedIntervalMin]);

  const feedSchedule = useMemo(() => {
    if (!lastFeed) return [];
    return getFeedSchedule(lastFeed.timestamp, feedIntervalMin, 4);
  }, [lastFeed, feedIntervalMin]);

  const handleLogBottle = useCallback(
    (feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp?: string) => {
      onLogBottle(label, feedType, amount, unit, timestamp);
    },
    [label, onLogBottle],
  );

  const handleRetroLogBottle = useCallback(
    (feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp: string) => {
      onRetroLogBottle(label, feedType, amount, unit, timestamp);
    },
    [label, onRetroLogBottle],
  );

  const handleRetroLogBreast = useCallback(
    (side: FeedSide, startTime: string, endTime: string) => {
      onRetroLogBreast(label, side, startTime, endTime);
    },
    [label, onRetroLogBreast],
  );

  const handleRetroLogDiaper = useCallback(
    (subtype: DiaperSubtype, timestamp: string) => {
      onRetroLogDiaper(label, subtype, timestamp);
    },
    [label, onRetroLogDiaper],
  );

  const handleRetroLogNap = useCallback(
    (napStart: string, napEnd: string) => {
      onRetroLogNap(label, napStart, napEnd);
    },
    [label, onRetroLogNap],
  );

  const handleStartBreast = useCallback(
    (side: FeedSide) => {
      onStartBreast(label, side);
    },
    [label, onStartBreast],
  );

  // Reset segment tracking when a new feed timer starts
  useEffect(() => {
    segmentsRef.current = [];
    feedPausedMsRef.current = 0;
    feedIsPausedRef.current = false;
    feedPauseStartRef.current = null;
  }, [feedTimer?.id]);

  const getCurrentTotalPausedMs = useCallback(() => {
    let total = feedPausedMsRef.current;
    if (feedIsPausedRef.current && feedPauseStartRef.current) {
      total += Date.now() - feedPauseStartRef.current;
    }
    return total;
  }, []);

  const handleSwitchSide = useCallback(() => {
    if (!feedTimer || !feedTimer.feed_side || feedTimer.feed_side === 'both') return;
    const totalPausedMs = getCurrentTotalPausedMs();
    const totalActiveMs = Date.now() - new Date(feedTimer.started_at).getTime() - totalPausedMs;
    const previousMs = segmentsRef.current.reduce((s, seg) => s + seg.duration_ms, 0);
    const currentMs = Math.max(0, totalActiveMs - previousMs);
    segmentsRef.current.push({ side: feedTimer.feed_side, duration_ms: currentMs });
    const newSide: FeedSide = feedTimer.feed_side === 'left' ? 'right' : 'left';
    onSwitchBreast(feedTimer.id, newSide);
  }, [feedTimer, getCurrentTotalPausedMs, onSwitchBreast]);

  const handleStopFeed = useCallback(() => {
    if (!feedTimer) return;
    // Finalize the current segment
    let segments: FeedSegment[] | undefined;
    if (feedTimer.feed_side && feedTimer.feed_side !== 'both') {
      const totalPausedMs = getCurrentTotalPausedMs();
      const totalActiveMs = Date.now() - new Date(feedTimer.started_at).getTime() - totalPausedMs;
      const previousMs = segmentsRef.current.reduce((s, seg) => s + seg.duration_ms, 0);
      const currentMs = Math.max(0, totalActiveMs - previousMs);
      const allSegments = [...segmentsRef.current, { side: feedTimer.feed_side, duration_ms: currentMs }];
      // Only include segments if there was a switch (more than 1 segment)
      if (allSegments.length > 1) {
        segments = allSegments;
      }
    }
    onStopTimer(feedTimer.id, feedPausedMsRef.current, segments);
  }, [feedTimer, getCurrentTotalPausedMs, onStopTimer]);

  const handlePauseStateChange = useCallback((paused: boolean) => {
    feedIsPausedRef.current = paused;
    feedPauseStartRef.current = paused ? Date.now() : null;
  }, []);

  // Feed time display
  const feedStartTime = lastFeed?.timestamp ? formatTime(lastFeed.timestamp) : null;
  const feedEndTime = lastFeed?.duration_ms && lastFeed?.timestamp
    ? formatTime(new Date(new Date(lastFeed.timestamp).getTime() + lastFeed.duration_ms).toISOString())
    : feedStartTime; // For instant logs (bottle), start = end
  const feedDurationMin = lastFeed?.duration_ms ? Math.round(lastFeed.duration_ms / 60000) : null;

  return (
    <div
      className="flex flex-col h-full rounded-2xl bg-bg-card/60 border overflow-y-auto"
      style={{ borderColor: `${color}25` }}
    >
      {/* Header: Name + breast side badge */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-1">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-lg font-bold" style={{ color }}>
          {name}
        </h2>
        {lastBreastSide && (
          <span
            className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            Last: {lastBreastSide === 'left' ? 'L' : lastBreastSide === 'right' ? 'R' : 'Both'}
          </span>
        )}
      </div>

      {/* Active timer hero */}
      {hasActiveTimer && (
        <div className="flex-shrink-0 px-5 py-4">
          {feedTimer && (
            <div className="w-full flex flex-col items-center gap-4">
              <TimerDisplay
                startedAt={feedTimer.started_at}
                type="feed"
                twinColor={color}
                label={`Feeding${feedTimer.feed_side ? ` (${feedTimer.feed_side.charAt(0).toUpperCase()})` : ''}`}
                onPausedTimeChange={(ms) => { feedPausedMsRef.current = ms; }}
                onPauseStateChange={handlePauseStateChange}
              />
              {feedTimer.feed_side && feedTimer.feed_side !== 'both' && (
                <button
                  onClick={handleSwitchSide}
                  className="w-full min-h-[60px] rounded-2xl text-base font-bold
                             active:scale-[0.97] transition-all
                             border-2 border-dashed"
                  style={{ borderColor: `${color}40`, color }}
                >
                  Switch to {feedTimer.feed_side === 'left' ? 'Right →' : '← Left'}
                </button>
              )}
              <button
                onClick={handleStopFeed}
                className="w-full min-h-[72px] rounded-2xl text-lg font-bold
                           active:scale-[0.97] transition-all text-[#0F1117]"
                style={{ backgroundColor: color }}
              >
                Stop Feed
              </button>
            </div>
          )}
          {napTimer && (
            <div className="w-full flex flex-col items-center gap-4">
              <TimerDisplay
                startedAt={napTimer.started_at}
                type="nap"
                twinColor={color}
                label="Napping"
              />
              <button
                onClick={() => onStopTimer(napTimer.id)}
                className="w-full min-h-[72px] rounded-2xl text-lg font-bold
                           active:scale-[0.97] transition-all text-[#0F1117]"
                style={{ backgroundColor: color }}
              >
                Wake Up
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status info cards */}
      {!hasActiveTimer && (
        <div className="px-4 py-2 flex flex-col gap-2">
          {/* Last feed info */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Last Feed</span>
              {lastFeed?.feed_mode && (
                <span className="text-xs text-text-muted">
                  {lastFeed.feed_mode === 'breast' ? '🤱 Breast' : '🍼 Bottle'}
                  {lastFeed.feed_mode === 'breast' && lastFeed.feed_side && (
                    <> · Started {lastFeed.feed_side === 'left' ? 'L' : lastFeed.feed_side === 'right' ? 'R' : 'Both'}</>
                  )}
                  {lastFeed.feed_amount ? ` · ${fmtOz(lastFeed.feed_amount)}${lastFeed.feed_unit}` : ''}
                </span>
              )}
            </div>
            {lastFeed ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-text-primary font-mono">
                    {feedStartTime}
                    {feedDurationMin ? ` → ${feedEndTime}` : ''}
                  </span>
                  {feedDurationMin ? (
                    <span className="text-xs text-text-muted">({feedDurationMin}min)</span>
                  ) : null}
                </div>
                {lastFeed.feed_segments && lastFeed.feed_segments.length > 1 && (() => {
                  const segments = lastFeed.feed_segments!;
                  const totalSegMs = segments.reduce((s, seg) => s + seg.duration_ms, 0);
                  const gapMs = (lastFeed.duration_ms ?? 0) - totalSegMs;
                  const gapSec = Math.max(0, Math.round(gapMs / 1000));
                  const gapLabel = gapSec >= 60
                    ? `${Math.floor(gapSec / 60)}m ${gapSec % 60}s`
                    : `${gapSec}s`;
                  return (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2">
                        {segments.map((seg, i) => (
                          <span key={i} className="text-xs font-semibold text-text-secondary">
                            {seg.side === 'left' ? 'L' : 'R'}: {Math.round(seg.duration_ms / 60000)}min
                            {i < segments.length - 1 ? ' ·' : ''}
                          </span>
                        ))}
                      </div>
                      {gapSec > 0 && (
                        <span className="text-xs text-text-muted">
                          Latch gap: {gapLabel}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <span className="text-sm text-text-muted">No feeds yet</span>
            )}
          </div>

          {/* Feed schedule */}
          <div
            className="rounded-xl px-4 py-3 border"
            style={{
              backgroundColor: nextFeed?.overdue ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.05)',
              borderColor: nextFeed?.overdue ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.1)',
            }}
          >
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Feed Schedule</span>
            {feedSchedule.length > 0 ? (
              <div className="flex flex-col gap-1.5 mt-2">
                {feedSchedule.map((feed, i) => {
                  const isNext = i === 0;
                  const label = isNext ? 'Next' : `+${i}`;
                  return (
                    <div key={i} className="flex items-baseline gap-2">
                      <span className={`text-[10px] font-bold uppercase w-8 shrink-0 ${
                        isNext
                          ? feed.overdue ? 'text-danger' : 'text-success'
                          : 'text-text-muted'
                      }`}>
                        {label}
                      </span>
                      <span className={`font-mono font-bold ${
                        isNext
                          ? `text-lg ${feed.overdue ? 'text-danger' : 'text-success'}`
                          : 'text-sm text-text-secondary'
                      }`}>
                        {feed.time}
                      </span>
                      {isNext && (
                        <span className={`text-xs font-semibold ${feed.overdue ? 'text-danger' : 'text-success'}`}>
                          {feed.overdue
                            ? `${Math.abs(feed.diffMin)}min overdue`
                            : `in ${feed.diffMin}min`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-sm text-text-muted mt-1 block">No feeds yet</span>
            )}
          </div>

          {/* Last diaper */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Last Diaper</span>
            {lastDiaper ? (
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-text-primary font-mono">
                  {formatTime(lastDiaper.timestamp)}
                </span>
                <span className="text-xs text-text-muted capitalize">
                  {lastDiaper.diaper_subtype ?? 'diaper'}
                </span>
              </div>
            ) : (
              <span className="text-sm text-text-muted mt-1 block">No diapers yet</span>
            )}
          </div>
        </div>
      )}

      {/* Nudge banners */}
      {feedTimer && (
        <NudgeBanner
          timer={feedTimer}
          pair={pair}
          twinName={name}
          twinColor={color}
          onConfirmContinue={() => {}}
          onStopAndSave={() => onStopTimer(feedTimer.id)}
        />
      )}
      {napTimer && (
        <NudgeBanner
          timer={napTimer}
          pair={pair}
          twinName={name}
          twinColor={color}
          onConfirmContinue={() => {}}
          onStopAndSave={() => onStopTimer(napTimer.id)}
        />
      )}

      {/* Bottom thumb zone: Action buttons — takes up remaining space */}
      <div className="mt-auto px-3 pb-4 pt-3 flex flex-col gap-2.5">
        <ActionButton
          icon="🍼"
          label="Feed"
          onClick={() => setFeedModalOpen(true)}
          twinColor={color}
          active={!!feedTimer}
        />
        <div className="grid grid-cols-3 gap-2.5">
          <ActionButton
            icon="💧"
            label="Wet"
            onClick={() => onLogDiaper(label, 'wet')}
            variant="secondary"
            size="compact"
          />
          <ActionButton
            icon="💩"
            label="Dirty"
            onClick={() => onLogDiaper(label, 'dirty')}
            variant="secondary"
            size="compact"
          />
          <ActionButton
            icon="💧💩"
            label="Both"
            onClick={() => onLogDiaper(label, 'both')}
            variant="secondary"
            size="compact"
          />
        </div>
        <ActionButton
          icon={napTimer ? '☀️' : '😴'}
          label={napTimer ? 'Wake Up' : 'Nap'}
          onClick={() => (napTimer ? onStopTimer(napTimer.id) : onToggleNap(label))}
          twinColor={color}
          active={!!napTimer}
        />
      </div>

      {/* Log past activity button */}
      <div className="px-3 pb-4">
        <button
          onClick={() => setRetroModalOpen(true)}
          className="w-full min-h-[48px] rounded-2xl text-sm font-semibold
                     bg-white/[0.04] text-text-muted hover:bg-white/[0.08]
                     active:scale-[0.97] transition-all
                     border border-dashed border-white/[0.1]
                     flex items-center justify-center gap-2"
        >
          <span>+</span>
          Log Past Activity
        </button>
      </div>

      {/* Retro log modal */}
      <RetroLogModal
        open={retroModalOpen}
        onClose={() => setRetroModalOpen(false)}
        twinLabel={label}
        twinName={name}
        twinColor={color}
        lastBreastSide={lastBreastSide}
        onLogBottle={handleRetroLogBottle}
        onLogBreast={handleRetroLogBreast}
        onLogDiaper={handleRetroLogDiaper}
        onLogNap={handleRetroLogNap}
      />

      {/* Feed modal */}
      <FeedModal
        open={feedModalOpen}
        onClose={() => setFeedModalOpen(false)}
        twinLabel={label}
        twinName={name}
        twinColor={color}
        lastBreastSide={lastBreastSide}
        onLogBottle={handleLogBottle}
        onStartBreast={handleStartBreast}
      />
    </div>
  );
}
