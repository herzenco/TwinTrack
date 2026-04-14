import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { getActiveTimers, getEvents, getPairMembers } from '../lib/database';
import type { ActiveTimer, TrackedEvent, PairMember } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Sets up Supabase Realtime subscriptions for the active twin pair.
 * Subscribes to active_timers, events, and pair_members changes.
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
      // Active timers: INSERT, DELETE
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
          addTimer(timer);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'active_timers',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old.id) removeTimer(old.id);
        }
      )
      // Events: INSERT (new events from any caregiver)
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
          // Avoid duplicates from optimistic inserts
          const { recentEvents } = useAppStore.getState();
          if (!recentEvents.some((e) => e.id === event.id)) {
            addEvent(event);
          }
        }
      )
      // Events: DELETE (undo by any caregiver)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old.id) {
            const { removeEvent } = useAppStore.getState();
            removeEvent(old.id);
          }
        }
      )
      // Pair members: INSERT, DELETE
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
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old.id) {
            const { pairMembers } = useAppStore.getState();
            setPairMembers(pairMembers.filter((m) => m.id !== old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Successfully subscribed — no action needed
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // On error or timeout, refetch to catch missed changes
          refetchAll();
        }
      });

    channelRef.current = channel;

    return () => {
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
