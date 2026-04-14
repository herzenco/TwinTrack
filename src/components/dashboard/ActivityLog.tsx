import { useState, useMemo } from 'react';
import type { TrackedEvent, TwinPair } from '../../types';
import { formatTime } from '../../utils/time';
import { formatFeedDetails, formatDiaperType, formatNapDuration } from '../../utils/formatters';

interface ActivityLogProps {
  events: TrackedEvent[];
  pair: TwinPair;
  caregivers: string[];
}

type SortDir = 'asc' | 'desc';

export function ActivityLog({ events, pair, caregivers }: ActivityLogProps) {
  const [filterCaregiver, setFilterCaregiver] = useState<string>('all');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-text-muted font-medium">Time</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Twin</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Event</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Details</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-muted">
                  No activity found
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr key={event.id} className="border-b border-white/5 last:border-0">
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
                  <td className="py-2.5 px-2 text-text-muted whitespace-nowrap">
                    {event.logged_by_name}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
