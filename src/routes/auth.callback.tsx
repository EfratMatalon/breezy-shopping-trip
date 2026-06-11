import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "מתחברים…" }],
  }),
  component: AuthCallback,
});

/**
 * Lands here after Google redirects back from Supabase Auth (PKCE).
 * The Supabase client has `detectSessionInUrl: true`, so it exchanges the
 * code for a session automatically on load — this page just waits for that
 * to complete and then redirects home.
 */
function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate({ to: "/login" });
      return;
    }

    let cancelled = false;

    const finish = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) {
        navigate({ to: "/" });
        return;
      }
      // Not ready yet — wait for onAuthStateChange to fire.
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          navigate({ to: "/" });
        }
      });
      return () => subscription.unsubscribe();
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center" dir="rtl">
      {error ? (
        <>
          <h1 className="text-xl font-semibold text-destructive">שגיאת התחברות</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">מתחברים…</p>
      )}
    </section>
  );
}
