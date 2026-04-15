import { useEffect, useCallback, useState, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import {
  getEvents,
  createEvent,
  deleteEvent,
  type CreateEventParams,
  type GetEventsParams,
} from '../lib/database';
import type {
  TrackedEvent,
  TwinLabel,
  DiaperSubtype,
  FeedMode,
  FeedUnit,
  FeedType,
  FeedSide,
} from '../types';

const PAGE_SIZE = 50;
const UNDO_TIMEOUT_MS = 5000;

export function useEvents() {
  const {
    user,
    profile,
    activePair,
    recentEvents,
    setRecentEvents,
    addEvent,
    removeEvent,
    undoEvent,
    setUndoEvent,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial events when pair is set
  useEffect(() => {
    if (!activePair) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const events = await getEvents({
          pairId: activePair!.id,
          from: 0,
          to: PAGE_SIZE - 1,
        });
        if (!cancelled) {
          setRecentEvents(events);
          setHasMore(events.length === PAGE_SIZE);
        }
      } catch {
        // Silently handle — events will be empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activePair, setRecentEvents]);

  const loadMore = useCallback(async () => {
    if (!activePair || !hasMore || loading) return;

    setLoading(true);
    try {
      const events = await getEvents({
        pairId: activePair.id,
        from: recentEvents.length,
        to: recentEvents.length + PAGE_SIZE - 1,
      });
      setRecentEvents([...recentEvents, ...events]);
      setHasMore(events.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [activePair, hasMore, loading, recentEvents, setRecentEvents]);

  const fetchFiltered = useCallback(
    async (filters: Omit<GetEventsParams, 'pairId'>) => {
      if (!activePair) return [];
      return getEvents({ pairId: activePair.id, ...filters });
    },
    [activePair]
  );

  // Helper: get current user info for logging attribution
  function getLoggerInfo(): { uid: string; name: string } {
    if (!user) throw new Error('Not authenticated');
    const name = profile?.display_name ?? user.email;
    return { uid: user.id, name };
  }

  // Optimistic add with undo support
  const logEventOptimistic = useCallback(
    async (params: Omit<CreateEventParams, 'logged_by_uid' | 'logged_by_name'>) => {
      const { uid, name } = getLoggerInfo();

      // Create an optimistic event with a temp ID
      const tempId = `temp-${Date.now()}`;
      const optimisticEvent: TrackedEvent = {
        id: tempId,
        pair_id: params.pair_id,
        twin_label: params.twin_label,
        type: params.type,
        timestamp: params.timestamp ?? new Date().toISOString(),
        logged_by_uid: uid,
        logged_by_name: name,
        encrypted: params.encrypted ?? false,
        feed_mode: params.feed_mode ?? null,
        feed_amount: params.feed_amount ?? null,
        feed_unit: params.feed_unit ?? null,
        feed_type: params.feed_type ?? null,
        feed_side: params.feed_side ?? null,
        feed_segments: null,
        duration_ms: params.duration_ms ?? null,
        diaper_subtype: params.diaper_subtype ?? null,
        nap_start: params.nap_start ?? null,
        nap_end: params.nap_end ?? null,
        note_text: params.note_text ?? null,
        created_at: new Date().toISOString(),
      };

      // Optimistically add to store
      addEvent(optimisticEvent);

      try {
        const serverEvent = await createEvent({
          ...params,
          logged_by_uid: uid,
          logged_by_name: name,
        });

        // Replace temp event with server event
        removeEvent(tempId);
        addEvent(serverEvent);

        // Set up undo
        setUndoEvent(serverEvent);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
          setUndoEvent(null);
        }, UNDO_TIMEOUT_MS);

        return serverEvent;
      } catch (err) {
        // Rollback optimistic update
        removeEvent(tempId);
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, addEvent, removeEvent, setUndoEvent]
  );

  const undoLastEvent = useCallback(async () => {
    if (!undoEvent) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    try {
      await deleteEvent(undoEvent.id);
      removeEvent(undoEvent.id);
    } finally {
      setUndoEvent(null);
    }
  }, [undoEvent, removeEvent, setUndoEvent]);

  // Convenience loggers
  const logFeed = useCallback(
    (
      twinLabel: TwinLabel,
      feedMode: FeedMode,
      opts: {
        feed_amount?: number;
        feed_unit?: FeedUnit;
        feed_type?: FeedType;
        feed_side?: FeedSide;
        duration_ms?: number;
        timestamp?: string;
      } = {}
    ) => {
      if (!activePair) throw new Error('No active pair');
      return logEventOptimistic({
        pair_id: activePair.id,
        twin_label: twinLabel,
        type: 'feed',
        timestamp: opts.timestamp,
        feed_mode: feedMode,
        feed_amount: opts.feed_amount ?? null,
        feed_unit: opts.feed_unit ?? null,
        feed_type: opts.feed_type ?? null,
        feed_side: opts.feed_side ?? null,
        duration_ms: opts.duration_ms ?? null,
      });
    },
    [activePair, logEventOptimistic]
  );

  const logDiaper = useCallback(
    (twinLabel: TwinLabel, subtype: DiaperSubtype, timestamp?: string) => {
      if (!activePair) throw new Error('No active pair');
      return logEventOptimistic({
        pair_id: activePair.id,
        twin_label: twinLabel,
        type: 'diaper',
        timestamp,
        diaper_subtype: subtype,
      });
    },
    [activePair, logEventOptimistic]
  );

  const logNap = useCallback(
    (
      twinLabel: TwinLabel,
      napStart: string,
      napEnd: string,
      durationMs: number
    ) => {
      if (!activePair) throw new Error('No active pair');
      return logEventOptimistic({
        pair_id: activePair.id,
        twin_label: twinLabel,
        type: 'nap',
        timestamp: napStart,
        nap_start: napStart,
        nap_end: napEnd,
        duration_ms: durationMs,
      });
    },
    [activePair, logEventOptimistic]
  );

  const logNote = useCallback(
    (twinLabel: TwinLabel, noteText: string) => {
      if (!activePair) throw new Error('No active pair');
      return logEventOptimistic({
        pair_id: activePair.id,
        twin_label: twinLabel,
        type: 'note',
        note_text: noteText,
      });
    },
    [activePair, logEventOptimistic]
  );

  return {
    events: recentEvents,
    loading,
    hasMore,
    loadMore,
    fetchFiltered,
    logFeed,
    logDiaper,
    logNap,
    logNote,
    undoLastEvent,
    undoEvent,
  };
}
