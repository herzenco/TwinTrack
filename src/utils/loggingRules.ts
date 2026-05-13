import type { DiaperSubtype, FeedSide, FeedType } from '../types';
import { getTimeMs } from './time';

export const DEFAULT_BOTTLE_FEED_TYPE: FeedType = 'breastmilk';

export const FEED_AMOUNT_PRESETS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6] as const;

export const PUMPING_OZ_PRESETS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6] as const;

export const PAST_BREAST_SIDE_OPTIONS: { side: Exclude<FeedSide, 'both'>; label: string }[] = [
  { side: 'left', label: 'Left' },
  { side: 'right', label: 'Right' },
];

export const BREAST_SIDE_OPTIONS: { side: FeedSide; label: string }[] = [
  ...PAST_BREAST_SIDE_OPTIONS,
  { side: 'both', label: 'Both' },
];

export const DIAPER_LOG_OPTIONS: { subtype: DiaperSubtype; label: string; icon: string }[] = [
  { subtype: 'dirty', label: 'Dirty', icon: '💩' },
];

export const WAKE_WINDOW_MINUTES = 60;

export function getPumpingStartedAt(durationMinutes: number, now: Date = new Date()): Date {
  const safeDuration = Number.isFinite(durationMinutes) ? Math.max(0, durationMinutes) : 0;
  return new Date(now.getTime() - safeDuration * 60000);
}

export function getWakeWindowEndsAt(feedStartedAt: string, wakeWindowMinutes = WAKE_WINDOW_MINUTES): Date | null {
  const startedAtMs = getTimeMs(feedStartedAt);
  if (startedAtMs === null) return null;
  const safeWakeWindowMinutes = Number.isFinite(wakeWindowMinutes) ? Math.max(0, wakeWindowMinutes) : WAKE_WINDOW_MINUTES;
  return new Date(startedAtMs + safeWakeWindowMinutes * 60000);
}
