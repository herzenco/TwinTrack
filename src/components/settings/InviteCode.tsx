import { useState } from 'react';

interface InviteCodeProps {
  onGenerate: () => Promise<{ code: string; expires_at: string }>;
}

export function InviteCode({ onGenerate }: InviteCodeProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await onGenerate();
      setCode(result.code);
      setExpiresAt(result.expires_at);
    } catch {
      // TODO: error handling
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Invite a Caregiver</h3>
      <p className="text-xs text-text-muted">
        Generate a 6-character code to share with a family member or caregiver.
        Codes expire after 48 hours.
      </p>

      {!code ? (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="min-h-[48px] rounded-xl bg-white/8 text-text-primary font-semibold text-sm
                     hover:bg-white/12 active:scale-95 transition-all
                     disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Generating...' : 'Generate Invite Code'}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3 bg-white/5 rounded-xl p-5">
          {/* Code display */}
          <div className="flex items-center gap-1">
            {code.split('').map((char, i) => (
              <span
                key={i}
                className="w-10 h-12 flex items-center justify-center rounded-lg bg-bg-primary
                           font-mono text-xl font-bold text-text-primary border border-white/10"
              >
                {char}
              </span>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="min-h-[44px] px-6 rounded-lg bg-white/10 text-sm font-semibold text-text-primary
                       hover:bg-white/15 active:scale-95 transition-all"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>

          {expiresAt && (
            <p className="text-[10px] text-text-muted">
              Expires {new Date(expiresAt).toLocaleString()}
            </p>
          )}

          <button
            onClick={() => {
              setCode(null);
              setExpiresAt(null);
            }}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Generate a new code
          </button>
        </div>
      )}
    </div>
  );
}
