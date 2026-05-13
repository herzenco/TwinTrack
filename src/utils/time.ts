type TimeInput = string | number | Date | null | undefined;

export function getTimeMs(value: TimeInput): number | null {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function formatDuration(ms: number): string {
  const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatTimeAgo(timestamp: TimeInput): string {
  const now = Date.now();
  const then = getTimeMs(timestamp);
  if (then === null) return 'unknown';
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMin % 60}m ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function formatTime(timestamp: TimeInput): string {
  const ms = getTimeMs(timestamp);
  if (ms === null) return '--';
  return new Date(ms).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function elapsedMs(startedAt: string): number {
  const startedAtMs = getTimeMs(startedAt);
  if (startedAtMs === null) return 0;
  return Math.max(0, Date.now() - startedAtMs);
}
