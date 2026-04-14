import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
  getActiveTimers,
  createTimer,
  stopTimerAndCreateEvent,
  type CreateTimerParams,
  type StopTimerParams,
} from '../lib/database';
import type { ActiveTimer, TwinLabel, FeedSide, FeedMode, FeedUnit, FeedType } from '../types';

export function useActiveTimers() {
  const {
    user,
    profile,
    activePair,
    activeTimers,
    setActiveTimers,
    addTimer,
    removeTimer,
    addEvent,
  } = useAppStore();

  const [loading, setLoading] = useState(false);

  // Load timers when pair is set
  useEffect(() => {
    if (!activePair) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const timers = await getActiveTimers(activePair!.id);
        if (!cancelled) setActiveTimers(timers);
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activePair, setActiveTimers]);

  const startTimer = useCallback(
    async (
      twinLabel: TwinLabel,
      type: 'feed' | 'nap',
      feedSide?: FeedSide
    ): Promise<ActiveTimer> => {
      if (!activePair || !user) throw new Error('Not authenticated or no active pair');
      const name = profile?.display_name ?? user.email;

      const params: CreateTimerParams = {
        pair_id: activePair.id,
        twin_label: twinLabel,
        type,
        started_by_uid: user.id,
        started_by_name: name,
        feed_side: feedSide ?? null,
      };

      const timer = await createTimer(params);
      addTimer(timer);
      return timer;
    },
    [activePair, user, profile, addTimer]
  );

  const stopTimer = useCallback(
    async (
      timerId: string,
      opts: {
        feed_mode?: FeedMode;
        feed_amount?: number;
        feed_unit?: FeedUnit;
        feed_type?: FeedType;
        note_text?: string;
      } = {}
    ) => {
      const params: StopTimerParams = {
        timer_id: timerId,
        feed_mode: opts.feed_mode ?? null,
        feed_amount: opts.feed_amount ?? null,
        feed_unit: opts.feed_unit ?? null,
        feed_type: opts.feed_type ?? null,
        note_text: opts.note_text ?? null,
      };

      const event = await stopTimerAndCreateEvent(params);

      // Remove the timer from local state
      removeTimer(timerId);

      // Add the resulting event to the store
      addEvent(event);

      return event;
    },
    [removeTimer, addEvent]
  );

  const getTimerForTwin = useCallback(
    (twinLabel: TwinLabel, type: 'feed' | 'nap'): ActiveTimer | undefined => {
      return activeTimers.find(
        (t) => t.twin_label === twinLabel && t.type === type
      );
    },
    [activeTimers]
  );

  const refreshTimers = useCallback(async () => {
    if (!activePair) return;
    const timers = await getActiveTimers(activePair.id);
    setActiveTimers(timers);
  }, [activePair, setActiveTimers]);

  return {
    timers: activeTimers,
    loading,
    startTimer,
    stopTimer,
    getTimerForTwin,
    refreshTimers,
  };
}
