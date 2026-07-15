import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth/AuthProvider";
import { requireGuest } from "../lib/auth/requireAuth";
import { translateAuthError } from "../lib/auth/authErrors";

export const Route = createFileRoute("/register")({
  beforeLoad: requireGuest,
  head: () => ({
    meta: [
      { title: "הרשמה — רשימת קניות" },
      { name: "description", content: "יצירת חשבון עם אימייל וסיסמה." },
    ],
  }),
  component: Register,
});

const MIN_PASSWORD_LENGTH = 6;

function Register() {
  const { signUp, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`הסיסמה קצרה מדי — נדרשים לפחות ${MIN_PASSWORD_LENGTH} תווים.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email, password);
      if (needsConfirmation) {
        // Email confirmation required — show the check-your-inbox screen.
        setAwaitingConfirmation(true);
        setTimeout(() => navigate({ to: "/login" }), 3000);
      } else {
        // Session created immediately — navigate straight into the app.
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <section
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"
        dir="rtl"
      >
        <div className="rounded-full bg-primary/10 p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold">בדקו את תיבת הדואר שלכם</h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            שלחנו קישור אימות לכתובת{" "}
            <span className="font-medium text-foreground" dir="ltr">
              {email}
            </span>
            . לחצו על הקישור כדי להפעיל את החשבון ולהתחבר.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            מועברים למסך ההתחברות בעוד מספר שניות…
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      dir="rtl"
    >
      <h1 className="text-2xl font-semibold tracking-tight">הרשמה</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        צרו חשבון חדש עם אימייל וסיסמה
      </p>

      {!isConfigured && (
        <div className="mt-6 max-w-sm rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          חיבור ל-Supabase טרם הוגדר בסביבה זו. יש להגדיר{" "}
          <code className="font-mono text-xs">VITE_SUPABASE_URL</code> ו-
          <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> ב-
          <code className="font-mono text-xs">.env.local</code> (ראו{" "}
          <code className="font-mono text-xs">docs/supabase-setup.md</code>).
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex w-full max-w-sm flex-col gap-3">
        <div className="text-right">
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            אימייל
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            dir="ltr"
          />
        </div>

        <div className="text-right">
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            סיסמה
          </label>
          <p className="mb-1 text-xs text-muted-foreground">לפחות {MIN_PASSWORD_LENGTH} תווים</p>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm outline-none focus:border-ring"
              dir="ltr"
            />
            <button
              type="button"
              aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            אימות סיסמה
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm outline-none focus:border-ring"
              dir="ltr"
            />
            <button
              type="button"
              aria-label={showConfirm ? "הסתר אימות סיסמה" : "הצג אימות סיסמה"}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={!isConfigured || loading}
          className="mt-2 inline-flex items-center justify-center rounded-[14px] bg-[#B5652F] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(181,101,47,.28)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "יוצר חשבון…" : "יצירת חשבון"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        יש לך חשבון?{" "}
        <Link to="/login" className="font-medium underline underline-offset-4">
          התחברות
        </Link>
      </p>
    </section>
  );
}
