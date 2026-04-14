import type { PairMember } from '../../types';

interface MemberManagementProps {
  members: PairMember[];
  currentUserId: string;
  isOwner: boolean;
  onRevoke: (memberId: string) => void;
}

export function MemberManagement({ members, currentUserId, isOwner, onRevoke }: MemberManagementProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary">Caregivers</h3>
      <p className="text-xs text-text-muted">
        {members.length} member{members.length !== 1 ? 's' : ''} with access
      </p>

      <div className="flex flex-col gap-2">
        {members.map((member) => {
          const isYou = member.user_id === currentUserId;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
            >
              {/* Avatar placeholder */}
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center
                              text-sm font-bold text-text-secondary shrink-0">
                {member.display_name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {member.display_name}
                  </span>
                  {isYou && (
                    <span className="text-[10px] text-text-muted">(you)</span>
                  )}
                </div>
                <span className="text-xs text-text-muted capitalize">{member.role}</span>
              </div>

              {isOwner && !isYou && member.role !== 'owner' && (
                <button
                  onClick={() => onRevoke(member.id)}
                  className="text-xs font-medium text-danger px-3 py-1.5 rounded-lg bg-danger/10
                             active:scale-95 transition-transform min-h-[36px]"
                >
                  Revoke
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
