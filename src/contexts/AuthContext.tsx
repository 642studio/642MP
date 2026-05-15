import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { profileApi } from '../lib/db';
import type { Profile } from '../types/domain';

interface AuthContextValue {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasConfig: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_BOOT_TIMEOUT_MS = 8000;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

const clearStaleAuthStorage = () => {
  try {
    const projectRef = SUPABASE_URL?.split('https://')[1]?.split('.supabase.co')[0];
    const scopedKey = projectRef ? `sb-${projectRef}-auth-token` : '';
    const keysToRemove = Object.keys(localStorage).filter((key) =>
      scopedKey ? key.includes(scopedKey) : key.includes('-auth-token'),
    );
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // no-op
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = async () => {
    if (!supabase) return;
    try {
      const current = await withTimeout(profileApi.getMine(), 5000, 'TIMEOUT_PROFILE');
      setProfile(current as Profile | null);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setReady(true);
      return;
    }
    const client = supabase;

    const bootstrap = async () => {
      try {
        const { data, error } = await withTimeout(
          client.auth.getSession(),
          AUTH_BOOT_TIMEOUT_MS,
          'TIMEOUT_GET_SESSION',
        );

        if (error) throw error;
        if (!active) return;

        setSession(data.session ?? null);

        if (data.session) {
          await refreshProfile();
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (!active) return;
        console.warn('Auth bootstrap fallback:', error);
        setSession(null);
        setProfile(null);
        clearStaleAuthStorage();
      } finally {
        if (active) setReady(true);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      profile,
      hasConfig: hasSupabaseConfig,
      signIn: async (email, password) => {
        if (!supabase) throw new Error('Supabase no configurado.');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        await refreshProfile();
      },
      signOut: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
        setProfile(null);
      },
      refreshProfile,
    }),
    [ready, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
