import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const REFRESH_GUARD_KEY = 'twintrack-sw-refreshing';

function getRefreshGuard(): boolean {
  try {
    return sessionStorage.getItem(REFRESH_GUARD_KEY) === '1';
  } catch {
    return false;
  }
}

function setRefreshGuard(): void {
  try {
    sessionStorage.setItem(REFRESH_GUARD_KEY, '1');
  } catch {
    // If sessionStorage is unavailable, the in-memory guard still prevents loops.
  }
}

function clearRefreshGuard(): void {
  try {
    sessionStorage.removeItem(REFRESH_GUARD_KEY);
  } catch {
    // Ignore storage failures; this is only a reload-loop guard.
  }
}

export function UpdatePrompt() {
  const refreshStartedRef = useRef(false);

  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 2 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 2 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      if (refreshStartedRef.current || getRefreshGuard()) return;

      refreshStartedRef.current = true;
      setRefreshGuard();
      void updateServiceWorker(true);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(clearRefreshGuard, 15000);
    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
