import { describe, expect, it } from 'vitest';
import { elapsedMs, formatDuration, formatTime, formatTimeAgo, getTimeMs } from './time';

describe('time utilities', () => {
  it('formats invalid timestamps as harmless placeholders', () => {
    expect(getTimeMs('not-a-date')).toBeNull();
    expect(formatTime('not-a-date')).toBe('--');
    expect(formatTimeAgo('not-a-date')).toBe('unknown');
    expect(elapsedMs('not-a-date')).toBe(0);
  });

  it('clamps invalid durations to zero', () => {
    expect(formatDuration(Number.NaN)).toBe('00:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('00:00');
  });
});
