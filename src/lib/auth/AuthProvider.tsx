import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../supabase/client";

export type SignUpResult = {
  /** True when Supabase requires email confirmation before the session is active. */
  needsConfirmation: boolean;
};

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, firstName?: string) => Promise<SignUpResult>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isConfigured: isSupabaseConfigured,
      signUp: async (email, password, firstName) => {
        if (!isSupabaseConfigured) {
          throw new Error("Supabase is not configured (missing VITE_SUPABASE_* env vars)");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: firstName ? { data: { full_name: firstName } } : undefined,
        });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },
      signInWithPassword: async (email, password) => {
        if (!isSupabaseConfigured) {
          throw new Error("Supabase is not configured (missing VITE_SUPABASE_* env vars)");
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        if (!isSupabaseConfigured) return;
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
