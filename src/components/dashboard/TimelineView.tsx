import { useState, useMemo } from 'react';
import type { TrackedEvent, TwinLabel, EventType, TwinPair } from '../../types';
import { formatTime } from '../../utils/time';
import { formatFeedDetails, formatDiaperType, formatNapDuration } from '../../utils/formatters';

interface TimelineViewProps {
  events: TrackedEvent[];
  pair: TwinPair;
}

const EVENT_ICONS: Record<EventType, string> = {
  feed: '🍼',
  diaper: '🧷',
  nap: '😴',
  note: '📝',
};

export function TimelineView({ events, pair }: TimelineViewProps) {
  const [filterTwin, setFilterTwin] = useState<TwinLabel | 'all'>('all');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterTwin !== 'all' && e.twin_label !== filterTwin) return false;
      if (filterType !== 'all' && e.type !== filterType) return false;
      return true;
    });
  }, [events, filterTwin, filterType]);

  function getEventDetail(event: TrackedEvent): string {
    switch (event.type) {
      case 'feed':
        return formatFeedDetails(
          event.feed_mode,
          event.feed_amount,
          event.feed_unit,
          event.feed_type,
          event.feed_side,
          event.duration_ms,
        );
      case 'diaper':
        return formatDiaperType(event.diaper_subtype);
      case 'nap':
        return formatNapDuration(event.nap_start, event.nap_end);
      case 'note':
        return event.note_text ?? 'Note';
      default:
        return '';
    }
  }

  function getTwinColor(label: TwinLabel): string {
    return label === 'A' ? pair.twin_a_color : pair.twin_b_color;
  }

  function getTwinName(label: TwinLabel): string {
    return label === 'A' ? pair.twin_a_name : pair.twin_b_name;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <FilterPill
          label="All"
          active={filterTwin === 'all'}
          onClick={() => setFilterTwin('all')}
        />
        <FilterPill
          label={pair.twin_a_name}
          active={filterTwin === 'A'}
          onClick={() => setFilterTwin('A')}
          color={pair.twin_a_color}
        />
        <FilterPill
          label={pair.twin_b_name}
          active={filterTwin === 'B'}
          onClick={() => setFilterTwin('B')}
          color={pair.twin_b_color}
        />
        <div className="w-px bg-white/10 shrink-0" />
        <FilterPill label="All" active={filterType === 'all'} onClick={() => setFilterType('all')} />
        {(['feed', 'diaper', 'nap', 'note'] as EventType[]).map((t) => (
          <FilterPill
            key={t}
            label={`${EVENT_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            active={filterType === t}
            onClick={() => setFilterType(t)}
          />
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">No events found</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((event) => {
            const twinColor = getTwinColor(event.twin_label);
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-0.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: twinColor }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{EVENT_ICONS[event.type]}</span>
                    <span className="text-xs font-semibold" style={{ color: twinColor }}>
                      {getTwinName(event.twin_label)}
                    </span>
                    <span className="text-xs text-text-muted ml-auto shrink-0">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {getEventDetail(event)}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    by {event.logged_by_name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
        ${active
          ? 'text-bg-primary'
          : 'bg-white/5 text-text-secondary hover:bg-white/10'
        }`}
      style={active ? { backgroundColor: color ?? '#F0F0F5' } : undefined}
    >
      {label}
    </button>
  );
}
