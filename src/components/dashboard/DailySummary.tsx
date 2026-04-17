import { useMemo } from 'react';
import type { TrackedEvent, TwinPair, TwinLabel } from '../../types';

interface DailySummaryProps {
  events: TrackedEvent[];
  pair: TwinPair;
}

interface TwinDaySummary {
  feedCount: number;
  diaperWet: number;
  diaperDirty: number;
  diaperBoth: number;
  napMinutes: number;
  breastLeft: number;
  breastRight: number;
  breastBoth: number;
  formulaOz: number;
  breastmilkOz: number;
}

function isToday(ts: string): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(ts: string): boolean {
  const d = new Date(ts);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

function buildSummary(events: TrackedEvent[], dateFn: (ts: string) => boolean, twin: TwinLabel): TwinDaySummary {
  const filtered = events.filter((e) => e.twin_label === twin && dateFn(e.timestamp));
  return {
    feedCount: filtered.filter((e) => e.type === 'feed').length,
    diaperWet: filtered.filter((e) => e.type === 'diaper' && e.diaper_subtype === 'wet').length,
    diaperDirty: filtered.filter((e) => e.type === 'diaper' && e.diaper_subtype === 'dirty').length,
    diaperBoth: filtered.filter((e) => e.type === 'diaper' && e.diaper_subtype === 'both').length,
    napMinutes: filtered
      .filter((e) => e.type === 'nap' && e.duration_ms)
      .reduce((sum, e) => sum + Math.round((e.duration_ms ?? 0) / 60000), 0),
    breastLeft: filtered.filter((e) => e.type === 'feed' && e.feed_mode === 'breast' && e.feed_side === 'left').length,
    breastRight: filtered.filter((e) => e.type === 'feed' && e.feed_mode === 'breast' && e.feed_side === 'right').length,
    breastBoth: filtered.filter((e) => e.type === 'feed' && e.feed_mode === 'breast' && e.feed_side === 'both').length,
    formulaOz: filtered
      .filter((e) => e.type === 'feed' && e.feed_mode === 'bottle' && e.feed_type === 'formula')
      .reduce((sum, e) => sum + (e.feed_amount ?? 0), 0),
    breastmilkOz: filtered
      .filter((e) => e.type === 'feed' && e.feed_mode === 'bottle' && e.feed_type === 'breastmilk')
      .reduce((sum, e) => sum + (e.feed_amount ?? 0), 0),
  };
}

export function DailySummary({ events, pair }: DailySummaryProps) {
  const todayA = useMemo(() => buildSummary(events, isToday, 'A'), [events]);
  const todayB = useMemo(() => buildSummary(events, isToday, 'B'), [events]);
  const yesterdayA = useMemo(() => buildSummary(events, isYesterday, 'A'), [events]);
  const yesterdayB = useMemo(() => buildSummary(events, isYesterday, 'B'), [events]);

  return (
    <div className="flex flex-col gap-4">
      <TwinDayCard
        name={pair.twin_a_name}
        color={pair.twin_a_color}
        emoji={pair.twin_a_emoji}
        today={todayA}
        yesterday={yesterdayA}
      />
      <TwinDayCard
        name={pair.twin_b_name}
        color={pair.twin_b_color}
        emoji={pair.twin_b_emoji}
        today={todayB}
        yesterday={yesterdayB}
      />
    </div>
  );
}

function TwinDayCard({
  name,
  color,
  emoji,
  today,
  yesterday,
}: {
  name: string;
  color: string;
  emoji: string;
  today: TwinDaySummary;
  yesterday: TwinDaySummary;
}) {
  const totalDiapersToday = today.diaperWet + today.diaperDirty + today.diaperBoth;
  const totalDiapersYesterday = yesterday.diaperWet + yesterday.diaperDirty + yesterday.diaperBoth;

  return (
    <div className="rounded-2xl bg-bg-card/80 border p-4" style={{ borderColor: `${color}25` }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{emoji}</span>
        <h3 className="text-sm font-bold" style={{ color }}>{name}</h3>
        <span className="text-[10px] text-text-muted ml-auto">Today vs Yesterday</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <CompareCell label="Feeds" today={today.feedCount} yesterday={yesterday.feedCount} />
        <CompareCell label="Diapers" today={totalDiapersToday} yesterday={totalDiapersYesterday} />
        <CompareCell
          label="Nap"
          today={today.napMinutes}
          yesterday={yesterday.napMinutes}
          suffix="min"
        />
      </div>

      {/* Breast side tracking */}
      {(today.breastLeft > 0 || today.breastRight > 0 || today.breastBoth > 0) && (
        <div className="border-t border-white/5 pt-3 mb-3">
          <p className="text-[10px] text-text-muted mb-2 font-medium">Breast Side Today</p>
          <div className="flex gap-3">
            <span className="text-xs text-text-secondary">
              L: <span className="font-bold text-text-primary">{today.breastLeft}</span>
            </span>
            <span className="text-xs text-text-secondary">
              R: <span className="font-bold text-text-primary">{today.breastRight}</span>
            </span>
            {today.breastBoth > 0 && (
              <span className="text-xs text-text-secondary">
                Both: <span className="font-bold text-text-primary">{today.breastBoth}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottle intake */}
      {(today.formulaOz > 0 || today.breastmilkOz > 0) && (
        <div className="border-t border-white/5 pt-3 mb-3">
          <p className="text-[10px] text-text-muted mb-2 font-medium">Bottle Intake Today</p>
          <div className="flex gap-3">
            {today.formulaOz > 0 && (
              <span className="text-xs text-text-secondary">
                Formula: <span className="font-bold text-text-primary">{today.formulaOz}oz</span>
              </span>
            )}
            {today.breastmilkOz > 0 && (
              <span className="text-xs text-text-secondary">
                BM: <span className="font-bold text-text-primary">{today.breastmilkOz}oz</span>
              </span>
            )}
            <span className="text-xs text-text-secondary">
              Total: <span className="font-bold text-text-primary">{today.formulaOz + today.breastmilkOz}oz</span>
            </span>
          </div>
        </div>
      )}

      {/* Diaper breakdown */}
      {totalDiapersToday > 0 && (
        <div className="border-t border-white/5 pt-3">
          <p className="text-[10px] text-text-muted mb-2 font-medium">Diaper Breakdown Today</p>
          <div className="flex gap-3">
            <span className="text-xs text-text-secondary">
              Wet: <span className="font-bold text-text-primary">{today.diaperWet}</span>
            </span>
            <span className="text-xs text-text-secondary">
              Dirty: <span className="font-bold text-text-primary">{today.diaperDirty}</span>
            </span>
            {today.diaperBoth > 0 && (
              <span className="text-xs text-text-secondary">
                Both: <span className="font-bold text-text-primary">{today.diaperBoth}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareCell({
  label,
  today,
  yesterday,
  suffix = '',
}: {
  label: string;
  today: number;
  yesterday: number;
  suffix?: string;
}) {
  const diff = today - yesterday;
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-text-primary">
        {today}{suffix && <span className="text-xs font-normal text-text-muted">{suffix}</span>}
      </p>
      <p className="text-[10px] text-text-secondary">{label}</p>
      {yesterday > 0 && (
        <p className={`text-[10px] font-medium mt-0.5 ${diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-text-muted'}`}>
          {diff > 0 ? '+' : ''}{diff}{suffix} vs yday
        </p>
      )}
    </div>
  );
}
