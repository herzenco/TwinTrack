import { useState, useEffect } from 'react';
import type { ActiveTimer, TwinPair } from '../../types';
import { elapsedMs } from '../../utils/time';

interface NudgeBannerProps {
  timer: ActiveTimer;
  pair: TwinPair;
  twinName: string;
  twinColor: string;
  onConfirmContinue: () => void;
  onStopAndSave: () => void;
}

export function NudgeBanner({
  timer,
  pair,
  twinName,
  twinColor,
  onConfirmContinue,
  onStopAndSave,
}: NudgeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    function check() {
      const elapsed = elapsedMs(timer.started_at);
      const elapsedMin = elapsed / 60000;
      const threshold = timer.type === 'feed'
        ? pair.feed_nudge_minutes
        : pair.nap_nudge_minutes;
      setShouldShow(elapsedMin >= threshold);
    }
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [timer, pair]);

  if (!shouldShow || dismissed) return null;

  const typeLabel = timer.type === 'feed' ? 'feeding' : 'napping';

  return (
    <div
      className="mx-3 mb-2 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in"
      style={{ backgroundColor: `${twinColor}15`, borderLeft: `3px solid ${twinColor}` }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">
          Still {typeLabel}?
        </p>
        <p className="text-xs text-text-secondary truncate">
          {twinName}'s {timer.type} timer has been running a while
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => {
            onConfirmContinue();
            setDismissed(true);
          }}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-white/10 text-text-primary
                     active:scale-95 transition-transform"
        >
          Yes
        </button>
        <button
          onClick={onStopAndSave}
          className="px-3 py-2 text-xs font-semibold rounded-lg active:scale-95 transition-transform"
          style={{ backgroundColor: twinColor, color: '#0F1117' }}
        >
          Stop & Save
        </button>
      </div>
    </div>
  );
}
