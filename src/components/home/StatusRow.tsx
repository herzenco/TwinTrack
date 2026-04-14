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
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-sm shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-secondary truncate">
            {label}:
          </span>
          <span className="text-xs text-text-primary truncate">
            {timestamp ? formatTimeAgo(timestamp) : 'No data'}
          </span>
        </div>
        {detail && (
          <span className="text-[11px] text-text-muted truncate block">
            {detail}
          </span>
        )}
      </div>
      {highlight && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-text-primary shrink-0">
          {highlight}
        </span>
      )}
    </div>
  );
}
