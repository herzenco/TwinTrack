import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/appStore';

const UNDO_DURATION = 5000;

const QUICK_NOTES: Record<string, string[]> = {
  diaper: ['Rash', 'Unusual color', 'Blowout', 'Straining'],
  feed: ['Spit up', 'Fussy', 'Refused', 'Fell asleep'],
  nap: ['Fussy before', 'Woke crying', 'Slept well', 'Short nap'],
  note: [],
};

export function UndoToast() {
  const undoEvent = useAppStore((s) => s.undoEvent);
  const setUndoEvent = useAppStore((s) => s.setUndoEvent);
  const removeEvent = useAppStore((s) => s.removeEvent);
  const [remaining, setRemaining] = useState(UNDO_DURATION);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saved, setSaved] = useState(false);
  const timerPaused = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!undoEvent) {
      setRemaining(UNDO_DURATION);
      setShowNote(false);
      setNoteText('');
      setSaved(false);
      timerPaused.current = false;
      return;
    }

    setRemaining(UNDO_DURATION);
    setShowNote(false);
    setNoteText('');
    setSaved(false);
    timerPaused.current = false;

    const start = Date.now();
    const interval = setInterval(() => {
      if (timerPaused.current) return;
      const left = UNDO_DURATION - (Date.now() - start);
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
    timerPaused.current = true;
    setShowNote(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSaveNote = useCallback((text: string) => {
    if (!undoEvent || !text.trim()) return;

    const store = useAppStore.getState();
    const updatedEvents = store.recentEvents.map((e) =>
      e.id === undoEvent.id ? { ...e, note_text: text.trim() } : e
    );
    store.setRecentEvents(updatedEvents);

    setSaved(true);
    setShowNote(false);
    setNoteText('');
    setTimeout(() => setUndoEvent(null), 1200);
  }, [undoEvent, setUndoEvent]);

  const handleQuickNote = useCallback((note: string) => {
    const combined = noteText ? `${noteText}, ${note}` : note;
    setNoteText(combined);
    handleSaveNote(combined);
  }, [noteText, handleSaveNote]);

  if (!undoEvent) return null;

  const typeLabels: Record<string, string> = {
    feed: 'Feed',
    diaper: 'Diaper',
    nap: 'Nap',
    note: 'Note',
  };

  const twinLabel = undoEvent.twin_label === 'A' ? 'Twin A' : 'Twin B';
  const progress = showNote ? 1 : remaining / UNDO_DURATION;
  const quickNotes = QUICK_NOTES[undoEvent.type] || [];

  return (
    <div className="fixed bottom-24 left-3 right-3 z-50 animate-slide-up">
      <div className="bg-bg-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-w-lg mx-auto">
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-text-secondary transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Saved confirmation */}
        {saved && (
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="text-sm text-success font-semibold">Note saved!</span>
          </div>
        )}

        {/* Default: logged message + Add Note + Undo */}
        {!showNote && !saved && (
          <>
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <span className="text-sm text-text-secondary flex-1 truncate">
                Logged {typeLabels[undoEvent.type]} for {twinLabel}
              </span>
              <button
                onClick={handleUndo}
                className="text-xs font-bold text-warning px-3 py-1.5 rounded-lg bg-warning/10
                           active:scale-95 transition-transform min-h-[32px]"
              >
                UNDO
              </button>
            </div>
            <div className="px-3 pb-3">
              <button
                onClick={handleOpenNote}
                className="w-full min-h-[56px] rounded-xl bg-white/[0.06] text-text-primary
                           font-semibold text-base flex items-center justify-center gap-2
                           active:scale-[0.98] active:bg-white/10 transition-all
                           border border-white/[0.08]"
              >
                <span className="text-lg">📝</span>
                Add Note
              </button>
            </div>
          </>
        )}

        {/* Expanded note input */}
        {showNote && !saved && (
          <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
            {/* Quick note pills */}
            {quickNotes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickNotes.map((note) => (
                  <button
                    key={note}
                    onClick={() => handleQuickNote(note)}
                    className="px-3.5 py-2 rounded-full bg-white/[0.06] text-sm text-text-primary
                               font-medium active:scale-95 active:bg-white/12 transition-all
                               border border-white/[0.08]"
                  >
                    {note}
                  </button>
                ))}
              </div>
            )}

            {/* Free text */}
            <textarea
              ref={inputRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Or type a note..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-text-primary text-sm
                         border border-white/10 focus:outline-none focus:border-white/25
                         placeholder:text-text-muted resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNote(false);
                  setNoteText('');
                  timerPaused.current = false;
                }}
                className="min-h-[52px] px-5 rounded-xl bg-white/5 text-text-secondary font-semibold text-sm
                           active:scale-95 transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => handleSaveNote(noteText)}
                disabled={!noteText.trim()}
                className="flex-1 min-h-[52px] rounded-xl bg-twin-a text-bg-primary font-bold text-sm
                           active:scale-[0.98] transition-all
                           disabled:opacity-30 disabled:pointer-events-none"
              >
                Save Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
