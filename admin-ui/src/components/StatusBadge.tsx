interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'warning' | 'error' | 'info';
  label: string;
}

const statusStyles = {
  active: 'bg-secondary/10 text-secondary border-secondary/20',
  inactive: 'bg-on-surface/5 text-on-surface-variant border-outline-variant',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-error/10 text-error border-error/20',
  info: 'bg-primary/10 text-primary border-primary/20',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'active' ? 'bg-secondary' :
        status === 'error' ? 'bg-error' :
        status === 'warning' ? 'bg-amber-400' :
        status === 'info' ? 'bg-primary' : 'bg-on-surface-variant'
      }`} />
      {label}
    </span>
  );
}
