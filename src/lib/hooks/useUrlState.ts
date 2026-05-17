'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Two-way bind a piece of UI state to a URL query parameter.
 * Refreshing, going back/forward, or sharing the URL preserves the value.
 *
 * Pass `defaultValue` — when the state matches it, the param is removed from
 * the URL to keep things clean.
 */
export function useUrlState(key: string, defaultValue: string): [string, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!next || next === defaultValue) params.delete(key);
      else params.set(key, next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [defaultValue, key, pathname, router, searchParams],
  );

  return [value, setValue];
}
