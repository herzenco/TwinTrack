import { supabase } from './supabase';
import type {
  TwinPair,
  PairMember,
  TrackedEvent,
  ActiveTimer,
  Invite,
  UserProfile,
  DashboardSummary,
  TwinLabel,
  EventType,
  FeedMode,
  FeedUnit,
  FeedType,
  FeedSide,
  DiaperSubtype,
} from '../types';

// ---------------------------------------------------------------------------
// Twin Pairs
// ---------------------------------------------------------------------------

export interface CreateTwinPairParams {
  twin_a_name?: string;
  twin_a_color?: string;
  twin_a_emoji?: string;
  twin_b_name?: string;
  twin_b_color?: string;
  twin_b_emoji?: string;
  feed_interval_minutes?: number;
  timezone?: string;
  encryption_key_hash?: string;
  encryption_salt?: string;
}

export async function createTwinPair(
  params: CreateTwinPairParams
): Promise<TwinPair> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated');

  const userId = userData.user.id;

  const { data, error } = await supabase
    .from('twin_pairs')
    .insert({ ...params, created_by: userId })
    .select()
    .single();

  if (error) throw error;

  // Also create the owner pair_member row
  const { error: memberError } = await supabase.from('pair_members').insert({
    pair_id: data.id,
    user_id: userId,
    role: 'owner' as const,
    display_name:
      (await getUserProfile(userId))?.display_name ?? 'Owner',
  });

  if (memberError) throw memberError;

  // Set this as the user's active pair
  await updateUserProfile(userId, { active_pair_id: data.id });

  return data as TwinPair;
}

export async function getTwinPair(pairId: string): Promise<TwinPair | null> {
  const { data, error } = await supabase
    .from('twin_pairs')
    .select('*')
    .eq('id', pairId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data as TwinPair;
}

export async function updateTwinPair(
  pairId: string,
  updates: Partial<
    Pick<
      TwinPair,
      | 'twin_a_name'
      | 'twin_a_color'
      | 'twin_a_emoji'
      | 'twin_b_name'
      | 'twin_b_color'
      | 'twin_b_emoji'
      | 'feed_interval_minutes'
      | 'nap_nudge_minutes'
      | 'feed_nudge_minutes'
      | 'timezone'
      | 'encryption_key_hash'
      | 'encryption_salt'
    >
  >
): Promise<TwinPair> {
  const { data, error } = await supabase
    .from('twin_pairs')
    .update(updates)
    .eq('id', pairId)
    .select()
    .single();

  if (error) throw error;
  return data as TwinPair;
}

// ---------------------------------------------------------------------------
// Pair Members
// ---------------------------------------------------------------------------

export async function getPairMembers(
  pairId: string
): Promise<PairMember[]> {
  const { data, error } = await supabase
    .from('pair_members')
    .select('*')
    .eq('pair_id', pairId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PairMember[];
}

export async function removePairMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('pair_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface CreateEventParams {
  pair_id: string;
  twin_label: TwinLabel;
  type: EventType;
  timestamp?: string;
  logged_by_uid: string;
  logged_by_name: string;
  encrypted?: boolean;
  feed_mode?: FeedMode | null;
  feed_amount?: number | null;
  feed_unit?: FeedUnit | null;
  feed_type?: FeedType | null;
  feed_side?: FeedSide | null;
  duration_ms?: number | null;
  diaper_subtype?: DiaperSubtype | null;
  nap_start?: string | null;
  nap_end?: string | null;
  note_text?: string | null;
}

export async function createEvent(
  params: CreateEventParams
): Promise<TrackedEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert(params)
    .select()
    .single();

  if (error) throw error;
  return data as TrackedEvent;
}

export interface GetEventsParams {
  pairId: string;
  from?: number; // pagination start index
  to?: number; // pagination end index
  twinLabel?: TwinLabel;
  type?: EventType;
  loggedByUid?: string;
}

export async function getEvents(
  params: GetEventsParams
): Promise<TrackedEvent[]> {
  const { pairId, from = 0, to = 49, twinLabel, type, loggedByUid } = params;

  let query = supabase
    .from('events')
    .select('*')
    .eq('pair_id', pairId)
    .order('timestamp', { ascending: false })
    .range(from, to);

  if (twinLabel) {
    query = query.eq('twin_label', twinLabel);
  }
  if (type) {
    query = query.eq('type', type);
  }
  if (loggedByUid) {
    query = query.eq('logged_by_uid', loggedByUid);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TrackedEvent[];
}

export async function updateEventNote(
  eventId: string,
  noteText: string
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ note_text: noteText })
    .eq('id', eventId);

  if (error) throw error;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Active Timers
// ---------------------------------------------------------------------------

export async function updateTimerSide(
  timerId: string,
  feedSide: FeedSide
): Promise<void> {
  const { error } = await supabase
    .from('active_timers')
    .update({ feed_side: feedSide })
    .eq('id', timerId);

  if (error) throw error;
}

export async function getActiveTimers(
  pairId: string
): Promise<ActiveTimer[]> {
  const { data, error } = await supabase
    .from('active_timers')
    .select('*')
    .eq('pair_id', pairId);

  if (error) throw error;
  return (data ?? []) as ActiveTimer[];
}

export interface CreateTimerParams {
  pair_id: string;
  twin_label: TwinLabel;
  type: 'feed' | 'nap';
  started_by_uid: string;
  started_by_name: string;
  feed_side?: FeedSide | null;
}

export async function createTimer(
  params: CreateTimerParams
): Promise<ActiveTimer> {
  const { data, error } = await supabase
    .from('active_timers')
    .insert(params)
    .select()
    .single();

  if (error) throw error;
  return data as ActiveTimer;
}

export interface StopTimerParams {
  timer_id: string;
  feed_mode?: FeedMode | null;
  feed_amount?: number | null;
  feed_unit?: FeedUnit | null;
  feed_type?: FeedType | null;
  note_text?: string | null;
  feed_segments?: { side: string; duration_ms: number }[] | null;
}

export async function stopTimerAndCreateEvent(
  params: StopTimerParams
): Promise<TrackedEvent> {
  const { data, error } = await supabase.rpc('stop_timer_and_create_event', {
    p_timer_id: params.timer_id,
    p_feed_mode: params.feed_mode ?? null,
    p_feed_amount: params.feed_amount ?? null,
    p_feed_unit: params.feed_unit ?? null,
    p_feed_type: params.feed_type ?? null,
    p_note_text: params.note_text ?? null,
    p_feed_segments: params.feed_segments ?? null,
  });

  if (error) throw error;
  return data as TrackedEvent;
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export async function createInvite(pairId: string): Promise<Invite> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length];
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('invites')
    .insert({
      pair_id: pairId,
      code,
      created_by: userData.user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Invite;
}

export interface RedeemInviteResult {
  pair_id: string;
}

export async function redeemInvite(
  code: string,
  displayName: string
): Promise<RedeemInviteResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('redeem_invite', {
    p_code: code,
    p_user_id: userData.user.id,
    p_display_name: displayName,
  });

  if (error) throw error;
  return data as RedeemInviteResult;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardSummary(
  pairId: string,
  hours: number = 24
): Promise<DashboardSummary[]> {
  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_pair_id: pairId,
    p_hours: hours,
  });

  if (error) throw error;
  return (data ?? []) as DashboardSummary[];
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'active_pair_id'>>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}
