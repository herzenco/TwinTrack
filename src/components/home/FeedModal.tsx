import { useState } from 'react';
import { BottomSheet } from '../shared/BottomSheet';
import type { TwinLabel, FeedMode, FeedType, FeedSide } from '../../types';

interface FeedModalProps {
  open: boolean;
  onClose: () => void;
  twinLabel: TwinLabel;
  twinName: string;
  twinColor: string;
  lastBreastSide: FeedSide | null;
  onLogBottle: (feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp?: string) => void;
  onStartBreast: (side: FeedSide) => void;
}

const AMOUNT_PRESETS = [1, 2, 3, 4, 5, 6];

export function FeedModal({
  open,
  onClose,
  twinName,
  twinColor,
  lastBreastSide,
  onLogBottle,
  onStartBreast,
}: FeedModalProps) {
  const [mode, setMode] = useState<FeedMode | null>(null);
  const [feedType, setFeedType] = useState<FeedType>('formula');
  const [amount, setAmount] = useState<number>(3);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [startTime, setStartTime] = useState('');

  function nowLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function resetState() {
    setMode(null);
    setFeedType('formula');
    setAmount(3);
    setCustomAmount('');
    setShowCustom(false);
    setStartTime('');
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleLogBottle() {
    const finalAmount = showCustom ? parseFloat(customAmount) || 0 : amount;
    if (finalAmount > 0) {
      const ts = startTime ? new Date(startTime).toISOString() : undefined;
      onLogBottle(feedType, finalAmount, 'oz', ts);
      handleClose();
    }
  }

  function handleStartBreast(side: FeedSide) {
    onStartBreast(side);
    handleClose();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={`Feed ${twinName}`}>
      {/* Mode selection */}
      {!mode && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode('bottle')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🍼</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Bottle</p>
              <p className="text-sm text-text-secondary">Formula or breast milk</p>
            </div>
          </button>
          <button
            onClick={() => setMode('breast')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🤱</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Breast</p>
              <p className="text-sm text-text-secondary">Start a timed session</p>
            </div>
          </button>
        </div>
      )}

      {/* Bottle flow */}
      {mode === 'bottle' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setMode(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* Feed type */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Type</p>
            <div className="flex gap-3">
              {(['formula', 'breastmilk'] as FeedType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFeedType(t)}
                  className={`flex-1 min-h-[64px] rounded-2xl text-base font-bold transition-all active:scale-95
                    ${feedType === t
                      ? 'text-[#0F1117]'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                  style={feedType === t ? { backgroundColor: twinColor } : undefined}
                >
                  {t === 'formula' ? 'Formula' : 'Breast Milk'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Amount (oz)</p>
            {!showCustom ? (
              <div className="grid grid-cols-4 gap-3">
                {AMOUNT_PRESETS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`min-h-[60px] rounded-2xl text-base font-bold transition-all active:scale-95
                      ${amount === a
                        ? 'text-[#0F1117]'
                        : 'bg-white/5 text-text-primary hover:bg-white/10'
                      }`}
                    style={amount === a ? { backgroundColor: twinColor } : undefined}
                  >
                    {a}oz
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className="min-h-[60px] rounded-2xl text-base font-medium bg-white/5 text-text-secondary
                             hover:bg-white/10 active:scale-95 transition-all col-span-2"
                >
                  Custom...
                </button>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.0"
                  autoFocus
                  className="flex-1 min-h-[60px] px-4 rounded-2xl bg-white/5 text-text-primary text-center
                             text-xl font-mono border border-white/10 focus:outline-none
                             focus:border-white/20 placeholder:text-text-muted"
                />
                <span className="text-base text-text-secondary font-medium">oz</span>
                <button
                  onClick={() => {
                    setShowCustom(false);
                    setCustomAmount('');
                  }}
                  className="text-sm text-text-muted hover:text-text-secondary px-3 py-2 min-h-[44px]"
                >
                  Presets
                </button>
              </div>
            )}
          </div>

          {/* Start time */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Start time</p>
            <input
              type="datetime-local"
              value={startTime || nowLocal()}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20
                         [color-scheme:dark]"
            />
          </div>

          {/* Log button */}
          <button
            onClick={handleLogBottle}
            className="min-h-[72px] rounded-2xl text-lg font-bold active:scale-[0.97] transition-all text-[#0F1117]"
            style={{ backgroundColor: twinColor }}
          >
            Log {showCustom ? customAmount || '0' : amount}oz {feedType === 'formula' ? 'Formula' : 'BM'}
          </button>
        </div>
      )}

      {/* Breast flow */}
      {mode === 'breast' && (() => {
        const suggestedSide: FeedSide | null =
          lastBreastSide === 'left' ? 'right'
          : lastBreastSide === 'right' ? 'left'
          : null;

        return (
          <div className="flex flex-col gap-5">
            <button
              onClick={() => setMode(null)}
              className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                         min-h-[44px] flex items-center"
            >
              &larr; Back
            </button>

            <p className="text-sm font-medium text-text-secondary">
              Choose side to start timer
              {lastBreastSide && (
                <span className="ml-1 text-text-muted">
                  (last finished on {lastBreastSide === 'left' ? 'L' : lastBreastSide === 'right' ? 'R' : 'Both'})
                </span>
              )}
            </p>

            <div className="flex flex-col gap-3">
              {([
                { side: 'left' as FeedSide, label: 'Left', icon: '👈' },
                { side: 'right' as FeedSide, label: 'Right', icon: '👉' },
                { side: 'both' as FeedSide, label: 'Both', icon: '🤲' },
              ]).map(({ side, label, icon }) => {
                const isSuggested = side === suggestedSide;
                return (
                  <button
                    key={side}
                    onClick={() => handleStartBreast(side)}
                    className={`flex items-center justify-center gap-3 min-h-[64px] rounded-2xl
                               text-base font-bold active:scale-[0.98] transition-all
                               ${isSuggested
                                 ? 'text-[#0F1117]'
                                 : 'bg-white/5 text-text-primary hover:bg-white/10'
                               }`}
                    style={isSuggested
                      ? { backgroundColor: twinColor }
                      : { borderColor: `${twinColor}33`, borderWidth: '1px' }
                    }
                  >
                    <span className="text-xl">{icon}</span>
                    <span>{label}</span>
                    {isSuggested && (
                      <span className="text-xs font-semibold opacity-70 ml-1">Suggested</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </BottomSheet>
  );
}
