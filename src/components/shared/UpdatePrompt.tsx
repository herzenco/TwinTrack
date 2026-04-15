import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 5 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="max-w-lg mx-auto bg-[#1a1d2e] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg border border-white/10">
        <p className="text-sm text-text-primary flex-1">
          New version available
        </p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-sm font-bold text-[#0F1117] px-4 py-2 rounded-xl bg-success
                     active:scale-95 transition-all min-h-[44px]"
        >
          Update
        </button>
      </div>
    </div>
  );
}
