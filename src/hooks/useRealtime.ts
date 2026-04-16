import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { getActiveTimers, getEvents, getPairMembers } from '../lib/database';
import type { ActiveTimer, TrackedEvent, PairMember } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Sets up Supabase Realtime subscriptions for the active twin pair.
 * Subscribes to active_timers, events, and pair_members changes.
 * DELETE subscriptions use no filter (Supabase Realtime doesn't reliably
 * filter deletes) — we filter client-side instead.
 * On reconnection, refetches full state to avoid missed events.
 */
export function useRealtime() {
  const {
    activePair,
    setActiveTimers,
    addTimer,
    removeTimer,
    addEvent,
    setRecentEvents,
    setPairMembers,
  } = useAppStore();

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!activePair) return;

    const pairId = activePair.id;

    // Refetch all state — used on reconnection to catch anything missed
    async function refetchAll() {
      try {
        const [timers, events, members] = await Promise.all([
          getActiveTimers(pairId),
          getEvents({ pairId, from: 0, to: 49 }),
          getPairMembers(pairId),
        ]);
        setActiveTimers(timers);
        setRecentEvents(events);
        setPairMembers(members);
      } catch {
        // Silently handle — will retry on next reconnect
      }
    }

    const channel = supabase
      .channel(`pair-${pairId}`)

      // ---------------------------------------------------------------
      // Active timers
      // ---------------------------------------------------------------
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'active_timers',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const timer = payload.new as ActiveTimer;
          const { activeTimers } = useAppStore.getState();
          if (!activeTimers.some((t) => t.id === timer.id)) {
            addTimer(timer);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_timers',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const timer = payload.new as ActiveTimer;
          const { updateTimer } = useAppStore.getState();
          updateTimer(timer.id, timer);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'active_timers',
        },
        (payload) => {
          const old = payload.old as { id?: string; pair_id?: string };
          if (old.id) {
            // Only act on timers for our pair (or if pair_id not in payload, remove anyway)
            if (!old.pair_id || old.pair_id === pairId) {
              removeTimer(old.id);
            }
          }
        }
      )

      // ---------------------------------------------------------------
      // Events
      // ---------------------------------------------------------------
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const event = payload.new as TrackedEvent;
          const { recentEvents } = useAppStore.getState();
          if (!recentEvents.some((e) => e.id === event.id)) {
            addEvent(event);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const updated = payload.new as TrackedEvent;
          const { recentEvents, setRecentEvents: setEvents } = useAppStore.getState();
          setEvents(recentEvents.map((e) => e.id === updated.id ? updated : e));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          const old = payload.old as { id?: string; pair_id?: string };
          if (old.id) {
            if (!old.pair_id || old.pair_id === pairId) {
              const { removeEvent } = useAppStore.getState();
              removeEvent(old.id);
            }
          }
        }
      )

      // ---------------------------------------------------------------
      // Pair members
      // ---------------------------------------------------------------
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pair_members',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const member = payload.new as PairMember;
          const { pairMembers } = useAppStore.getState();
          if (!pairMembers.some((m) => m.id === member.id)) {
            setPairMembers([...pairMembers, member]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pair_members',
        },
        (payload) => {
          const old = payload.old as { id?: string; pair_id?: string };
          if (old.id) {
            if (!old.pair_id || old.pair_id === pairId) {
              const { pairMembers } = useAppStore.getState();
              setPairMembers(pairMembers.filter((m) => m.id !== old.id));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Initial fetch once connected
          refetchAll();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          refetchAll();
        }
      });

    channelRef.current = channel;

    // Poll every 15 seconds as a fallback for missed realtime events
    // (DELETE events are unreliable in Supabase Realtime)
    const pollInterval = setInterval(refetchAll, 15000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    activePair,
    setActiveTimers,
    addTimer,
    removeTimer,
    addEvent,
    setRecentEvents,
    setPairMembers,
  ]);
}
