import type { DiaperSubtype, FeedMode, FeedSide, FeedType, FeedUnit } from '../types';

export function formatFeedDetails(
  mode: FeedMode | null,
  amount: number | null,
  unit: FeedUnit | null,
  feedType: FeedType | null,
  side: FeedSide | null,
  durationMs: number | null
): string {
  if (mode === 'bottle') {
    const parts: string[] = [];
    if (feedType) parts.push(feedType === 'breastmilk' ? 'BM' : 'Formula');
    if (amount && unit) parts.push(`${amount}${unit}`);
    return parts.join(' · ') || 'Bottle';
  }
  if (mode === 'breast') {
    const parts: string[] = [];
    if (side) parts.push(side.charAt(0).toUpperCase() + side.slice(1));
    if (durationMs) {
      const min = Math.round(durationMs / 60000);
      parts.push(`${min}min`);
    }
    return parts.join(' · ') || 'Breast';
  }
  return 'Feed';
}

export function formatDiaperType(subtype: DiaperSubtype | null): string {
  if (!subtype) return 'Diaper';
  return subtype.charAt(0).toUpperCase() + subtype.slice(1);
}

export function formatNapDuration(startMs: string | null, endMs: string | null): string {
  if (!startMs || !endMs) return 'Nap';
  const duration = new Date(endMs).getTime() - new Date(startMs).getTime();
  const min = Math.round(duration / 60000);
  if (min < 60) return `${min}min nap`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m nap`;
}
