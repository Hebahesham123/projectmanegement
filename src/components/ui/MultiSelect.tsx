'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className,
  groups,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  // Optional parent->children map for hierarchical display. Children are valid options too.
  groups?: Record<string, readonly string[]>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (opt: string) => setExpanded(s => ({ ...s, [opt]: !s[opt] }));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {value.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            value.map(v => (
              <span
                key={v}
                onClick={e => { e.stopPropagation(); toggle(v); }}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200"
              >
                {v}
                <X className="h-3 w-3" />
              </span>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map(opt => renderOption(opt, 0))}
        </div>
      )}
    </div>
  );

  function renderOption(opt: string, depth: number): React.ReactNode {
    const selected = value.includes(opt);
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
          style={{ paddingInlineStart: 12 + depth * 16 }}
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
            onClick={() => toggle(opt)}
            className="flex flex-1 items-center justify-between py-2 text-start"
          >
            <span>{opt}</span>
            {selected && <Check className="h-4 w-4" />}
          </button>
        </div>
        {hasChildren && isOpen && (
          <div>{children!.map(child => renderOption(child, depth + 1))}</div>
        )}
      </div>
    );
  }
}
