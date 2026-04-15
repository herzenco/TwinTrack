import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';

import {
  getActiveTimers,
  createTimer,
  stopTimerAndCreateEvent,
  updateTimerSide,
  type CreateTimerParams,
  type StopTimerParams,
} from '../lib/database';
import type { ActiveTimer, TwinLabel, FeedSide, FeedMode, FeedUnit, FeedType, FeedSegment } from '../types';

export function useActiveTimers() {
  const {
    user,
    profile,
    activePair,
    activeTimers,
    setActiveTimers,
    addTimer,
    removeTimer,
    updateTimer,
    addEvent,
    setUndoEvent,
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

      try {
        const timer = await createTimer(params);
        addTimer(timer);
        return timer;
      } catch (err) {
        const { setSyncError } = useAppStore.getState();
        setSyncError(`Failed to start ${type} timer. Check your connection and try again.`);
        throw err;
      }
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
        feed_segments?: FeedSegment[];
      } = {}
    ) => {
      const name = profile?.display_name ?? user?.email ?? 'Unknown';
      const params: StopTimerParams = {
        timer_id: timerId,
        logged_by_name: name,
        feed_mode: opts.feed_mode ?? null,
        feed_amount: opts.feed_amount ?? null,
        feed_unit: opts.feed_unit ?? null,
        feed_type: opts.feed_type ?? null,
        feed_segments: opts.feed_segments ?? null,
      };

      try {
        console.log('[stopTimer] calling RPC with params:', JSON.stringify(params));
        const event = await stopTimerAndCreateEvent(params);
        console.log('[stopTimer] RPC success, event:', JSON.stringify(event));

        // Remove the timer from local state
        removeTimer(timerId);

        // Add the resulting event to the store
        addEvent(event);
        setUndoEvent(event);

        return event;
      } catch (err) {
        console.error('[stopTimer] RPC failed:', err);
        const { setSyncError } = useAppStore.getState();
        const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as Record<string, unknown>).message) : String(err);
        setSyncError(`Stop failed: ${msg}`);
        throw err;
      }
    },
    [user, profile, removeTimer, addEvent, setUndoEvent]
  );

  const switchSide = useCallback(
    async (timerId: string, newSide: FeedSide) => {
      // Optimistically update local state
      updateTimer(timerId, { feed_side: newSide });
      try {
        await updateTimerSide(timerId, newSide);
      } catch {
        // Revert on failure — the real-time channel will correct eventually
      }
    },
    [updateTimer]
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
    switchSide,
    getTimerForTwin,
    refreshTimers,
  };
}
