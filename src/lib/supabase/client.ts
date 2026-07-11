import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True only when both env vars are present. Auth/session code paths check
 * this before talking to Supabase, so the app keeps working (logged-out)
 * in environments where no Supabase project has been linked yet.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Browser-only singleton. A placeholder URL/key is used when not configured
// so `createClient` doesn't throw at import time; callers must check
// `isSupabaseConfigured` before issuing requests.
export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const sessionReady: Promise<void> = isSupabaseConfigured
  ? supabase.auth.getSession().then(() => {})
  : Promise.resolve();
