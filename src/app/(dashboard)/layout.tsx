'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DataHydrator } from '@/lib/store/DataHydrator';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'pt-sidebar-open';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore saved preference on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved !== null) setDesktopOpen(saved === '1');
  }, []);

  const toggleDesktop = () => {
    setDesktopOpen(o => {
      const next = !o;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <DataHydrator />

      {/* Desktop sidebar — collapsible */}
      <div
        className={cn(
          'hidden overflow-hidden transition-[width] duration-300 ease-out lg:block',
          desktopOpen ? 'w-64' : 'w-0'
        )}
      >
        <Sidebar onClose={toggleDesktop} />
      </div>

      {/* Mobile sidebar — off-canvas */}
      <div className={cn('fixed inset-0 z-40 lg:hidden', mobileOpen ? 'block' : 'hidden')}>
        <div className="absolute inset-0 bg-slate-950/60" onClick={() => setMobileOpen(false)} />
        <div className="relative z-10 h-full">
          <Sidebar onClose={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <Topbar
          onToggleSidebar={() => {
            if (window.matchMedia('(min-width: 1024px)').matches) toggleDesktop();
            else setMobileOpen(true);
          }}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
