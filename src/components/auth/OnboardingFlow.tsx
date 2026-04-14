import { useState } from 'react';
import { createTwinPair, redeemInvite } from '../../lib/database';
import { signOut } from '../../lib/auth';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';

type OnboardingStep = 'choose' | 'create' | 'join';

const COLOR_OPTIONS = ['#6C9BFF', '#FF8FA4', '#4ADE80', '#FBBF24', '#A78BFA', '#F97316'];

export function OnboardingFlow() {
  const [step, setStep] = useState<OnboardingStep>('choose');
  const { user, profile, refreshProfile } = useAuth();
  const setActivePair = useAppStore((s) => s.setActivePair);

  // Create pair state
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [colorA, setColorA] = useState('#6C9BFF');
  const [colorB, setColorB] = useState('#FF8FA4');
  const [feedInterval, setFeedInterval] = useState(180);

  // Join state
  const [inviteCode, setInviteCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const pair = await createTwinPair({
        twin_a_name: nameA || 'Baby A',
        twin_b_name: nameB || 'Baby B',
        twin_a_color: colorA,
        twin_b_color: colorB,
        feed_interval_minutes: feedInterval,
      });
      setActivePair(pair);
      await refreshProfile();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? String(err);
      console.error('Create pair error:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setError(null);
    if (inviteCode.length !== 6) {
      setError('Enter a 6-character invite code');
      return;
    }
    if (!user || !profile) {
      setError('Not logged in');
      return;
    }
    setLoading(true);
    try {
      await redeemInvite(inviteCode, profile.display_name);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired invite code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome to Twin<span className="text-twin-a">Track</span>
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            {step === 'choose' && 'How would you like to get started?'}
            {step === 'create' && 'Set up your twin pair'}
            {step === 'join' && 'Join an existing pair'}
          </p>
          <button
            onClick={async () => {
              await signOut();
              localStorage.clear();
              window.location.reload();
            }}
            className="text-xs text-text-muted mt-3 underline"
          >
            Sign out &amp; start fresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Step: Choose */}
        {step === 'choose' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('create')}
              className="min-h-[72px] rounded-2xl bg-bg-card border border-white/10 px-5
                         flex items-center gap-4 hover:bg-bg-card/80 active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-twin-a/15 flex items-center justify-center text-2xl">
                👶👶
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-text-primary">Create a new pair</p>
                <p className="text-xs text-text-muted">I'm setting up tracking for my twins</p>
              </div>
            </button>

            <button
              onClick={() => setStep('join')}
              className="min-h-[72px] rounded-2xl bg-bg-card border border-white/10 px-5
                         flex items-center gap-4 hover:bg-bg-card/80 active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-twin-b/15 flex items-center justify-center text-2xl">
                🤝
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-text-primary">Join with a code</p>
                <p className="text-xs text-text-muted">I have an invite code from another caregiver</p>
              </div>
            </button>
          </div>
        )}

        {/* Step: Create */}
        {step === 'create' && (
          <div className="flex flex-col gap-5">
            <button
              onClick={() => setStep('choose')}
              className="self-start text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              &larr; Back
            </button>

            {/* Twin A */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Twin A name</label>
              <input
                type="text"
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                placeholder="Baby A"
                className="w-full min-h-[48px] px-4 rounded-xl bg-white/5 text-text-primary text-sm
                           border border-white/10 focus:outline-none focus:border-white/25
                           placeholder:text-text-muted"
              />
              <div className="flex gap-2 mt-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColorA(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      colorA === c ? 'ring-2 ring-white/40 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Twin B */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Twin B name</label>
              <input
                type="text"
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                placeholder="Baby B"
                className="w-full min-h-[48px] px-4 rounded-xl bg-white/5 text-text-primary text-sm
                           border border-white/10 focus:outline-none focus:border-white/25
                           placeholder:text-text-muted"
              />
              <div className="flex gap-2 mt-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColorB(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      colorB === c ? 'ring-2 ring-white/40 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Feed interval */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Feed interval</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={90}
                  max={240}
                  step={15}
                  value={feedInterval}
                  onChange={(e) => setFeedInterval(Number(e.target.value))}
                  className="flex-1 accent-twin-a"
                />
                <span className="text-sm font-mono text-text-primary w-10 text-right">
                  {feedInterval / 60}h
                </span>
              </div>
            </div>

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="min-h-[52px] rounded-xl bg-twin-a text-bg-primary font-bold text-sm
                         active:scale-[0.98] transition-all
                         disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Creating...' : 'Create Twin Pair'}
            </button>

            <p className="text-[10px] text-text-muted text-center">
              You can change names, colors, and intervals later in Settings.
            </p>
          </div>
        )}

        {/* Step: Join */}
        {step === 'join' && (
          <div className="flex flex-col gap-5">
            <button
              onClick={() => setStep('choose')}
              className="self-start text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              &larr; Back
            </button>

            <p className="text-xs text-text-secondary">
              Ask the primary caregiver for a 6-character invite code from their Settings page.
            </p>

            {/* Code input */}
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={inviteCode[i] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    const newCode = inviteCode.split('');
                    newCode[i] = val;
                    setInviteCode(newCode.join(''));
                    if (val && e.target.nextElementSibling) {
                      (e.target.nextElementSibling as HTMLInputElement).focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !inviteCode[i] && e.currentTarget.previousElementSibling) {
                      (e.currentTarget.previousElementSibling as HTMLInputElement).focus();
                    }
                  }}
                  className="w-11 h-14 text-center rounded-lg bg-white/5 text-text-primary font-mono text-xl
                             font-bold border border-white/10 focus:outline-none focus:border-twin-a/50
                             uppercase"
                />
              ))}
            </div>

            <button
              onClick={handleJoin}
              disabled={loading || inviteCode.length !== 6}
              className="min-h-[52px] rounded-xl bg-twin-b text-bg-primary font-bold text-sm
                         active:scale-[0.98] transition-all
                         disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Joining...' : 'Join Twin Pair'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
