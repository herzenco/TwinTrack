import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOTTLE_FEED_TYPE,
  DIAPER_LOG_OPTIONS,
  FEED_AMOUNT_PRESETS,
  PAST_BREAST_SIDE_OPTIONS,
  PUMPING_OZ_PRESETS,
  getPumpingStartedAt,
  getWakeWindowEndsAt,
} from './loggingRules';

describe('logging rules', () => {
  it('defaults bottle feed logging to breast milk', () => {
    expect(DEFAULT_BOTTLE_FEED_TYPE).toBe('breastmilk');
  });

  it('offers half-ounce feeding and pumping presets', () => {
    expect(FEED_AMOUNT_PRESETS).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]);
    expect(PUMPING_OZ_PRESETS).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]);
  });

  it('sets a pumping session start time to now minus duration', () => {
    const now = new Date('2026-05-12T15:30:00.000Z');
    expect(getPumpingStartedAt(20, now).toISOString()).toBe('2026-05-12T15:10:00.000Z');
  });

  it('limits past breast side choices to the starting side', () => {
    expect(PAST_BREAST_SIDE_OPTIONS.map((option) => option.side)).toEqual(['left', 'right']);
  });

  it('logs only dirty diapers from the current UI', () => {
    expect(DIAPER_LOG_OPTIONS).toEqual([{ subtype: 'dirty', label: 'Dirty', icon: '💩' }]);
  });

  it('ends the wake window sixty minutes after the feed started', () => {
    expect(getWakeWindowEndsAt('2026-05-12T09:15:00.000Z')?.toISOString()).toBe('2026-05-12T10:15:00.000Z');
  });

  it('does not create a wake window from an invalid feed timestamp', () => {
    expect(getWakeWindowEndsAt('not-a-date')).toBeNull();
  });
});
