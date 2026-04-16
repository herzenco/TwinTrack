import { useState, useMemo } from 'react';
import { BottomSheet } from '../shared/BottomSheet';
import type { TwinLabel, FeedType, FeedSide, DiaperSubtype } from '../../types';

type RetroActivityType = 'bottle' | 'breast' | 'diaper' | 'nap';

interface RetroLogModalProps {
  open: boolean;
  onClose: () => void;
  twinLabel: TwinLabel;
  twinName: string;
  twinColor: string;
  lastBreastSide: FeedSide | null;
  onLogBottle: (feedType: FeedType, amount: number, unit: 'oz' | 'ml', timestamp: string) => void;
  onLogBreast: (side: FeedSide, startTime: string, endTime: string) => void;
  onLogDiaper: (subtype: DiaperSubtype, timestamp: string) => void;
  onLogNap: (napStart: string, napEnd: string) => void;
}

const AMOUNT_PRESETS = [1, 2, 3, 4, 5, 6];

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RetroLogModal({
  open,
  onClose,
  twinName,
  twinColor,
  lastBreastSide,
  onLogBottle,
  onLogBreast,
  onLogDiaper,
  onLogNap,
}: RetroLogModalProps) {
  const [activity, setActivity] = useState<RetroActivityType | null>(null);
  const [timeValue, setTimeValue] = useState(() => toLocalDatetimeValue(new Date()));

  // Bottle state
  const [feedType, setFeedType] = useState<FeedType>('formula');
  const [amount, setAmount] = useState<number>(3);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Breast state
  const [breastSide, setBreastSide] = useState<FeedSide>(
    lastBreastSide === 'left' ? 'right' : lastBreastSide === 'right' ? 'left' : 'left'
  );
  const [breastEndValue, setBreastEndValue] = useState(() => toLocalDatetimeValue(new Date()));

  // Nap state
  const [napEndValue, setNapEndValue] = useState(() => toLocalDatetimeValue(new Date()));

  const maxDatetime = useMemo(() => toLocalDatetimeValue(new Date()), []);

  function resetState() {
    setActivity(null);
    setTimeValue(toLocalDatetimeValue(new Date()));
    setFeedType('formula');
    setAmount(3);
    setCustomAmount('');
    setShowCustom(false);
    setBreastSide(lastBreastSide === 'left' ? 'right' : lastBreastSide === 'right' ? 'left' : 'left');
    setBreastEndValue(toLocalDatetimeValue(new Date()));
    setNapEndValue(toLocalDatetimeValue(new Date()));
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleLogBottle() {
    const finalAmount = showCustom ? parseFloat(customAmount) || 0 : amount;
    if (finalAmount > 0) {
      const timestamp = new Date(timeValue).toISOString();
      onLogBottle(feedType, finalAmount, 'oz', timestamp);
      handleClose();
    }
  }

  function handleLogDiaper(subtype: DiaperSubtype) {
    const timestamp = new Date(timeValue).toISOString();
    onLogDiaper(subtype, timestamp);
    handleClose();
  }

  function handleLogBreast() {
    const start = new Date(timeValue);
    const end = new Date(breastEndValue);
    if (end <= start) return;
    onLogBreast(breastSide, start.toISOString(), end.toISOString());
    handleClose();
  }

  function handleLogNap() {
    const start = new Date(timeValue);
    const end = new Date(napEndValue);
    if (end <= start) return;
    onLogNap(start.toISOString(), end.toISOString());
    handleClose();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={`Log Past — ${twinName}`}>
      {/* Activity type selection */}
      {!activity && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary mb-1">What happened?</p>
          <button
            onClick={() => setActivity('bottle')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🍼</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Bottle Feed</p>
              <p className="text-sm text-text-secondary">Formula or breast milk</p>
            </div>
          </button>
          <button
            onClick={() => setActivity('breast')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🤱</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Breast Feed</p>
              <p className="text-sm text-text-secondary">Log a completed session</p>
            </div>
          </button>
          <button
            onClick={() => setActivity('diaper')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">🧷</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Diaper</p>
              <p className="text-sm text-text-secondary">Wet, dirty, or both</p>
            </div>
          </button>
          <button
            onClick={() => setActivity('nap')}
            className="flex items-center gap-4 min-h-[64px] px-5 rounded-2xl bg-white/5
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl">😴</span>
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">Nap</p>
              <p className="text-sm text-text-secondary">Log a completed nap</p>
            </div>
          </button>
        </div>
      )}

      {/* Bottle flow */}
      {activity === 'bottle' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setActivity(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* When */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">When</p>
            <input
              type="datetime-local"
              value={timeValue}
              max={maxDatetime}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Feed type */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Type</p>
            <div className="flex gap-3">
              {(['formula', 'breastmilk'] as FeedType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFeedType(t)}
                  className={`flex-1 min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
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
            <p className="text-sm font-medium text-text-secondary mb-2">Amount (oz)</p>
            {!showCustom ? (
              <div className="grid grid-cols-4 gap-3">
                {AMOUNT_PRESETS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
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
                  className="min-h-[56px] rounded-2xl text-base font-medium bg-white/5 text-text-secondary
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
                  className="flex-1 min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary text-center
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
            onClick={handleLogBottle}
            className="min-h-[72px] rounded-2xl text-lg font-bold active:scale-[0.97] transition-all text-[#0F1117]"
            style={{ backgroundColor: twinColor }}
          >
            Log {showCustom ? customAmount || '0' : amount}oz {feedType === 'formula' ? 'Formula' : 'BM'}
          </button>
        </div>
      )}

      {/* Breast flow */}
      {activity === 'breast' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setActivity(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* Side */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">
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
                  onClick={() => setBreastSide(side)}
                  className={`flex-1 min-h-[56px] rounded-2xl text-base font-bold transition-all active:scale-95
                    ${breastSide === side
                      ? 'text-[#0F1117]'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                  style={breastSide === side ? { backgroundColor: twinColor } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Started */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Started</p>
            <input
              type="datetime-local"
              value={timeValue}
              max={maxDatetime}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Ended */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Ended</p>
            <input
              type="datetime-local"
              value={breastEndValue}
              max={maxDatetime}
              onChange={(e) => setBreastEndValue(e.target.value)}
              className="w-full min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Duration preview */}
          {(() => {
            const start = new Date(timeValue);
            const end = new Date(breastEndValue);
            const diffMs = end.getTime() - start.getTime();
            if (diffMs <= 0) return (
              <p className="text-sm text-danger text-center">End time must be after start time</p>
            );
            const min = Math.round(diffMs / 60000);
            const h = Math.floor(min / 60);
            const m = min % 60;
            const label = h > 0 ? `${h}h ${m}m` : `${min}min`;
            return (
              <p className="text-center text-text-secondary text-sm">
                Duration: <span className="font-bold text-text-primary">{label}</span>
              </p>
            );
          })()}

          {/* Log button */}
          <button
            onClick={handleLogBreast}
            disabled={new Date(breastEndValue) <= new Date(timeValue)}
            className="min-h-[72px] rounded-2xl text-lg font-bold active:scale-[0.97] transition-all
                       text-[#0F1117] disabled:opacity-40 disabled:pointer-events-none"
            style={{ backgroundColor: twinColor }}
          >
            Log Breast Feed
          </button>
        </div>
      )}

      {/* Diaper flow */}
      {activity === 'diaper' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setActivity(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* When */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">When</p>
            <input
              type="datetime-local"
              value={timeValue}
              max={maxDatetime}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Diaper type buttons */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-text-secondary">Type</p>
            <button
              onClick={() => handleLogDiaper('wet')}
              className="flex items-center justify-center gap-3 min-h-[64px] rounded-2xl
                         text-base font-bold active:scale-[0.97] transition-all
                         bg-white/[0.06] text-text-primary border border-white/[0.08]"
            >
              <span className="text-xl">💧</span> Wet
            </button>
            <button
              onClick={() => handleLogDiaper('dirty')}
              className="flex items-center justify-center gap-3 min-h-[64px] rounded-2xl
                         text-base font-bold active:scale-[0.97] transition-all
                         bg-white/[0.06] text-text-primary border border-white/[0.08]"
            >
              <span className="text-xl">💩</span> Dirty
            </button>
            <button
              onClick={() => handleLogDiaper('both')}
              className="flex items-center justify-center gap-3 min-h-[64px] rounded-2xl
                         text-base font-bold active:scale-[0.97] transition-all text-[#0F1117]"
              style={{ backgroundColor: twinColor }}
            >
              <span className="text-xl">💧💩</span> Both
            </button>
          </div>
        </div>
      )}

      {/* Nap flow */}
      {activity === 'nap' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setActivity(null)}
            className="self-start text-sm text-text-muted hover:text-text-secondary transition-colors
                       min-h-[44px] flex items-center"
          >
            &larr; Back
          </button>

          {/* Nap start */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Fell asleep</p>
            <input
              type="datetime-local"
              value={timeValue}
              max={maxDatetime}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Nap end */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Woke up</p>
            <input
              type="datetime-local"
              value={napEndValue}
              max={maxDatetime}
              onChange={(e) => setNapEndValue(e.target.value)}
              className="w-full min-h-[56px] px-4 rounded-2xl bg-white/5 text-text-primary
                         text-base border border-white/10 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Duration preview */}
          {(() => {
            const start = new Date(timeValue);
            const end = new Date(napEndValue);
            const diffMs = end.getTime() - start.getTime();
            if (diffMs <= 0) return (
              <p className="text-sm text-danger text-center">Wake time must be after sleep time</p>
            );
            const min = Math.round(diffMs / 60000);
            const h = Math.floor(min / 60);
            const m = min % 60;
            const label = h > 0 ? `${h}h ${m}m` : `${min}min`;
            return (
              <p className="text-center text-text-secondary text-sm">
                Duration: <span className="font-bold text-text-primary">{label}</span>
              </p>
            );
          })()}

          {/* Log button */}
          <button
            onClick={handleLogNap}
            disabled={new Date(napEndValue) <= new Date(timeValue)}
            className="min-h-[72px] rounded-2xl text-lg font-bold active:scale-[0.97] transition-all
                       text-[#0F1117] disabled:opacity-40 disabled:pointer-events-none"
            style={{ backgroundColor: twinColor }}
          >
            Log Nap
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
