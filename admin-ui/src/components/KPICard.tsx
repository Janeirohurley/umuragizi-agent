import type { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  footer?: ReactNode;
  icon: string;
}

export function KPICard({ title, value, subtitle, trend, footer, icon }: KPICardProps) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-on-surface-variant text-sm">{title}</p>
          <p className="text-3xl font-semibold text-on-surface mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
        </div>
      </div>
      {subtitle && (
        <p className="text-on-surface-variant text-xs mb-2">{subtitle}</p>
      )}
      {trend && (
        <div className="flex items-center gap-1 mb-3">
          <span className={`text-xs font-medium ${trend.positive ? 'text-secondary' : 'text-error'}`}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        </div>
      )}
      {footer && (
        <div className="pt-3 border-t border-outline-variant">
          {footer}
        </div>
      )}
    </div>
  );
}
