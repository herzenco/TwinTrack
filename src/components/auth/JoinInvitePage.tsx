import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { redeemInvite } from '../../lib/database';
import { setPendingInviteCode } from '../../hooks/useInviteRedemption';

export function JoinInvitePage() {
  const { code } = useParams<{ code: string }>();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
        <p className="text-text-secondary">Invalid invite link.</p>
        <Link to="/login" className="text-twin-a mt-4 text-sm font-medium">Go to login</Link>
      </div>
    );
  }

  // Unauthenticated: show landing page with sign up / log in
  if (!user) {
    // Store code for after auth
    setPendingInviteCode(code);

    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
        <div className="w-full max-w-sm flex flex-col gap-8 items-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Twin<span className="text-twin-a">Track</span>
            </h1>
            <div className="mt-6 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-twin-a/15 flex items-center justify-center text-3xl mx-auto">
                👶👶
              </div>
            </div>
            <h2 className="text-xl font-bold text-text-primary mt-4">
              You've been invited!
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              Someone wants you to help track their twins. Create an account to get started.
            </p>
          </div>

          {/* Invite code badge */}
          <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-4 py-2.5">
            <span className="text-xs text-text-muted">Invite code:</span>
            <span className="font-mono font-bold text-text-primary tracking-widest">{code}</span>
          </div>

          <div className="w-full flex flex-col gap-3">
            <Link
              to={`/signup?invite=${code}`}
              className="min-h-[60px] rounded-xl bg-twin-a text-bg-primary font-bold text-base
                         flex items-center justify-center
                         active:scale-[0.98] transition-all"
            >
              Create Account
            </Link>
            <Link
              to={`/login?invite=${code}`}
              className="min-h-[60px] rounded-xl bg-white/5 text-text-primary font-semibold text-base
                         flex items-center justify-center border border-white/10
                         active:scale-[0.98] transition-all"
            >
              I Already Have an Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated + already has a pair
  if (profile?.active_pair_id && !joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
        <div className="w-full max-w-sm flex flex-col gap-6 items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-warning/15 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-text-primary">Already Tracking</h2>
          <p className="text-sm text-text-secondary">
            You're already tracking a twin pair. You need to leave your current pair before joining a new one.
          </p>
          <button
            onClick={() => navigate('/')}
            className="min-h-[52px] w-full rounded-xl bg-white/8 text-text-primary font-semibold text-sm
                       active:scale-[0.98] transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Authenticated + no pair: show join confirmation
  async function handleJoin() {
    if (!profile || !code) return;
    setJoining(true);
    setError(null);
    try {
      await redeemInvite(code, profile.display_name);
      await refreshProfile();
      setJoined(true);
      // Navigate to home after a brief moment
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join. The code may be expired or invalid.');
    } finally {
      setJoining(false);
    }
  }

  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
        <div className="w-full max-w-sm flex flex-col gap-4 items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-success/15 flex items-center justify-center text-3xl">
            ✅
          </div>
          <h2 className="text-xl font-bold text-text-primary">You're in!</h2>
          <p className="text-sm text-text-secondary">Taking you to the tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
      <div className="w-full max-w-sm flex flex-col gap-6 items-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Twin<span className="text-twin-a">Track</span>
          </h1>
          <div className="mt-6">
            <div className="w-16 h-16 rounded-2xl bg-twin-a/15 flex items-center justify-center text-3xl mx-auto">
              👶👶
            </div>
          </div>
          <h2 className="text-xl font-bold text-text-primary mt-4">Join Twin Pair</h2>
          <p className="text-sm text-text-secondary mt-2">
            Tap below to start tracking together.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-4 py-2.5">
          <span className="text-xs text-text-muted">Invite code:</span>
          <span className="font-mono font-bold text-text-primary tracking-widest">{code}</span>
        </div>

        {error && (
          <div className="w-full bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full min-h-[60px] rounded-xl bg-twin-a text-bg-primary font-bold text-base
                     active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:pointer-events-none"
        >
          {joining ? 'Joining...' : 'Join Twin Pair'}
        </button>
      </div>
    </div>
  );
}
