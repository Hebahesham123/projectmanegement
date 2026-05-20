'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Single-select dropdown with expandable parent options.
// Children declared in `groups` are themselves valid selectable values.
export function HierarchySelect({
  options,
  groups,
  value,
  onChange,
  allLabel = 'All',
  allValue = 'all',
  className,
  buttonClassName,
}: {
  options: readonly string[];
  groups?: Record<string, readonly string[]>;
  value: string;
  onChange: (next: string) => void;
  allLabel?: string;
  allValue?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggleExpand = (opt: string) => setExpanded(s => ({ ...s, [opt]: !s[opt] }));
  const pick = (opt: string) => { onChange(opt); setOpen(false); };

  const labelFor = (v: string) => (v === allValue ? allLabel : v);

  function renderOption(opt: string, depth: number): React.ReactNode {
    const selected = value === opt;
    const children = groups?.[opt];
    const hasChildren = !!children && children.length > 0;
    const isOpen = !!expanded[opt];
    return (
      <div key={opt}>
        <div
          className={cn(
            'flex w-full items-center gap-1 rounded-lg pe-3 text-sm',
            selected
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
          )}
          style={{ paddingInlineStart: 8 + depth * 16 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleExpand(opt); }}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label={isOpen ? 'Collapse' : 'Expand'}
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <button
            type="button"
            onClick={() => pick(opt)}
            className="flex flex-1 items-center justify-between py-2 text-start"
          >
            <span>{opt}</span>
            {selected && <Check className="h-4 w-4" />}
          </button>
        </div>
        {hasChildren && isOpen && (
          <div>{children!.map(c => renderOption(c, depth + 1))}</div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900',
          buttonClassName,
        )}
      >
        <span className={value === allValue ? 'text-slate-500' : 'text-slate-800 dark:text-slate-100'}>
          {labelFor(value)}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => pick(allValue)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm',
              value === allValue
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
            )}
          >
            <span>{allLabel}</span>
            {value === allValue && <Check className="h-4 w-4" />}
          </button>
          {options.map(opt => renderOption(opt, 0))}
        </div>
      )}
    </div>
  );
}
