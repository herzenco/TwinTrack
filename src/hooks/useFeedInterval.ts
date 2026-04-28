import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { TwinLabel } from '../types';

export type FeedIntervalStatus = 'green' | 'yellow' | 'red';

export interface FeedIntervalInfo {
  twinLabel: TwinLabel;
  status: FeedIntervalStatus;
  lastFeedAt: Date | null;
  minutesSinceLastFeed: number | null;
  minutesUntilDue: number | null;
  overdueMinutes: number | null;
  intervalMinutes: number;
}

const YELLOW_THRESHOLD_MINUTES = 30;

/**
 * Computes feed interval status (green/yellow/red) per twin based on
 * the last feed time and the configured interval on the twin pair.
 */
export function useFeedInterval(): {
  twinA: FeedIntervalInfo;
  twinB: FeedIntervalInfo;
} {
  const { activePair, recentEvents } = useAppStore();

  return useMemo(() => {
    const now = new Date();

    function computeForTwin(twinLabel: TwinLabel): FeedIntervalInfo {
      const intervalMinutes = twinLabel === 'A'
        ? (activePair?.twin_a_feed_interval_minutes ?? activePair?.feed_interval_minutes ?? 180)
        : (activePair?.twin_b_feed_interval_minutes ?? activePair?.feed_interval_minutes ?? 180);
      // Find the most recent feed event for this twin
      const lastFeed = recentEvents.find(
        (e) => e.twin_label === twinLabel && e.type === 'feed'
      );

      if (!lastFeed) {
        return {
          twinLabel,
          status: 'red',
          lastFeedAt: null,
          minutesSinceLastFeed: null,
          minutesUntilDue: null,
          overdueMinutes: null,
          intervalMinutes,
        };
      }

      const lastFeedAt = new Date(lastFeed.timestamp);
      const elapsedMs = now.getTime() - lastFeedAt.getTime();
      const minutesSinceLastFeed = Math.floor(elapsedMs / 60_000);
      const minutesUntilDue = intervalMinutes - minutesSinceLastFeed;

      let status: FeedIntervalStatus;
      let overdueMinutes: number | null = null;

      if (minutesUntilDue <= 0) {
        status = 'red';
        overdueMinutes = Math.abs(minutesUntilDue);
      } else if (minutesUntilDue <= YELLOW_THRESHOLD_MINUTES) {
        status = 'yellow';
      } else {
        status = 'green';
      }

      return {
        twinLabel,
        status,
        lastFeedAt,
        minutesSinceLastFeed,
        minutesUntilDue: Math.max(0, minutesUntilDue),
        overdueMinutes,
        intervalMinutes,
      };
    }

    return {
      twinA: computeForTwin('A'),
      twinB: computeForTwin('B'),
    };
  }, [activePair?.twin_a_feed_interval_minutes, activePair?.twin_b_feed_interval_minutes, activePair?.feed_interval_minutes, recentEvents]);
}
