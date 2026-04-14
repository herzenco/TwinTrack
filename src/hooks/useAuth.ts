import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getSession, onAuthStateChange, signOut as authSignOut } from '../lib/auth';
import { getUserProfile } from '../lib/database';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const { user, profile, setUser, setProfile, setActivePair } = useAppStore();
  const [loading, setLoading] = useState(true);

  const loadOrCreateProfile = useCallback(
    async (userId: string, email: string, displayName?: string) => {
      try {
        let userProfile = await getUserProfile(userId);

        // If the trigger didn't create a profile, create one from the client
        if (!userProfile) {
          const name = displayName || email.split('@')[0];
          const { data, error } = await supabase
            .from('user_profiles')
            .insert({ id: userId, display_name: name })
            .select()
            .single();
          if (error) throw error;
          userProfile = data;
        }

        setProfile(userProfile);
        return userProfile;
      } catch (err) {
        console.error('Failed to load/create profile:', err);
        setProfile(null);
        return null;
      }
    },
    [setProfile]
  );

  useEffect(() => {
    // Removed initializedRef guard — it breaks in React StrictMode.
    // StrictMode mounts, unmounts (cleanup unsubscribes the listener),
    // then re-mounts. With the ref guard the second mount was skipped,
    // leaving no auth listener registered.

    let cancelled = false;

    getSession()
      .then((session) => {
        if (cancelled) return;
        if (session?.user) {
          const u = session.user;
          setUser({ id: u.id, email: u.email ?? '' });
          return loadOrCreateProfile(
            u.id,
            u.email ?? '',
            u.user_metadata?.display_name ?? u.user_metadata?.full_name
          );
        } else {
          setUser(null);
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { unsubscribe } = onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const u = session.user;
          setUser({ id: u.id, email: u.email ?? '' });
          loadOrCreateProfile(
            u.id,
            u.email ?? '',
            u.user_metadata?.display_name ?? u.user_metadata?.full_name
          );
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setActivePair(null);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setUser, setProfile, setActivePair, loadOrCreateProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setProfile(null);
    setActivePair(null);
  }, [setUser, setProfile, setActivePair]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    return loadOrCreateProfile(user.id, user.email);
  }, [user, loadOrCreateProfile]);

  return {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };
}
