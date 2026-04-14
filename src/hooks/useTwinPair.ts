import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
  getTwinPair,
  getPairMembers,
  updateTwinPair as dbUpdateTwinPair,
} from '../lib/database';
import type { TwinPair } from '../types';

export function useTwinPair() {
  const {
    user,
    profile,
    activePair,
    pairMembers,
    setActivePair,
    setPairMembers,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPair = useCallback(
    async (pairId: string) => {
      setLoading(true);
      setError(null);
      try {
        const [pair, members] = await Promise.all([
          getTwinPair(pairId),
          getPairMembers(pairId),
        ]);
        setActivePair(pair);
        setPairMembers(members);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load twin pair';
        setError(message);
        setActivePair(null);
        setPairMembers([]);
      } finally {
        setLoading(false);
      }
    },
    [setActivePair, setPairMembers]
  );

  // Auto-load pair when profile has an active_pair_id
  useEffect(() => {
    if (profile?.active_pair_id && !activePair) {
      loadPair(profile.active_pair_id);
    }
  }, [profile?.active_pair_id, activePair, loadPair]);

  const updatePair = useCallback(
    async (
      updates: Partial<
        Pick<
          TwinPair,
          | 'twin_a_name'
          | 'twin_a_color'
          | 'twin_a_emoji'
          | 'twin_b_name'
          | 'twin_b_color'
          | 'twin_b_emoji'
          | 'feed_interval_minutes'
          | 'nap_nudge_minutes'
          | 'feed_nudge_minutes'
          | 'timezone'
        >
      >
    ) => {
      if (!activePair) throw new Error('No active pair');
      const updated = await dbUpdateTwinPair(activePair.id, updates);
      setActivePair(updated);
      return updated;
    },
    [activePair, setActivePair]
  );

  const refreshPair = useCallback(async () => {
    if (!activePair) return;
    await loadPair(activePair.id);
  }, [activePair, loadPair]);

  const currentUserRole = pairMembers.find(
    (m) => m.user_id === user?.id
  )?.role ?? null;

  return {
    pair: activePair,
    members: pairMembers,
    currentUserRole,
    loading,
    error,
    loadPair,
    updatePair,
    refreshPair,
  };
}
