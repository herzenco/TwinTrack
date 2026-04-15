import { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

const AUTO_DISMISS_MS = 8000;

export function SyncErrorBanner() {
  const syncError = useAppStore((s) => s.syncError);
  const setSyncError = useAppStore((s) => s.setSyncError);

  useEffect(() => {
    if (!syncError) return;
    const timer = setTimeout(() => setSyncError(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [syncError, setSyncError]);

  if (!syncError) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="max-w-lg mx-auto bg-danger/95 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <span className="text-lg">&#9888;</span>
        <p className="text-sm font-semibold text-white flex-1">{syncError}</p>
        <button
          onClick={() => setSyncError(null)}
          className="text-white/80 hover:text-white text-sm font-bold px-2 py-1 min-h-[44px]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
