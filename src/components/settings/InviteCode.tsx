import { useState, useEffect, useCallback } from 'react';

interface FamilyCodeProps {
  pairId: string;
  onGetCode: () => Promise<string | null>;
  onSetCode: (code: string) => Promise<void>;
}

export function FamilyCode({ pairId, onGetCode, onSetCode }: FamilyCodeProps) {
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadCode = useCallback(async () => {
    setFetching(true);
    try {
      const code = await onGetCode();
      setCurrentCode(code);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  }, [onGetCode]);

  useEffect(() => {
    void loadCode();
  }, [loadCode, pairId]);

  async function handleSave() {
    if (inputCode.length !== 4) {
      setError('Enter a 4-digit code');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await onSetCode(inputCode);
      setCurrentCode(inputCode);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set code');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-text-primary">Family Code</h3>
        <p className="text-xs text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Family Code</h3>
      <p className="text-xs text-text-muted">
        Set a 4-digit code that family members and caregivers can use to join your twin pair.
        Share this code with anyone you want to give access.
      </p>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-sm text-success">
          Family code saved!
        </div>
      )}

      {currentCode && !editing ? (
        <div className="flex flex-col gap-4">
          {/* Current code display */}
          <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
            <label className="text-xs text-text-muted">Your family code</label>
            <div className="flex items-center justify-center gap-2">
              {currentCode.split('').map((digit, i) => (
                <span
                  key={i}
                  className="w-12 h-14 flex items-center justify-center rounded-lg bg-bg-primary
                             font-mono text-2xl font-bold text-text-primary border border-white/10"
                >
                  {digit}
                </span>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCopy}
                className="flex-1 min-h-[52px] rounded-xl bg-twin-a text-bg-primary font-bold text-sm
                           active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={() => {
                  setEditing(true);
                  setInputCode(currentCode);
                  setError(null);
                }}
                className="min-h-[52px] px-5 rounded-xl bg-white/8 text-text-primary font-semibold text-sm
                           active:scale-95 transition-all"
              >
                Change
              </button>
            </div>
          </div>

          <p className="text-[11px] text-text-muted text-center">
            Anyone with this code can join your twin pair. Change it anytime to revoke access for new users.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Code input */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={inputCode[i] ?? ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  const newCode = inputCode.split('');
                  newCode[i] = val;
                  setInputCode(newCode.join(''));
                  if (val && e.target.nextElementSibling) {
                    (e.target.nextElementSibling as HTMLInputElement).focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !inputCode[i] && e.currentTarget.previousElementSibling) {
                    (e.currentTarget.previousElementSibling as HTMLInputElement).focus();
                  }
                }}
                className="w-14 h-16 text-center rounded-xl bg-white/5 text-text-primary font-mono text-2xl
                           font-bold border border-white/10 focus:outline-none focus:border-twin-a/50"
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || inputCode.length !== 4}
              className="flex-1 min-h-[52px] rounded-xl bg-twin-a text-bg-primary font-bold text-sm
                         active:scale-95 transition-all
                         disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Saving...' : 'Set Family Code'}
            </button>
            {currentCode && (
              <button
                onClick={() => {
                  setEditing(false);
                  setInputCode('');
                  setError(null);
                }}
                className="min-h-[52px] px-5 rounded-xl bg-white/8 text-text-primary font-semibold text-sm
                           active:scale-95 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
