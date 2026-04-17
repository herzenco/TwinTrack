export type TwinLabel = 'A' | 'B';
export type EventType = 'feed' | 'diaper' | 'nap' | 'note';
export type FeedMode = 'bottle' | 'breast';
export type FeedUnit = 'oz' | 'ml';
export type FeedType = 'formula' | 'breastmilk';
export type FeedSide = 'left' | 'right' | 'both';
export type DiaperSubtype = 'wet' | 'dirty' | 'both';
export type PairRole = 'owner' | 'caregiver';

export interface FeedSegment {
  side: FeedSide;
  duration_ms: number;
}

export interface TwinPair {
  id: string;
  created_by: string;
  created_at: string;
  encryption_key_hash: string | null;
  encryption_salt: string | null;
  twin_a_name: string;
  twin_a_color: string;
  twin_a_emoji: string;
  twin_b_name: string;
  twin_b_color: string;
  twin_b_emoji: string;
  feed_interval_minutes: number;
  nap_nudge_minutes: number;
  feed_nudge_minutes: number;
  timezone: string;
}

export interface PairMember {
  id: string;
  pair_id: string;
  user_id: string;
  role: PairRole;
  display_name: string;
  joined_at: string;
}

export interface TrackedEvent {
  id: string;
  pair_id: string;
  twin_label: TwinLabel;
  type: EventType;
  timestamp: string;
  logged_by_uid: string;
  logged_by_name: string;
  encrypted: boolean;
  feed_mode: FeedMode | null;
  feed_amount: number | null;
  feed_unit: FeedUnit | null;
  feed_type: FeedType | null;
  feed_side: FeedSide | null;
  feed_segments: FeedSegment[] | null;
  duration_ms: number | null;
  diaper_subtype: DiaperSubtype | null;
  nap_start: string | null;
  nap_end: string | null;
  note_text: string | null;
  created_at: string;
}

export interface ActiveTimer {
  id: string;
  pair_id: string;
  twin_label: TwinLabel;
  type: 'feed' | 'nap';
  started_at: string;
  started_by_uid: string;
  started_by_name: string;
  feed_side: FeedSide | null;
}

export interface Invite {
  id: string;
  pair_id: string;
  code: string;
  created_by: string;
  expires_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

export interface UserProfile {
  id: string;
  display_name: string;
  active_pair_id: string | null;
  created_at: string;
}

export interface DashboardSummary {
  twin_label: TwinLabel;
  feed_count: number;
  diaper_count: number;
  nap_minutes: number;
  formula_oz: number;
  breastmilk_oz: number;
}
