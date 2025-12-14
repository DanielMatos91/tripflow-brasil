import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
  },
  info: {
    icon: 'bg-info/10 text-info',
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: KpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn('kpi-card animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.positive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs período anterior</span>
            </div>
          )}
        </div>
        <div className={cn('kpi-card-icon', styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
