import { formatTimeAgo } from '../../utils/time';

interface StatusRowProps {
  icon: string;
  label: string;
  timestamp: string | null;
  detail?: string;
  highlight?: string;
}

export function StatusRow({ icon, label, timestamp, detail, highlight }: StatusRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-secondary">
            {label}:
          </span>
          <span className="text-sm text-text-primary truncate">
            {timestamp ? formatTimeAgo(timestamp) : 'No data'}
          </span>
        </div>
        {detail && (
          <span className="text-[13px] text-text-muted truncate block mt-0.5">
            {detail}
          </span>
        )}
      </div>
      {highlight && (
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 text-text-primary shrink-0">
          {highlight}
        </span>
      )}
    </div>
  );
}
