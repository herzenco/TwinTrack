import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';

const UNDO_DURATION = 5000;

export function UndoToast() {
  const undoEvent = useAppStore((s) => s.undoEvent);
  const setUndoEvent = useAppStore((s) => s.setUndoEvent);
  const removeEvent = useAppStore((s) => s.removeEvent);
  const [remaining, setRemaining] = useState(UNDO_DURATION);

  useEffect(() => {
    if (!undoEvent) {
      setRemaining(UNDO_DURATION);
      return;
    }

    setRemaining(UNDO_DURATION);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = UNDO_DURATION - elapsed;
      if (left <= 0) {
        clearInterval(interval);
        setUndoEvent(null);
      } else {
        setRemaining(left);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [undoEvent, setUndoEvent]);

  const handleUndo = useCallback(() => {
    if (!undoEvent) return;
    removeEvent(undoEvent.id);
    // TODO: call database delete via lib/database.ts
    setUndoEvent(null);
  }, [undoEvent, removeEvent, setUndoEvent]);

  if (!undoEvent) return null;

  const typeLabels: Record<string, string> = {
    feed: 'feed',
    diaper: 'diaper',
    nap: 'nap',
    note: 'note',
  };

  const twinLabel = undoEvent.twin_label === 'A' ? 'Twin A' : 'Twin B';
  const progress = remaining / UNDO_DURATION;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-bg-card rounded-xl shadow-2xl border border-white/10 overflow-hidden max-w-lg mx-auto">
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-text-secondary transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm text-text-secondary flex-1">
            Logged {typeLabels[undoEvent.type]} for {twinLabel}
          </span>
          <button
            onClick={handleUndo}
            className="text-sm font-bold text-warning px-3 py-1.5 rounded-lg bg-warning/10
                       active:scale-95 transition-transform min-h-[36px]"
          >
            UNDO
          </button>
        </div>
      </div>
    </div>
  );
}
