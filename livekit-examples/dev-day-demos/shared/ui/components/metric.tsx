'use client';

import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface MetricProps {
  label: ReactNode;
  value: ReactNode;
  helperText?: ReactNode;
  className?: string;
}

export function Metric({ label, value, helperText, className }: MetricProps) {
  return (
    <div className={cn('flex min-w-[7.5rem] flex-col gap-1', className)}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-fg4">
        {label}
      </span>
      <span className="text-sm font-medium text-fg1">{value}</span>
      {helperText ? <span className="text-xs text-fg3">{helperText}</span> : null}
    </div>
  );
}
