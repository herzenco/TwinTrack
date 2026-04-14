import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { signUp } from '../../lib/auth';

export function SignupScreen() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const session = await signUp({ email, password, displayName });
      if (!session) {
        setError('Check your email to confirm your account, or ask the admin to disable email confirmations.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const loginLink = inviteCode ? `/login?invite=${inviteCode}` : '/login';

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Twin<span className="text-twin-a">Track</span>
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Create your account
          </p>
        </div>

        {inviteCode && (
          <div className="bg-twin-a/10 border border-twin-a/20 rounded-xl px-4 py-3 text-sm text-twin-a text-center">
            Create an account to join a twin pair
          </div>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            className="min-h-[52px] px-4 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/25
                       placeholder:text-text-muted"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="min-h-[52px] px-4 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/25
                       placeholder:text-text-muted"
          />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="min-h-[52px] px-4 rounded-xl bg-white/5 text-text-primary text-sm
                       border border-white/10 focus:outline-none focus:border-white/25
                       placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-[52px] rounded-xl bg-twin-a text-bg-primary font-bold text-sm
                       active:scale-[0.98] transition-all
                       disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to={loginLink} className="text-twin-a font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
