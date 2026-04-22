'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

export function KpiCard({
  label,
  value,
  icon,
  accent = 'brand',
  active,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: 'brand' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet';
  active?: boolean;
  onClick?: () => void;
}) {
  const accents = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  };

  const clickable = !!onClick;
  const Tag: 'button' | 'div' = clickable ? 'button' : 'div';

  return (
    <Card
      className={cn(
        'p-0 transition',
        clickable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg',
        active && 'ring-2 ring-brand-500 shadow-lg'
      )}
    >
      <Tag
        type={clickable ? 'button' : undefined}
        onClick={onClick}
        className={cn('flex w-full items-start justify-between p-5 text-start', clickable && 'focus:outline-none')}
      >
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{value}</div>
          {clickable && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
              <ChevronDown className={cn('h-3 w-3 transition-transform', active && 'rotate-180')} />
              {active ? 'Hide details' : 'View details'}
            </div>
          )}
        </div>
        <div className={cn('rounded-xl p-3', accents[accent])}>{icon}</div>
      </Tag>
    </Card>
  );
}
