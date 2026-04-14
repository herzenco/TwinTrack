interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  twinColor?: string;
  disabled?: boolean;
  active?: boolean;
  size?: 'normal' | 'compact';
}

export function ActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  twinColor,
  disabled = false,
  active = false,
  size = 'normal',
}: ActionButtonProps) {
  const baseClasses = `
    flex items-center justify-center gap-2.5 rounded-2xl font-bold
    transition-all duration-150 select-none
    active:scale-[0.96] active:brightness-90
    disabled:opacity-40 disabled:pointer-events-none
  `;

  const sizeClasses = size === 'compact'
    ? 'min-h-[64px] px-4 text-base'
    : 'min-h-[72px] px-5 text-lg';

  const variantClasses = (() => {
    if (active && twinColor) {
      return 'text-[#0F1117] font-bold';
    }
    switch (variant) {
      case 'danger':
        return 'bg-danger/15 text-danger hover:bg-danger/25';
      case 'secondary':
        return 'bg-white/[0.06] text-text-secondary hover:bg-white/10';
      default:
        return 'bg-white/[0.08] text-text-primary hover:bg-white/12';
    }
  })();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses}`}
      style={
        active && twinColor
          ? { backgroundColor: twinColor }
          : twinColor && variant === 'primary'
            ? { borderColor: `${twinColor}33`, borderWidth: '1px' }
            : undefined
      }
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
