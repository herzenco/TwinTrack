import { useState } from 'react';
import { Link } from 'react-router-dom';

export function SignupScreen() {
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
      // TODO: call lib/auth.ts signUp with email, password, displayName
    } catch {
      setError('Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    try {
      // TODO: call lib/auth.ts signInWithGoogle
    } catch {
      setError('Google sign-in failed');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-primary px-6">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Twin<span className="text-twin-a">Track</span>
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Create your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Form */}
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

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleSignup}
          className="min-h-[52px] rounded-xl bg-white/5 text-text-primary font-medium text-sm
                     flex items-center justify-center gap-3 border border-white/10
                     hover:bg-white/8 active:scale-[0.98] transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* Login link */}
        <p className="text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-twin-a font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
