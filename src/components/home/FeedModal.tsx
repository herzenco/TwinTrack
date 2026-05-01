import { useState, useMemo } from 'react';
import { BottomSheet } from '../shared/BottomSheet';
import type { TwinLabel, FeedMode, FeedType, FeedSide } from '../../types';

type FeedModalMode = FeedMode | 'previous' | 'prev-bottle' | 'prev-breast' | null;

interface FeedModalProps {
  open: boolean;
  onClose: () => void;
  twinLabel: TwinLabel;
  twinName: string;
  twinColor: string;
  lastBreastSide: FeedSide | null;
  onLogBottle: (feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp?: string) => void;
  onStartBreast: (side: FeedSide) => void;
  onRetroLogBottle: (feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp: string) => void;
  onRetroLogBreast: (side: FeedSide, startTime: string, endTime: string) => void;
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
  onRetroLogBottle,
  onRetroLogBreast,
}: FeedModalProps) {
  const [mode, setMode] = useState<FeedModalMode>(null);
  const [feedType, setFeedType] = useState<FeedType>('formula');
  const [amount, setAmount] = useState<number>(3);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [showFutureConfirm, setShowFutureConfirm] = useState(false);

  // Previous breast feed state
  const [prevBreastSide, setPrevBreastSide] = useState<FeedSide>(
    lastBreastSide === 'left' ? 'right' : lastBreastSide === 'right' ? 'left' : 'left'
  );
  const [prevDurationMin, setPrevDurationMin] = useState('');

  function nowLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const maxDatetime = useMemo(() => nowLocal(), []);

  function resetState() {
    setMode(null);
    setFeedType('formula');
    setAmount(3);
    setCustomAmount('');
    setShowCustom(false);
    setStartTime('');
    setShowFutureConfirm(false);
    setPrevBreastSide(lastBreastSide === 'left' ? 'right' : lastBreastSide === 'right' ? 'left' : 'left');
    setPrevDurationMin('');
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function isFutureTime(timeStr: string): boolean {
    if (!timeStr) return false;
    return new Date(timeStr).getTime() > Date.now();
  }

  function handleLogBottle() {
    const finalAmount = showCustom ? parseFloat(customAmount) || 0 : amount;
    if (finalAmount <= 0) return;

    if (isFutureTime(startTime) && !showFutureConfirm) {
      setShowFutureConfirm(true);
      return;
    }

    const ts = startTime ? new Date(startTime).toISOString() : undefined;
    onLogBottle(feedType, finalAmount, 'oz', ts);
    handleClose();
  }

  function handleStartBreast(side: FeedSide) {
    onStartBreast(side);
    handleClose();
  }

  function handlePrevLogBottle() {
    const finalAmount = showCustom ? parseFloat(customAmount) || 0 : amount;
    if (finalAmount <= 0) return;
    const ts = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
    onRetroLogBottle(feedType, finalAmount, 'oz', ts);
    handleClose();
  }

  function handlePrevLogBreast() {
    const durationMs = (parseFloat(prevDurationMin) || 0) * 60000;
    if (durationMs <= 0) return;
    const startIso = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
    const endIso = new Date(new Date(startIso).getTime() + durationMs).toISOString();
    onRetroLogBreast(prevBreastSide, startIso, endIso);
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
          <button
            onClick={() => { setMode('previous'); setStartTime(nowLocal()); }}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all
                       border border-dashed border-white/[0.1]"
          >
            <span className="text-2xl">⏪</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Previous Feed</p>
              <p className="text-sm text-text-secondary">Log a past feed</p>
            </div>
          </button>
        </div>
      )}

      {/* Previous feed — choose type */}
      {mode === 'previous' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>
          <p className="text-sm text-text-secondary">What type of feed?</p>
          <button
            onClick={() => setMode('prev-bottle')}
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
            onClick={() => setMode('prev-breast')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🤱</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Breast</p>
              <p className="text-sm text-text-secondary">Log a completed session</p>
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
              onChange={(e) => { setStartTime(e.target.value); setShowFutureConfirm(false); }}
              className="w-full min-h-[52px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20
                         [color-scheme:dark]"
            />
          </div>

          {/* Future time confirmation */}
          {showFutureConfirm && (
            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex flex-col gap-3">
              <p className="text-sm text-yellow-300 font-medium">
                This time is in the future. Log anyway?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFutureConfirm(false)}
                  className="flex-1 min-h-[48px] rounded-xl bg-white/5 text-text-secondary font-semibold
                             hover:bg-white/10 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogBottle}
                  className="flex-1 min-h-[48px] rounded-xl bg-yellow-500/20 text-yellow-300 font-semibold
                             hover:bg-yellow-500/30 active:scale-95 transition-all"
                >
                  Log Future Feed
                </button>
              </div>
            </div>
          )}

          {/* Log button */}
          {!showFutureConfirm && (
            <button
              onClick={handleLogBottle}
              className="min-h-[72px] rounded-2xl text-lg font-bold active:scale-[0.97] transition-all text-[#0F1117]"
              style={{ backgroundColor: twinColor }}
            >
              Log {showCustom ? customAmount || '0' : amount}oz {feedType === 'formula' ? 'Formula' : 'BM'}
            </button>
          )}
        </div>
      )}

      {/* Previous bottle flow */}
      {mode === 'prev-bottle' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setMode('previous')}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* When */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">When</p>
            <input
              type="datetime-local"
              value={startTime || nowLocal()}
              max={maxDatetime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20
                         [color-scheme:dark]"
            />
          </div>

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

          {/* Log button */}
          <button
            onClick={handlePrevLogBottle}
            className="min-h-[72px] rounded-2xl text-lg font-bold active:scale-[0.97] transition-all text-[#0F1117]"
            style={{ backgroundColor: twinColor }}
          >
            Log {showCustom ? customAmount || '0' : amount}oz {feedType === 'formula' ? 'Formula' : 'BM'}
          </button>
        </div>
      )}

      {/* Previous breast flow */}
      {mode === 'prev-breast' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setMode('previous')}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* Side */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">
              Side
              {lastBreastSide && (
                <span className="ml-1 text-text-muted">
                  (last: {lastBreastSide === 'left' ? 'L' : lastBreastSide === 'right' ? 'R' : 'Both'})
                </span>
              )}
            </p>
            <div className="flex gap-3">
              {([
                { side: 'left' as FeedSide, label: 'Left' },
                { side: 'right' as FeedSide, label: 'Right' },
                { side: 'both' as FeedSide, label: 'Both' },
              ]).map(({ side, label }) => (
                <button
                  key={side}
                  onClick={() => setPrevBreastSide(side)}
                  className={`flex-1 min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
                    ${prevBreastSide === side
                      ? 'text-[#0F1117]'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                  style={prevBreastSide === side ? { backgroundColor: twinColor } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* When */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Started at</p>
            <input
              type="datetime-local"
              value={startTime || nowLocal()}
              max={maxDatetime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20
                         [color-scheme:dark]"
            />
          </div>

          {/* Duration */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Duration (minutes)</p>
            <div className="grid grid-cols-4 gap-3">
              {[5, 10, 15, 20, 25, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setPrevDurationMin(String(d))}
                  className={`min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
                    ${prevDurationMin === String(d)
                      ? 'text-[#0F1117]'
                      : 'bg-white/5 text-text-primary hover:bg-white/10'
                    }`}
                  style={prevDurationMin === String(d) ? { backgroundColor: twinColor } : undefined}
                >
                  {d}m
                </button>
              ))}
              <div className="col-span-2 flex gap-2 items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  value={[5, 10, 15, 20, 25, 30].includes(Number(prevDurationMin)) ? '' : prevDurationMin}
                  onChange={(e) => setPrevDurationMin(e.target.value)}
                  placeholder="Custom"
                  className="flex-1 min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary text-center
                             text-base font-mono border border-white/10 focus:outline-none
                             focus:border-white/20 placeholder:text-text-muted"
                />
                <span className="text-sm text-text-secondary font-medium">min</span>
              </div>
            </div>
          </div>

          {/* Duration preview */}
          {parseFloat(prevDurationMin) > 0 && (
            <p className="text-center text-text-secondary text-sm">
              Duration: <span className="font-bold text-text-primary">
                {parseFloat(prevDurationMin) >= 60
                  ? `${Math.floor(parseFloat(prevDurationMin) / 60)}h ${Math.round(parseFloat(prevDurationMin) % 60)}m`
                  : `${prevDurationMin}min`}
              </span>
            </p>
          )}

          {/* Log button */}
          <button
            onClick={handlePrevLogBreast}
            disabled={!prevDurationMin || parseFloat(prevDurationMin) <= 0}
            className="min-h-[72px] rounded-2xl text-lg font-bold active:scale-[0.97] transition-all
                       text-[#0F1117] disabled:opacity-40 disabled:pointer-events-none"
            style={{ backgroundColor: twinColor }}
          >
            Log Breast Feed
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
