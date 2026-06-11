const PENDING_INVITE_KEY = "shopping-pal:pending-invite";

/** Stores an invite code before redirecting an unauthenticated user to /login. */
export function setPendingInvite(code: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_INVITE_KEY, code);
}

export function getPendingInvite(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PENDING_INVITE_KEY);
}

export function clearPendingInvite() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_INVITE_KEY);
}
