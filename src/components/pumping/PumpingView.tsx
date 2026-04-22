import { useState, useCallback, useMemo } from 'react';
import { fmtOz } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import {
  createPumpingSession,
  deletePumpingSession,
  updatePumpingSession as updatePumpingDb,
} from '../../lib/database';
import { BottomSheet } from '../shared/BottomSheet';
import type { PumpingSession } from '../../types';

const OZ_PRESETS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6];

function nowLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function PumpingView() {
  const pair = useAppStore((s) => s.activePair);
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const sessions = useAppStore((s) => s.pumpingSessions);
  const addPumpingSession = useAppStore((s) => s.addPumpingSession);
  const removePumpingSession = useAppStore((s) => s.removePumpingSession);
  const updatePumpingInStore = useAppStore((s) => s.updatePumpingSession);
  const setSyncError = useAppStore((s) => s.setSyncError);

  const [durationMin, setDurationMin] = useState(0);
  const [leftOz, setLeftOz] = useState(0);
  const [rightOz, setRightOz] = useState(0);
  const [timestamp, setTimestamp] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingSession, setEditingSession] = useState<PumpingSession | null>(null);

  const totalOz = leftOz + rightOz;

  const handleLog = useCallback(async () => {
    if (!pair || !user || totalOz <= 0) return;
    setSaving(true);
    try {
      const ts = timestamp ? new Date(timestamp).toISOString() : undefined;
      const session = await createPumpingSession({
        pair_id: pair.id,
        timestamp: ts,
        duration_minutes: durationMin,
        left_oz: leftOz,
        right_oz: rightOz,
        note: note.trim() || null,
        logged_by_uid: user.id,
        logged_by_name: profile?.display_name ?? '',
      });
      addPumpingSession(session);
      setDurationMin(0);
      setLeftOz(0);
      setRightOz(0);
      setTimestamp('');
      setNote('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(`Failed to log pumping: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [pair, user, profile, durationMin, leftOz, rightOz, timestamp, note, totalOz, addPumpingSession, setSyncError]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deletePumpingSession(id);
      removePumpingSession(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(`Delete failed: ${msg}`);
    }
  }, [removePumpingSession, setSyncError]);

  // Today's summary
  const todaySummary = useMemo(() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter((s) => new Date(s.timestamp).toDateString() === today);
    return {
      count: todaySessions.length,
      totalOz: todaySessions.reduce((sum, s) => sum + s.total_oz, 0),
      totalMin: todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0),
      leftOz: todaySessions.reduce((sum, s) => sum + s.left_oz, 0),
      rightOz: todaySessions.reduce((sum, s) => sum + s.right_oz, 0),
    };
  }, [sessions]);

  if (!pair) return null;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-text-primary">Pumping</h1>

      {/* Today's summary */}
      {todaySummary.count > 0 && (
        <div className="rounded-2xl bg-bg-card/80 border border-white/10 p-4">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-2">Today</p>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-text-primary">{todaySummary.count}</p>
              <p className="text-[10px] text-text-muted">Sessions</p>
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{todaySummary.totalMin}m</p>
              <p className="text-[10px] text-text-muted">Time</p>
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{fmtOz(todaySummary.totalOz)}oz</p>
              <p className="text-[10px] text-text-muted">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{fmtOz(todaySummary.leftOz)}oz</p>
              <p className="text-[10px] text-text-muted">Left</p>
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{fmtOz(todaySummary.rightOz)}oz</p>
              <p className="text-[10px] text-text-muted">Right</p>
            </div>
          </div>
        </div>
      )}

      {/* Log new session */}
      <div className="rounded-2xl bg-bg-card/80 border border-white/10 p-4 flex flex-col gap-4">
        <p className="text-sm font-semibold text-text-primary">Log Session</p>

        {/* Duration */}
        <div>
          <p className="text-xs text-text-muted mb-2">Duration (minutes)</p>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 20, 25, 30].map((m) => (
              <button
                key={`D${m}`}
                onClick={() => setDurationMin(m)}
                className={`min-w-[48px] min-h-[44px] rounded-xl text-sm font-bold transition-all active:scale-95
                  ${durationMin === m
                    ? 'bg-twin-a text-[#0F1117]'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
              >
                {m}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              value={durationMin || ''}
              onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)}
              placeholder="Custom"
              className="min-w-[72px] min-h-[44px] px-3 rounded-xl bg-white/5 text-text-primary text-sm text-center
                         border border-white/10 focus:outline-none focus:border-white/20
                         placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Left breast */}
        <div>
          <p className="text-xs text-text-muted mb-2">Left breast (oz)</p>
          <div className="flex flex-wrap gap-2">
            {OZ_PRESETS.map((oz) => (
              <button
                key={`L${oz}`}
                onClick={() => setLeftOz(oz)}
                className={`min-w-[48px] min-h-[44px] rounded-xl text-sm font-bold transition-all active:scale-95
                  ${leftOz === oz
                    ? 'bg-twin-a text-[#0F1117]'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
              >
                {oz}
              </button>
            ))}
          </div>
        </div>

        {/* Right breast */}
        <div>
          <p className="text-xs text-text-muted mb-2">Right breast (oz)</p>
          <div className="flex flex-wrap gap-2">
            {OZ_PRESETS.map((oz) => (
              <button
                key={`R${oz}`}
                onClick={() => setRightOz(oz)}
                className={`min-w-[48px] min-h-[44px] rounded-xl text-sm font-bold transition-all active:scale-95
                  ${rightOz === oz
                    ? 'bg-twin-b text-[#0F1117]'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
              >
                {oz}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.03] border border-white/5">
          <span className="text-sm text-text-muted">Total:</span>
          <span className="text-2xl font-bold text-text-primary">{fmtOz(totalOz)}oz</span>
        </div>

        {/* Time */}
        <div>
          <p className="text-xs text-text-muted mb-2">Time</p>
          <input
            type="datetime-local"
            value={timestamp || nowLocal()}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/20 [color-scheme:dark]"
          />
        </div>

        {/* Note */}
        <div>
          <p className="text-xs text-text-muted mb-2">Note (optional)</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. morning pump"
            className="w-full min-h-[44px] px-4 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/20
                       placeholder:text-text-muted"
          />
        </div>

        {/* Log button */}
        <button
          onClick={handleLog}
          disabled={totalOz <= 0 || saving}
          className="min-h-[64px] rounded-2xl text-base font-bold active:scale-[0.97] transition-all
                     text-white disabled:opacity-40 disabled:pointer-events-none
                     bg-gradient-to-r from-twin-a to-twin-b"
        >
          {saving ? 'Saving...' : `Log ${fmtOz(totalOz)}oz Pumped`}
        </button>
      </div>

      {/* History */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">History</h2>
        {sessions.length === 0 ? (
          <p className="text-center py-8 text-text-muted text-sm">No pumping sessions yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setEditingSession(session)}
                className="flex items-center gap-3 rounded-xl bg-bg-card/80 border border-white/5 p-3
                           active:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex flex-col items-center min-w-[48px]">
                  <span className="text-xs text-text-muted">{formatDate(session.timestamp)}</span>
                  <span className="text-xs text-text-secondary font-medium">{formatTime(session.timestamp)}</span>
                </div>
                <div className="flex-1 flex items-center gap-3">
                  {session.duration_minutes > 0 && (
                    <span className="text-xs text-text-muted"><span className="font-bold text-text-primary">{session.duration_minutes}m</span></span>
                  )}
                  <span className="text-xs text-text-muted">L: <span className="font-bold text-text-primary">{fmtOz(session.left_oz)}oz</span></span>
                  <span className="text-xs text-text-muted">R: <span className="font-bold text-text-primary">{fmtOz(session.right_oz)}oz</span></span>
                </div>
                <span className="text-base font-bold text-text-primary">{fmtOz(session.total_oz)}oz</span>
                <span className="text-[10px] text-text-muted">✏️</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit sheet */}
      {editingSession && (
        <EditPumpingSheet
          session={editingSession}
          onSave={async (updated) => {
            setEditingSession(null);
            try {
              const saved = await updatePumpingDb(updated.id, {
                timestamp: updated.timestamp,
                duration_minutes: updated.duration_minutes,
                left_oz: updated.left_oz,
                right_oz: updated.right_oz,
                note: updated.note,
              });
              updatePumpingInStore(saved.id, saved);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              setSyncError(`Save failed: ${msg}`);
            }
          }}
          onDelete={(id) => {
            setEditingSession(null);
            handleDelete(id);
          }}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  );
}

// ─── Edit Pumping Session Sheet ─────────────────────────────────────────────

function EditPumpingSheet({
  session,
  onSave,
  onDelete,
  onClose,
}: {
  session: PumpingSession;
  onSave: (updated: PumpingSession) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [durationMin, setDurationMin] = useState(session.duration_minutes);
  const [leftOz, setLeftOz] = useState(session.left_oz);
  const [rightOz, setRightOz] = useState(session.right_oz);
  const [timestamp, setTimestamp] = useState(toLocalInput(session.timestamp));
  const [noteText, setNoteText] = useState(session.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalOz = leftOz + rightOz;

  const inputClass = "w-full min-h-[48px] px-4 rounded-xl bg-white/5 text-text-primary text-sm border border-white/10 focus:outline-none focus:border-white/25";

  return (
    <BottomSheet open={true} onClose={onClose} title="Edit Pumping Session">
      <div className="flex flex-col gap-4">
        {/* Time */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Time</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Duration (minutes)</label>
          <input
            type="number"
            inputMode="numeric"
            value={durationMin}
            onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        {/* Left oz */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Left breast (oz)</label>
          <input
            type="number"
            inputMode="decimal"
            value={leftOz}
            onChange={(e) => setLeftOz(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>

        {/* Right oz */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Right breast (oz)</label>
          <input
            type="number"
            inputMode="decimal"
            value={rightOz}
            onChange={(e) => setRightOz(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>

        {/* Total */}
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.03] border border-white/5">
          <span className="text-sm text-text-muted">Total:</span>
          <span className="text-xl font-bold text-text-primary">{fmtOz(totalOz)}oz</span>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Note</label>
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className={inputClass}
          />
        </div>

        {/* Save */}
        <button
          onClick={() => onSave({
            ...session,
            timestamp: new Date(timestamp).toISOString(),
            duration_minutes: durationMin,
            left_oz: leftOz,
            right_oz: rightOz,
            total_oz: totalOz,
            note: noteText.trim() || null,
          })}
          className="min-h-[60px] rounded-xl font-bold text-base active:scale-[0.98] transition-all
                     text-[#0F1117] bg-gradient-to-r from-twin-a to-twin-b"
        >
          Save Changes
        </button>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="min-h-[48px] rounded-xl bg-danger/10 text-danger font-semibold text-sm
                       active:scale-[0.98] transition-all"
          >
            Delete Session
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 min-h-[48px] rounded-xl bg-white/5 text-text-secondary text-sm font-semibold
                         active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(session.id)}
              className="flex-1 min-h-[48px] rounded-xl bg-danger text-white text-sm font-bold
                         active:scale-95 transition-all"
            >
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
