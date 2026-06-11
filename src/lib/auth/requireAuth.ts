import { redirect } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "../supabase/client";

/**
 * Route `beforeLoad` guard: redirects to `/login` if there is no active
 * Supabase session.
 *
 * Phase 2 note: if no Supabase project is linked yet (`isSupabaseConfigured`
 * is false — see src/lib/supabase/client.ts), the guard is a no-op so the
 * app remains usable during local development without credentials. Once a
 * project is linked this guard becomes fully active automatically.
 */
export async function requireAuth() {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/login" });
  }
}

/**
 * Route `beforeLoad` guard for `/login`: if the user is already
 * authenticated, send them to the home page instead of showing the
 * sign-in screen again.
 */
export async function requireGuest() {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    throw redirect({ to: "/" });
  }
}
