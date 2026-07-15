import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth/AuthProvider";
import { requireGuest } from "../lib/auth/requireAuth";
import { translateAuthError } from "../lib/auth/authErrors";
import { getPendingInvite, clearPendingInvite } from "../lib/household/pendingInvite";

export const Route = createFileRoute("/login")({
  beforeLoad: requireGuest,
  head: () => ({
    meta: [
      { title: "התחברות — רשימת קניות" },
      { name: "description", content: "התחברות עם אימייל וסיסמה." },
    ],
  }),
  component: Login,
});

function Login() {
  const { signInWithPassword, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      const pendingCode = getPendingInvite();
      if (pendingCode) {
        clearPendingInvite();
        navigate({ to: "/join/$code", params: { code: pendingCode } });
        return;
      }
      navigate({ to: "/" });
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      dir="rtl"
    >
      <h1 className="text-2xl font-semibold tracking-tight">התחברות</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        התחברו עם אימייל וסיסמה כדי להמשיך
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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={!isConfigured || loading}
          className="mt-2 inline-flex items-center justify-center rounded-[14px] bg-[#B5652F] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(181,101,47,.28)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "מתחבר…" : "התחברות"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        אין לך חשבון?{" "}
        <Link to="/register" className="font-medium underline underline-offset-4">
          הרשמה
        </Link>
      </p>
    </section>
  );
}
