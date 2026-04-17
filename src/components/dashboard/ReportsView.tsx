import { useState, useMemo, useCallback } from 'react';
import type { TwinPair, TwinLabel, TrackedEvent } from '../../types';
import { getEvents } from '../../lib/database';
import { formatFeedDetails, formatDiaperType, formatNapDuration } from '../../utils/formatters';

interface ReportsViewProps {
  pair: TwinPair;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDurationMin(ms: number | null): string {
  if (!ms) return '';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

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

export function ReportsView({ pair }: ReportsViewProps) {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [selectedTwin, setSelectedTwin] = useState<TwinLabel>('A');
  const [startDate, setStartDate] = useState(toLocalDateStr(weekAgo));
  const [endDate, setEndDate] = useState(toLocalDateStr(today));
  const [reportEvents, setReportEvents] = useState<TrackedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const twinName = selectedTwin === 'A' ? pair.twin_a_name : pair.twin_b_name;
  const twinColor = selectedTwin === 'A' ? pair.twin_a_color : pair.twin_b_color;

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const events = await getEvents({
        pairId: pair.id,
        twinLabel: selectedTwin,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        from: 0,
        to: 9999,
      });
      setReportEvents(events);
      setHasRun(true);
    } finally {
      setLoading(false);
    }
  }, [pair.id, selectedTwin, startDate, endDate]);

  const summary = useMemo(() => {
    const feeds = reportEvents.filter((e) => e.type === 'feed');
    const bottleFeeds = feeds.filter((e) => e.feed_mode === 'bottle');
    const breastFeeds = feeds.filter((e) => e.feed_mode === 'breast');
    const diapers = reportEvents.filter((e) => e.type === 'diaper');
    const naps = reportEvents.filter((e) => e.type === 'nap');

    const totalBottleOz = bottleFeeds.reduce((s, e) => s + (e.feed_amount ?? 0), 0);
    const totalBreastMs = breastFeeds.reduce((s, e) => s + (e.duration_ms ?? 0), 0);
    const totalNapMs = naps.reduce((s, e) => s + (e.duration_ms ?? 0), 0);

    const wetDiapers = diapers.filter((e) => e.diaper_subtype === 'wet' || e.diaper_subtype === 'both').length;
    const dirtyDiapers = diapers.filter((e) => e.diaper_subtype === 'dirty' || e.diaper_subtype === 'both').length;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);

    return {
      totalEvents: reportEvents.length,
      feeds: feeds.length,
      bottleFeeds: bottleFeeds.length,
      breastFeeds: breastFeeds.length,
      totalBottleOz,
      totalBreastMs,
      diapers: diapers.length,
      wetDiapers,
      dirtyDiapers,
      naps: naps.length,
      totalNapMs,
      days,
      avgFeedsPerDay: (feeds.length / days).toFixed(1),
      avgDiapersPerDay: (diapers.length / days).toFixed(1),
    };
  }, [reportEvents, startDate, endDate]);

  const handleExportCsv = useCallback(() => {
    const headers = ['Date', 'Time', 'Event', 'Details', 'Duration', 'Side', 'Amount', 'Note', 'Logged By'];
    const rows = reportEvents.map((event) => {
      const date = new Date(event.timestamp);
      const durationMin = event.duration_ms ? (event.duration_ms / 60000).toFixed(1) : '';
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    link.download = `twintrack-${twinName.toLowerCase()}-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportEvents, twinName, startDate, endDate]);

  const statCardClass = 'flex flex-col items-center gap-1 rounded-xl bg-white/5 p-3 border border-white/5';

  return (
    <div className="flex flex-col gap-4">
      {/* Twin selector */}
      <div>
        <label className="text-xs text-text-muted mb-1.5 block">Baby</label>
        <div className="flex gap-2">
          {(['A', 'B'] as TwinLabel[]).map((label) => {
            const name = label === 'A' ? pair.twin_a_name : pair.twin_b_name;
            const color = label === 'A' ? pair.twin_a_color : pair.twin_b_color;
            const emoji = label === 'A' ? pair.twin_a_emoji : pair.twin_b_emoji;
            const active = selectedTwin === label;
            return (
              <button
                key={label}
                onClick={() => { setSelectedTwin(label); setHasRun(false); }}
                className={`flex-1 min-h-[52px] rounded-xl text-sm font-bold transition-all active:scale-95
                  ${active ? 'text-[#0F1117]' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                style={active ? { backgroundColor: color } : undefined}
              >
                {emoji} {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date range */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-text-muted mb-1.5 block">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full min-h-[48px] px-3 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/20 [color-scheme:dark]"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-muted mb-1.5 block">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full min-h-[48px] px-3 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/20 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="min-h-[60px] rounded-xl text-base font-bold active:scale-[0.97] transition-all
                   text-[#0F1117] disabled:opacity-50"
        style={{ backgroundColor: twinColor }}
      >
        {loading ? 'Loading...' : 'Generate Report'}
      </button>

      {/* Results */}
      {hasRun && (
        <>
          {/* Summary stats */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                {twinName} — {summary.days} day{summary.days !== 1 ? 's' : ''}
              </h3>
              <span className="text-xs text-text-muted">{summary.totalEvents} events</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className={statCardClass}>
                <span className="text-lg font-bold text-text-primary">{summary.feeds}</span>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">Feeds</span>
                <span className="text-[10px] text-text-muted">{summary.avgFeedsPerDay}/day</span>
              </div>
              <div className={statCardClass}>
                <span className="text-lg font-bold text-text-primary">{summary.diapers}</span>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">Diapers</span>
                <span className="text-[10px] text-text-muted">{summary.avgDiapersPerDay}/day</span>
              </div>
              <div className={statCardClass}>
                <span className="text-lg font-bold text-text-primary">{summary.naps}</span>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">Naps</span>
                <span className="text-[10px] text-text-muted">{formatDurationMin(summary.totalNapMs) || '0m'} total</span>
              </div>
            </div>

            {/* Feed breakdown */}
            {summary.feeds > 0 && (
              <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                <p className="text-xs font-semibold text-text-secondary mb-2">Feed Breakdown</p>
                <div className="flex gap-4 text-xs text-text-muted">
                  {summary.bottleFeeds > 0 && (
                    <span>Bottle: {summary.bottleFeeds} ({summary.totalBottleOz}oz total)</span>
                  )}
                  {summary.breastFeeds > 0 && (
                    <span>Breast: {summary.breastFeeds} ({formatDurationMin(summary.totalBreastMs)} total)</span>
                  )}
                </div>
              </div>
            )}

            {/* Diaper breakdown */}
            {summary.diapers > 0 && (
              <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                <p className="text-xs font-semibold text-text-secondary mb-2">Diaper Breakdown</p>
                <div className="flex gap-4 text-xs text-text-muted">
                  <span>Wet: {summary.wetDiapers}</span>
                  <span>Dirty: {summary.dirtyDiapers}</span>
                </div>
              </div>
            )}
          </div>

          {/* Event list */}
          {reportEvents.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Events</h3>
                <button
                  onClick={handleExportCsv}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                  style={{ backgroundColor: `${twinColor}15`, color: twinColor }}
                >
                  Export CSV
                </button>
              </div>

              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Date</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Time</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Event</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Details</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportEvents.map((event) => (
                      <tr key={event.id} className="border-b border-white/5 last:border-0">
                        <td className="py-2 px-2 text-text-secondary whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2 px-2 text-text-secondary whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-2 text-text-primary capitalize">{event.type}</td>
                        <td className="py-2 px-2 text-text-secondary max-w-[140px] truncate">
                          {getDetail(event)}
                        </td>
                        <td className="py-2 px-2 text-text-secondary whitespace-nowrap font-mono">
                          {formatDurationMin(event.duration_ms)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportEvents.length === 0 && (
            <p className="text-center py-8 text-text-muted text-sm">
              No events found for {twinName} in this date range.
            </p>
          )}
        </>
      )}
    </div>
  );
}
