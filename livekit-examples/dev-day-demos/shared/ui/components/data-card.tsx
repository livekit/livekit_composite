'use client';

import React from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Metric, type MetricProps } from './metric';

export interface DataCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  metrics?: MetricProps[];
  status?: ReactNode;
  footer?: ReactNode;
  interactive?: boolean;
}

export function DataCard({
  title,
  subtitle,
  description,
  metrics,
  status,
  footer,
  interactive = false,
  className,
  ...props
}: DataCardProps) {
  return (
    <div
      className={cn(
        'group flex flex-col gap-4 rounded-xl border border-separator1 bg-bg1/90 p-5 shadow-sm transition duration-150 ease-out',
        'hover:border-separator2 hover:bg-bg2 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        interactive && 'cursor-pointer',
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-fg0 group-hover:text-fgAccent">
            {title}
          </div>
          {subtitle ? <div className="text-sm text-fg3">{subtitle}</div> : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>

      {description ? <div className="text-sm text-fg2">{description}</div> : null}

      {metrics && metrics.length > 0 ? (
        <div className="flex flex-wrap gap-6">
          {metrics.map((metric, index) => (
            <Metric key={index} {...metric} />
          ))}
        </div>
      ) : null}

      {footer ? <div className="mt-auto text-xs text-fg4">{footer}</div> : null}
    </div>
  );
}
