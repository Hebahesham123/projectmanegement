'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
          'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...rest}
      />
    );
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
          'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
          'min-h-[96px] resize-y',
          className
        )}
        {...rest}
      />
    );
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
          'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          className
        )}
        {...rest}
      >
        {children}
      </select>
    );
  }
);

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200', className)}>
      {children}
    </label>
  );
}
