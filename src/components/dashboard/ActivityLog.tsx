import { useState, useMemo, useCallback } from 'react';
import type { TrackedEvent, TwinPair, TwinLabel, EventType, FeedMode, FeedType, FeedSide, DiaperSubtype } from '../../types';
import { formatTime } from '../../utils/time';
import { formatFeedDetails, formatDiaperType, formatNapDuration } from '../../utils/formatters';
import { BottomSheet } from '../shared/BottomSheet';
import { useAppStore } from '../../store/appStore';
import { deleteEvent, updateEvent } from '../../lib/database';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDurationMin(ms: number | null): string {
  if (!ms) return '—';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

interface ActivityLogProps {
  events: TrackedEvent[];
  pair: TwinPair;
  caregivers: string[];
}

type SortDir = 'asc' | 'desc';

export function ActivityLog({ events, pair, caregivers }: ActivityLogProps) {
  const [filterCaregiver, setFilterCaregiver] = useState<string>('all');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingEvent, setEditingEvent] = useState<TrackedEvent | null>(null);

  const filtered = useMemo(() => {
    let result = [...events];
    if (filterCaregiver !== 'all') {
      result = result.filter((e) => e.logged_by_name === filterCaregiver);
    }
    result.sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });
    return result;
  }, [events, filterCaregiver, sortDir]);

  function getDetail(event: TrackedEvent): string {
    switch (event.type) {
      case 'feed':
        return formatFeedDetails(event.feed_mode, event.feed_amount, event.feed_unit, event.feed_type, event.feed_side, event.duration_ms);
      case 'diaper':
        return formatDiaperType(event.diaper_subtype);
      case 'nap':
        return formatNapDuration(event.nap_start, event.nap_end);
      default:
        return event.note_text ?? '';
    }
  }

  function getTwinColor(label: string): string {
    return label === 'A' ? pair.twin_a_color : pair.twin_b_color;
  }

  function getTwinName(label: string): string {
    return label === 'A' ? pair.twin_a_name : pair.twin_b_name;
  }

  const handleExportCsv = useCallback(() => {
    const headers = ['Date', 'Time', 'Twin', 'Event', 'Details', 'Duration (min)', 'Side', 'Amount', 'Note', 'Logged By'];
    const rows = filtered.map((event) => {
      const date = new Date(event.timestamp);
      const durationMin = event.duration_ms ? (event.duration_ms / 60000).toFixed(1) : '';
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        getTwinName(event.twin_label),
        event.type,
        getDetail(event),
        durationMin,
        event.feed_side ?? '',
        event.feed_amount ? `${event.feed_amount}${event.feed_unit ?? ''}` : '',
        event.note_text ?? '',
        event.logged_by_name,
      ].map((v) => escapeCsv(String(v)));
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twintrack-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const handleSaveEdit = useCallback(async (updated: TrackedEvent) => {
    setEditingEvent(null);
    try {
      const serverEvent = await updateEvent(updated.id, {
        twin_label: updated.twin_label,
        type: updated.type,
        timestamp: updated.timestamp,
        feed_mode: updated.feed_mode,
        feed_type: updated.feed_type,
        feed_amount: updated.feed_amount,
        feed_unit: updated.feed_unit,
        feed_side: updated.feed_side,
        duration_ms: updated.duration_ms,
        diaper_subtype: updated.diaper_subtype,
        nap_start: updated.nap_start,
        nap_end: updated.nap_end,
        note_text: updated.note_text,
      });
      const store = useAppStore.getState();
      store.setRecentEvents(
        store.recentEvents.map((e) => e.id === serverEvent.id ? serverEvent : e)
      );
    } catch (err) {
      const { setSyncError } = useAppStore.getState();
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(`Save failed: ${msg}`);
    }
  }, []);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    setEditingEvent(null);
    try {
      await deleteEvent(eventId);
      useAppStore.getState().removeEvent(eventId);
    } catch (err) {
      const { setSyncError } = useAppStore.getState();
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(`Delete failed: ${msg}`);
    }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filterCaregiver}
          onChange={(e) => setFilterCaregiver(e.target.value)}
          className="bg-white/5 text-text-secondary text-xs rounded-lg px-3 py-2 border border-white/10
                     focus:outline-none focus:border-white/20"
        >
          <option value="all">All caregivers</option>
          {caregivers.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="ml-auto text-xs text-text-muted hover:text-text-secondary px-2 py-1 rounded-lg
                     bg-white/5 transition-colors"
        >
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'} &#x25BE;
        </button>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="text-xs font-semibold text-twin-a px-3 py-1.5 rounded-lg bg-twin-a/10
                     active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-text-muted font-medium">Time</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Twin</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Event</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Details</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Duration</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">By</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-muted">
                  No activity found
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-white/5 last:border-0 active:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => setEditingEvent(event)}
                >
                  <td className="py-2.5 px-2 text-text-secondary whitespace-nowrap">
                    {formatTime(event.timestamp)}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="font-medium" style={{ color: getTwinColor(event.twin_label) }}>
                      {getTwinName(event.twin_label)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-text-primary capitalize">{event.type}</td>
                  <td className="py-2.5 px-2 text-text-secondary max-w-[120px] truncate">
                    {getDetail(event)}
                  </td>
                  <td className="py-2.5 px-2 text-text-secondary whitespace-nowrap font-mono">
                    {formatDurationMin(event.duration_ms)}
                  </td>
                  <td className="py-2.5 px-2 text-text-muted whitespace-nowrap">
                    {event.logged_by_name}
                  </td>
                  <td className="py-2.5 px-1 text-text-muted">
                    <span className="text-[10px]">✏️</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit sheet */}
      {editingEvent && (
        <EditEventSheet
          event={editingEvent}
          pair={pair}
          onSave={handleSaveEdit}
          onDelete={handleDeleteEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}

// ─── Edit Event Bottom Sheet ────────────────────────────────────────────────

interface EditEventSheetProps {
  event: TrackedEvent;
  pair: TwinPair;
  onSave: (updated: TrackedEvent) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

function EditEventSheet({ event, pair, onSave, onDelete, onClose }: EditEventSheetProps) {
  const [twin, setTwin] = useState<TwinLabel>(event.twin_label);
  const [type, setType] = useState<EventType>(event.type);
  const [timestamp, setTimestamp] = useState(
    new Date(event.timestamp).toISOString().slice(0, 16)
  );
  const [feedMode, setFeedMode] = useState<FeedMode | null>(event.feed_mode);
  const [feedType, setFeedType] = useState<FeedType | null>(event.feed_type);
  const [feedAmount, setFeedAmount] = useState(event.feed_amount?.toString() ?? '');
  const [feedSide, setFeedSide] = useState<FeedSide | null>(event.feed_side);
  const [durationMin, setDurationMin] = useState(
    event.duration_ms ? Math.round(event.duration_ms / 60000).toString() : ''
  );
  const [diaperSubtype, setDiaperSubtype] = useState<DiaperSubtype | null>(event.diaper_subtype);
  const [noteText, setNoteText] = useState(event.note_text ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const twinAName = pair.twin_a_name;
  const twinBName = pair.twin_b_name;

  function handleSave() {
    const updated: TrackedEvent = {
      ...event,
      twin_label: twin,
      type,
      timestamp: new Date(timestamp).toISOString(),
      feed_mode: type === 'feed' ? feedMode : null,
      feed_type: type === 'feed' ? feedType : null,
      feed_amount: type === 'feed' && feedAmount ? parseFloat(feedAmount) : null,
      feed_unit: type === 'feed' && feedAmount ? (event.feed_unit ?? 'oz') : null,
      feed_side: type === 'feed' ? feedSide : null,
      duration_ms: durationMin ? parseInt(durationMin) * 60000 : null,
      diaper_subtype: type === 'diaper' ? diaperSubtype : null,
      note_text: noteText.trim() || null,
    };
    onSave(updated);
  }

  const inputClass = "w-full min-h-[48px] px-4 rounded-xl bg-white/5 text-text-primary text-sm border border-white/10 focus:outline-none focus:border-white/25";
  const pillClass = (active: boolean) =>
    `flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-all active:scale-95 ${
      active ? 'bg-twin-a text-[#0F1117]' : 'bg-white/5 text-text-secondary'
    }`;

  return (
    <BottomSheet open={true} onClose={onClose} title="Edit Activity">
      <div className="flex flex-col gap-4">
        {/* Twin */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Twin</label>
          <div className="flex gap-2">
            <button onClick={() => setTwin('A')} className={pillClass(twin === 'A')}>
              {twinAName}
            </button>
            <button onClick={() => setTwin('B')} className={pillClass(twin === 'B')}>
              {twinBName}
            </button>
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Type</label>
          <div className="flex gap-2">
            {(['feed', 'diaper', 'nap', 'note'] as EventType[]).map((t) => (
              <button key={t} onClick={() => setType(t)} className={pillClass(type === t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Timestamp */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Time</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Duration */}
        {(type === 'feed' || type === 'nap') && (
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Duration (minutes)</label>
            <input
              type="number"
              inputMode="numeric"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        )}

        {/* Feed fields */}
        {type === 'feed' && (
          <>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Feed Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setFeedMode('bottle')} className={pillClass(feedMode === 'bottle')}>
                  🍼 Bottle
                </button>
                <button onClick={() => setFeedMode('breast')} className={pillClass(feedMode === 'breast')}>
                  🤱 Breast
                </button>
              </div>
            </div>

            {feedMode === 'bottle' && (
              <>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Feed Type</label>
                  <div className="flex gap-2">
                    <button onClick={() => setFeedType('formula')} className={pillClass(feedType === 'formula')}>
                      Formula
                    </button>
                    <button onClick={() => setFeedType('breastmilk')} className={pillClass(feedType === 'breastmilk')}>
                      Breast Milk
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Amount (oz)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={feedAmount}
                    onChange={(e) => setFeedAmount(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {feedMode === 'breast' && (
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Side</label>
                <div className="flex gap-2">
                  {(['left', 'right', 'both'] as FeedSide[]).map((s) => (
                    <button key={s} onClick={() => setFeedSide(s)} className={pillClass(feedSide === s)}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Diaper fields */}
        {type === 'diaper' && (
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Diaper Type</label>
            <div className="flex gap-2">
              {(['wet', 'dirty', 'both'] as DiaperSubtype[]).map((s) => (
                <button key={s} onClick={() => setDiaperSubtype(s)} className={pillClass(diaperSubtype === s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Note</label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          className="min-h-[60px] rounded-xl bg-twin-a text-[#0F1117] font-bold text-base
                     active:scale-[0.98] transition-all"
        >
          Save Changes
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="min-h-[48px] rounded-xl bg-danger/10 text-danger font-semibold text-sm
                       active:scale-[0.98] transition-all"
          >
            Delete Event
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
              onClick={() => onDelete(event.id)}
              className="flex-1 min-h-[48px] rounded-xl bg-danger text-[#0F1117] text-sm font-bold
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
