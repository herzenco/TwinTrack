import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { BottomSheet } from '../shared/BottomSheet';

const UNDO_DURATION = 5000;

export function UndoToast() {
  const undoEvent = useAppStore((s) => s.undoEvent);
  const setUndoEvent = useAppStore((s) => s.setUndoEvent);
  const removeEvent = useAppStore((s) => s.removeEvent);
  const [remaining, setRemaining] = useState(UNDO_DURATION);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (!undoEvent) {
      setRemaining(UNDO_DURATION);
      setNoteSaved(false);
      return;
    }

    setRemaining(UNDO_DURATION);
    setNoteText('');
    setNoteSaved(false);
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
    setUndoEvent(null);
  }, [undoEvent, removeEvent, setUndoEvent]);

  const handleOpenNote = useCallback(() => {
    setNoteOpen(true);
    // Pause the auto-dismiss by clearing the undo timer
    // We'll keep the toast visible while note is open
  }, []);

  const handleSaveNote = useCallback(() => {
    if (!undoEvent || !noteText.trim()) return;

    // Update the event in the store with the note
    const updatedEvents = useAppStore.getState().recentEvents.map((e) =>
      e.id === undoEvent.id ? { ...e, note_text: noteText.trim() } : e
    );
    useAppStore.getState().setRecentEvents(updatedEvents);

    // TODO: persist note to database via lib/database.ts

    setNoteOpen(false);
    setNoteSaved(true);
    setNoteText('');
    // Dismiss the toast after saving
    setTimeout(() => setUndoEvent(null), 1500);
  }, [undoEvent, noteText, setUndoEvent]);

  if (!undoEvent) return null;

  const typeLabels: Record<string, string> = {
    feed: 'feed',
    diaper: 'diaper',
    nap: 'nap',
    note: 'note',
  };

  const twinLabel = undoEvent.twin_label === 'A' ? 'Twin A' : 'Twin B';
  const progress = noteOpen ? 1 : remaining / UNDO_DURATION;

  return (
    <>
      <div className="fixed bottom-24 left-3 right-3 z-50 animate-slide-up">
        <div className="bg-bg-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-w-lg mx-auto">
          {/* Progress bar */}
          <div className="h-0.5 bg-white/5">
            <div
              className="h-full bg-text-secondary transition-all duration-100 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="text-sm text-text-secondary flex-1 truncate">
              {noteSaved ? 'Note saved!' : `Logged ${typeLabels[undoEvent.type]} for ${twinLabel}`}
            </span>
            {!noteSaved && (
              <>
                <button
                  onClick={handleOpenNote}
                  className="text-sm font-semibold text-twin-a px-3 py-1.5 rounded-lg bg-twin-a/10
                             active:scale-95 transition-transform min-h-[36px]"
                >
                  + Note
                </button>
                <button
                  onClick={handleUndo}
                  className="text-sm font-bold text-warning px-3 py-1.5 rounded-lg bg-warning/10
                             active:scale-95 transition-transform min-h-[36px]"
                >
                  UNDO
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Note bottom sheet */}
      <BottomSheet
        open={noteOpen}
        onClose={() => {
          setNoteOpen(false);
          setNoteText('');
        }}
        title={`Note for ${twinLabel}'s ${typeLabels[undoEvent.type]}`}
      >
        <div className="flex flex-col gap-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note... (e.g., unusual color, extra fussy, medication given)"
            autoFocus
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/25
                       placeholder:text-text-muted resize-none"
          />
          <button
            onClick={handleSaveNote}
            disabled={!noteText.trim()}
            className="min-h-[60px] rounded-xl bg-twin-a text-bg-primary font-bold text-base
                       active:scale-[0.98] transition-all
                       disabled:opacity-30 disabled:pointer-events-none"
          >
            Save Note
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
