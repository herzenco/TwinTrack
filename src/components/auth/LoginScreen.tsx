import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { signIn } from '../../lib/auth';

export function LoginScreen() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  const signupLink = inviteCode ? `/signup?invite=${inviteCode}` : '/signup';

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Twin<span className="text-twin-a">Track</span>
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Track your twins, together.
          </p>
        </div>

        {inviteCode && (
          <div className="bg-twin-a/10 border border-twin-a/20 rounded-xl px-4 py-3 text-sm text-twin-a text-center">
            Sign in to join a twin pair
          </div>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <Link to={signupLink} className="text-twin-a font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
