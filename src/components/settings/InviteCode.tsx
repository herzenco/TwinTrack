import { useState } from 'react';

interface InviteCodeProps {
  onGenerate: () => Promise<{ code: string; expires_at: string }>;
}

export function InviteCode({ onGenerate }: InviteCodeProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const shareUrl = code ? `${window.location.origin}/join/${code}` : null;
  const canShare = typeof navigator.share === 'function';

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await onGenerate();
      setCode(result.code);
      setExpiresAt(result.expires_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback handled by share
    }
  }

  async function handleCopyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied('code');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  async function handleShare() {
    if (!shareUrl || !canShare) return;
    try {
      await navigator.share({
        title: 'Join me on TwinTrack',
        text: "I'd like you to help track our twins. Tap this link to join:",
        url: shareUrl,
      });
    } catch {
      // User cancelled share
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Invite a Caregiver</h3>
      <p className="text-xs text-text-muted">
        Generate an invite link to share with a family member or caregiver.
        Links expire after 48 hours.
      </p>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!code ? (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="min-h-[56px] rounded-xl bg-twin-a/15 text-twin-a font-bold text-sm
                     hover:bg-twin-a/20 active:scale-95 transition-all
                     disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Generating...' : 'Generate Invite Link'}
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Shareable link */}
          <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
            <label className="text-xs text-text-muted">Share this link</label>
            <div className="flex items-center gap-2 bg-bg-primary rounded-lg px-3 py-2.5 border border-white/10">
              <span className="flex-1 text-sm text-text-primary truncate font-mono">
                {shareUrl}
              </span>
            </div>

            <div className="flex gap-2">
              {canShare ? (
                <button
                  onClick={handleShare}
                  className="flex-1 min-h-[52px] rounded-xl bg-twin-a text-bg-primary font-bold text-sm
                             active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Share Link
                </button>
              ) : (
                <button
                  onClick={handleCopyLink}
                  className="flex-1 min-h-[52px] rounded-xl bg-twin-a text-bg-primary font-bold text-sm
                             active:scale-95 transition-all"
                >
                  {copied === 'link' ? 'Copied!' : 'Copy Link'}
                </button>
              )}
              <button
                onClick={handleCopyCode}
                className="min-h-[52px] px-5 rounded-xl bg-white/8 text-text-primary font-semibold text-sm
                           active:scale-95 transition-all"
              >
                {copied === 'code' ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          {/* Code display */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted">Or share the code directly</span>
            <div className="flex items-center gap-1">
              {code.split('').map((char, i) => (
                <span
                  key={i}
                  className="w-9 h-11 flex items-center justify-center rounded-lg bg-bg-primary
                             font-mono text-lg font-bold text-text-primary border border-white/10"
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {expiresAt && (
            <p className="text-[11px] text-text-muted text-center">
              Expires {new Date(expiresAt).toLocaleString()}
            </p>
          )}

          <button
            onClick={() => {
              setCode(null);
              setExpiresAt(null);
              setError(null);
            }}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors text-center"
          >
            Generate a new link
          </button>
        </div>
      )}
    </div>
  );
}
