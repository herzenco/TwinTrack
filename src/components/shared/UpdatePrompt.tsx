import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 2 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 2 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      // Auto-reload when a new version is available
      window.location.reload();
    },
  });

  return null;
}
