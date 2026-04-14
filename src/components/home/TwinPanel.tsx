import { useState, useMemo, useCallback } from 'react';
import type { TwinLabel, TwinPair, ActiveTimer, TrackedEvent, FeedType, FeedSide, DiaperSubtype } from '../../types';
import { TimerDisplay } from './TimerDisplay';
import { StatusRow } from './StatusRow';
import { ActionButton } from './ActionButton';
import { FeedModal } from './FeedModal';
import { NudgeBanner } from './NudgeBanner';
import { formatFeedDetails, formatDiaperType } from '../../utils/formatters';

interface TwinPanelProps {
  label: TwinLabel;
  pair: TwinPair;
  timers: ActiveTimer[];
  events: TrackedEvent[];
  onLogBottle: (twin: TwinLabel, feedType: FeedType, amount: number, unit: 'oz' | 'ml') => void;
  onStartBreast: (twin: TwinLabel, side: FeedSide) => void;
  onLogDiaper: (twin: TwinLabel, subtype: DiaperSubtype) => void;
  onToggleNap: (twin: TwinLabel) => void;
  onStopTimer: (timerId: string) => void;
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
}: TwinPanelProps) {
  const [feedModalOpen, setFeedModalOpen] = useState(false);

  const isA = label === 'A';
  const name = isA ? pair.twin_a_name : pair.twin_b_name;
  const color = isA ? pair.twin_a_color : pair.twin_b_color;
  const emoji = isA ? pair.twin_a_emoji : pair.twin_b_emoji;

  const feedTimer = timers.find((t) => t.twin_label === label && t.type === 'feed');
  const napTimer = timers.find((t) => t.twin_label === label && t.type === 'nap');

  const lastFeed = useMemo(
    () => events.find((e) => e.twin_label === label && e.type === 'feed'),
    [events, label],
  );
  const lastDiaper = useMemo(
    () => events.find((e) => e.twin_label === label && e.type === 'diaper'),
    [events, label],
  );
  const lastNap = useMemo(
    () => events.find((e) => e.twin_label === label && e.type === 'nap'),
    [events, label],
  );

  const lastBreastSide = useMemo(() => {
    const breastFeed = events.find(
      (e) => e.twin_label === label && e.type === 'feed' && e.feed_mode === 'breast' && e.feed_side,
    );
    return breastFeed?.feed_side ?? null;
  }, [events, label]);

  const handleLogBottle = useCallback(
    (feedType: FeedType, amount: number, unit: 'oz' | 'ml') => {
      onLogBottle(label, feedType, amount, unit);
    },
    [label, onLogBottle],
  );

  const handleStartBreast = useCallback(
    (side: FeedSide) => {
      onStartBreast(label, side);
    },
    [label, onStartBreast],
  );

  return (
    <div
      className="flex flex-col h-full rounded-2xl bg-bg-card/60 border overflow-hidden"
      style={{ borderColor: `${color}25` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="text-xl">{emoji}</span>
        <h2 className="text-base font-bold" style={{ color }}>
          {name}
        </h2>
        {lastBreastSide && (
          <span
            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            Last: {lastBreastSide === 'left' ? 'L' : lastBreastSide === 'right' ? 'R' : 'Both'}
          </span>
        )}
      </div>

      {/* Active timer */}
      <div className="px-4 py-3 flex flex-col items-center">
        {feedTimer && (
          <div className="mb-2">
            <TimerDisplay
              startedAt={feedTimer.started_at}
              type="feed"
              twinColor={color}
              label={`Feeding${feedTimer.feed_side ? ` (${feedTimer.feed_side.charAt(0).toUpperCase()})` : ''}`}
            />
            <button
              onClick={() => onStopTimer(feedTimer.id)}
              className="mt-2 w-full min-h-[44px] rounded-lg text-sm font-bold active:scale-95 transition-all"
              style={{ backgroundColor: `${color}20`, color }}
            >
              Stop Feed
            </button>
          </div>
        )}
        {napTimer && (
          <div className="mb-2">
            <TimerDisplay
              startedAt={napTimer.started_at}
              type="nap"
              twinColor={color}
              label="Napping"
            />
            <button
              onClick={() => onStopTimer(napTimer.id)}
              className="mt-2 w-full min-h-[44px] rounded-lg text-sm font-bold active:scale-95 transition-all"
              style={{ backgroundColor: `${color}20`, color }}
            >
              Wake Up
            </button>
          </div>
        )}
        {!feedTimer && !napTimer && (
          <div className="text-xs text-text-muted py-4">No active timers</div>
        )}
      </div>

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

      {/* Status rows */}
      <div className="px-4 flex-1">
        <StatusRow
          icon="🍼"
          label="Feed"
          timestamp={lastFeed?.timestamp ?? null}
          detail={
            lastFeed
              ? formatFeedDetails(
                  lastFeed.feed_mode,
                  lastFeed.feed_amount,
                  lastFeed.feed_unit,
                  lastFeed.feed_type,
                  lastFeed.feed_side,
                  lastFeed.duration_ms,
                )
              : undefined
          }
        />
        <StatusRow
          icon="🧷"
          label="Diaper"
          timestamp={lastDiaper?.timestamp ?? null}
          detail={lastDiaper ? formatDiaperType(lastDiaper.diaper_subtype) : undefined}
        />
        <StatusRow
          icon="😴"
          label="Nap"
          timestamp={lastNap?.timestamp ?? null}
          detail={
            lastNap?.duration_ms
              ? `${Math.round(lastNap.duration_ms / 60000)}min`
              : undefined
          }
        />
      </div>

      {/* Action buttons -- bottom-heavy layout */}
      <div className="px-3 pb-4 pt-2 flex flex-col gap-2">
        <ActionButton
          icon="🍼"
          label="Feed"
          onClick={() => setFeedModalOpen(true)}
          twinColor={color}
          active={!!feedTimer}
        />
        <div className="grid grid-cols-3 gap-2">
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

      {/* Feed modal */}
      <FeedModal
        open={feedModalOpen}
        onClose={() => setFeedModalOpen(false)}
        twinLabel={label}
        twinName={name}
        twinColor={color}
        onLogBottle={handleLogBottle}
        onStartBreast={handleStartBreast}
      />
    </div>
  );
}
