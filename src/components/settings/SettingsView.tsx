import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { TwinConfig } from './TwinConfig';
import { MemberManagement } from './MemberManagement';
import { InviteCode } from './InviteCode';
import type { TwinPair } from '../../types';

export function SettingsView() {
  const pair = useAppStore((s) => s.activePair);
  const setActivePair = useAppStore((s) => s.setActivePair);
  const members = useAppStore((s) => s.pairMembers);
  const user = useAppStore((s) => s.user);

  const isOwner = members.some(
    (m) => m.user_id === user?.id && m.role === 'owner',
  );

  const [feedInterval, setFeedInterval] = useState(pair?.feed_interval_minutes ?? 180);

  function handleSaveTwinConfig(updates: Partial<TwinPair>) {
    if (!pair) return;
    const updated = { ...pair, ...updates };
    setActivePair(updated);
    // TODO: persist via lib/database.ts
  }

  function handleSaveFeedInterval() {
    if (!pair) return;
    const updated = { ...pair, feed_interval_minutes: feedInterval };
    setActivePair(updated);
    // TODO: persist via lib/database.ts
  }

  function handleRevokeMember(memberId: string) {
    // TODO: call database delete via lib/database.ts
    const updated = useAppStore.getState().pairMembers.filter((m) => m.id !== memberId);
    useAppStore.getState().setPairMembers(updated);
  }

  async function handleGenerateInvite(): Promise<{ code: string; expires_at: string }> {
    // TODO: call Edge Function to generate invite
    // Placeholder for now
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    return { code, expires_at: expires };
  }

  if (!pair) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto pb-8">
      <h1 className="text-lg font-bold text-text-primary">Settings</h1>

      {/* Twin Config */}
      {isOwner && (
        <section className="rounded-2xl bg-bg-card/60 border border-white/5 p-4">
          <TwinConfig pair={pair} onSave={handleSaveTwinConfig} />
        </section>
      )}

      {/* Feed Interval */}
      <section className="rounded-2xl bg-bg-card/60 border border-white/5 p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Feed Interval</h3>
        <p className="text-xs text-text-muted mb-4">
          How often should each twin be fed? The dashboard will alert you when a feed is overdue.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={90}
            max={240}
            step={15}
            value={feedInterval}
            onChange={(e) => setFeedInterval(Number(e.target.value))}
            className="flex-1 accent-text-primary"
          />
          <span className="text-sm font-mono text-text-primary w-14 text-right">
            {feedInterval / 60}h
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>1.5h</span>
          <span>4h</span>
        </div>
        {feedInterval !== pair.feed_interval_minutes && (
          <button
            onClick={handleSaveFeedInterval}
            className="mt-3 min-h-[40px] w-full rounded-lg bg-white/8 text-text-primary text-xs font-semibold
                       hover:bg-white/12 active:scale-95 transition-all"
          >
            Save Interval
          </button>
        )}
      </section>

      {/* Invite */}
      {isOwner && (
        <section className="rounded-2xl bg-bg-card/60 border border-white/5 p-4">
          <InviteCode onGenerate={handleGenerateInvite} />
        </section>
      )}

      {/* Members */}
      <section className="rounded-2xl bg-bg-card/60 border border-white/5 p-4">
        <MemberManagement
          members={members}
          currentUserId={user?.id ?? ''}
          isOwner={isOwner}
          onRevoke={handleRevokeMember}
        />
      </section>

      {/* Account */}
      <section className="rounded-2xl bg-bg-card/60 border border-white/5 p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Account</h3>
        <div className="flex flex-col gap-2">
          <button
            className="min-h-[44px] rounded-lg bg-white/5 text-text-secondary text-sm font-medium
                       hover:bg-white/10 active:scale-95 transition-all"
          >
            Sign Out
          </button>
          <button
            className="min-h-[44px] rounded-lg bg-danger/10 text-danger text-sm font-medium
                       hover:bg-danger/15 active:scale-95 transition-all"
          >
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}
