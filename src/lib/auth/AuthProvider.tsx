'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useData } from '@/lib/store/data';
import type { UserProfile } from '@/lib/types';

type Ctx = {
  user: { id: string; email?: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<Ctx['user']>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', uid).single();
      setProfile((data as UserProfile) ?? null);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // getSession() reads from local cookies — no network, instant
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      const u = session?.user ?? null;
      setUser(u ? { id: u.id, email: u.email ?? undefined } : null);
      setLoading(false); // unblock UI immediately

      // Profile fetch runs in the background — doesn't block render
      if (u) fetchProfile(u.id);
    };

    // Safety net: never hang longer than 2s on init
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 2000);

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u ? { id: u.id, email: u.email ?? undefined } : null);
      if (u) fetchProfile(u.id);
      else setProfile(null);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    useData.getState().reset();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const refresh = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function canManageProjects(role?: UserProfile['role'] | null) {
  return role === 'admin' || role === 'project_manager';
}
