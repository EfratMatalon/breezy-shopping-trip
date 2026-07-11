import { redirect } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured, sessionReady } from "../supabase/client";
import { getQueryClient } from "../queryClient";
import { queryKeys } from "../queries/queryKeys";
import { fetchMyHousehold } from "../queries/households";

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

  await sessionReady;
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

  await sessionReady;
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    throw redirect({ to: "/" });
  }
}

/**
 * Route `beforeLoad` guard: redirects to `/onboarding` if the signed-in
 * user has no household membership yet (ADR-11 — at most one household
 * per user).
 *
 * Uses `queryClient.fetchQuery` with the same query key as
 * `HouseholdProvider`/`useMyHousehold`, so the result is cached and reused
 * by the React tree without a duplicate fetch.
 *
 * Phase 2/3 note: no-op if `!isSupabaseConfigured` (see requireAuth above).
 */
export async function requireHousehold() {
  if (!isSupabaseConfigured) return;

  await sessionReady;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/login" });
  }

  const userId = data.session.user.id;
  const household = await getQueryClient().fetchQuery({
    queryKey: queryKeys.myHousehold(userId),
    queryFn: () => fetchMyHousehold(userId),
  });

  if (!household) {
    throw redirect({ to: "/onboarding" });
  }
}

/**
 * Route `beforeLoad` guard for `/onboarding`: if the user already has a
 * household, send them home instead of showing onboarding again.
 */
export async function requireNoHousehold() {
  if (!isSupabaseConfigured) return;

  await sessionReady;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/login" });
  }

  const userId = data.session.user.id;
  const household = await getQueryClient().fetchQuery({
    queryKey: queryKeys.myHousehold(userId),
    queryFn: () => fetchMyHousehold(userId),
  });

  if (household) {
    throw redirect({ to: "/" });
  }
}
