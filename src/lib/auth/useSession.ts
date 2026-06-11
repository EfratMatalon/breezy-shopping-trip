import { useAuth } from "./AuthProvider";

/**
 * Thin convenience hook for components that only need session/user/loading
 * without the sign-in/sign-out actions.
 */
export function useSession() {
  const { session, user, loading, isConfigured } = useAuth();
  return { session, user, loading, isConfigured };
}
