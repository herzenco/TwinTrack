import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { getSession, onAuthStateChange, signOut as authSignOut } from '../lib/auth';
import { getUserProfile } from '../lib/database';

export function useAuth() {
  const { user, profile, setUser, setProfile, setActivePair } = useAppStore();
  const initializedRef = useRef(false);

  const loadProfile = useCallback(
    async (userId: string) => {
      try {
        const userProfile = await getUserProfile(userId);
        setProfile(userProfile);
        return userProfile;
      } catch {
        setProfile(null);
        return null;
      }
    },
    [setProfile]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Load initial session
    getSession().then((session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' });
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { unsubscribe } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          loadProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setActivePair(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setUser, setProfile, setActivePair, loadProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setProfile(null);
    setActivePair(null);
  }, [setUser, setProfile, setActivePair]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    return loadProfile(user.id);
  }, [user, loadProfile]);

  return {
    user,
    profile,
    isAuthenticated: user !== null,
    isLoading: user === undefined,
    signOut,
    refreshProfile,
  };
}
