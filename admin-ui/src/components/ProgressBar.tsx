interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'primary' | 'secondary' | 'warning' | 'error';
  height?: number;
  showLabel?: boolean;
}

const colorStyles = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  warning: 'bg-amber-400',
  error: 'bg-error',
};

export function ProgressBar({ value, max = 100, color = 'primary', height = 6, showLabel = false }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs text-on-surface-variant mb-1">
          <span>{value.toLocaleString()}</span>
          <span>{max.toLocaleString()}</span>
        </div>
      )}
      <div
        className="w-full bg-surface-high rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className={`${colorStyles[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%`, height: '100%' }}
        />
      </div>
    </div>
  );
}
