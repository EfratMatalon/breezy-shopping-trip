/**
 * Translates raw Supabase Auth error messages (English) into friendly Hebrew
 * strings for display in the UI. Matches against known message substrings
 * so it stays robust across minor Supabase version wording changes.
 */
export function translateAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "אימייל או סיסמה שגויים. אנא בדקו ונסו שוב.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "כתובת האימייל הזו כבר רשומה. נסו להתחבר.";
  }
  if (lower.includes("email not confirmed")) {
    return "האימייל טרם אומת. בדקו את תיבת הדואר הנכנס ולחצו על קישור האימות.";
  }
  if (lower.includes("password should be at least") || lower.includes("password is too short")) {
    return "הסיסמה קצרה מדי — נדרשים לפחות 5 תווים.";
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "כתובת האימייל אינה תקינה.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit") || lower.includes("over_email_send_rate_limit")) {
    return "יותר מדי ניסיונות. המתינו מספר דקות ונסו שוב.";
  }
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror")
  ) {
    return "שגיאת רשת. בדקו את החיבור לאינטרנט ונסו שוב.";
  }
  if (lower.includes("signup is disabled")) {
    return "ההרשמה סגורה כרגע. פנו למנהל המערכת.";
  }

  // Return original if in Hebrew already (avoid double-translating)
  if (/[֐-׿]/.test(msg)) return msg;

  return "אירעה שגיאה. נסו שוב.";
}
