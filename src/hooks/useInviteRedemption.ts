import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { redeemInvite } from '../lib/database';
import { useAuth } from './useAuth';

const PENDING_INVITE_KEY = 'pendingInviteCode';

export function useInviteRedemption() {
  const { user, profile, refreshProfile } = useAuth();
  const setActivePair = useAppStore((s) => s.setActivePair);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (!user || !profile) return;

    const code = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (!code) return;

    // Don't auto-redeem if user already has a pair
    if (profile.active_pair_id) {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      return;
    }

    attemptedRef.current = true;
    setRedeeming(true);
    setError(null);

    redeemInvite(code, profile.display_name)
      .then(async () => {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        await refreshProfile();
      })
      .catch((err) => {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        setError(err instanceof Error ? err.message : 'Failed to join pair');
      })
      .finally(() => setRedeeming(false));
  }, [user, profile, refreshProfile, setActivePair]);

  return { redeeming, error };
}

export function setPendingInviteCode(code: string) {
  sessionStorage.setItem(PENDING_INVITE_KEY, code);
}

export function getPendingInviteCode(): string | null {
  return sessionStorage.getItem(PENDING_INVITE_KEY);
}

export function clearPendingInviteCode() {
  sessionStorage.removeItem(PENDING_INVITE_KEY);
}
