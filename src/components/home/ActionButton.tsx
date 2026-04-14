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
    flex items-center justify-center gap-2 rounded-xl font-semibold
    transition-all duration-150 active:scale-95 select-none
    disabled:opacity-40 disabled:pointer-events-none
  `;

  const sizeClasses = size === 'compact'
    ? 'min-h-[48px] px-3 text-sm'
    : 'min-h-[60px] px-4 text-base';

  const variantClasses = (() => {
    if (active && twinColor) {
      return 'text-bg-primary font-bold';
    }
    switch (variant) {
      case 'danger':
        return 'bg-danger/15 text-danger hover:bg-danger/25';
      case 'secondary':
        return 'bg-white/5 text-text-secondary hover:bg-white/10';
      default:
        return 'bg-white/8 text-text-primary hover:bg-white/12';
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
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
