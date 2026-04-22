'use client';

import { cn } from '@/lib/utils';
import { initialsFromName } from '@/lib/utils';

export function Avatar({
  name,
  email,
  size = 32,
  className,
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = initialsFromName(name, email);
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white shadow-soft',
        className
      )}
      title={name ?? email ?? ''}
    >
      {initials}
    </div>
  );
}
