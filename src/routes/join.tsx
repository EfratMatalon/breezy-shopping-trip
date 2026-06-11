import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { requireAuth } from "../lib/auth/requireAuth";
import { useAuth } from "../lib/auth/AuthProvider";
import { queryKeys } from "../lib/queries/queryKeys";
import { joinHouseholdByCode, householdErrorMessage } from "../lib/queries/households";

export const Route = createFileRoute("/join")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "הצטרפות לבית — רשימת קניות" },
      { name: "description", content: "הצטרפו לבית עם קוד הזמנה." },
    ],
  }),
  component: JoinByCodeForm,
});

function JoinByCodeForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);
    try {
      await joinHouseholdByCode(trimmed);
      await queryClient.invalidateQueries({ queryKey: queryKeys.myHousehold(user?.id) });
      navigate({ to: "/" });
    } catch (err) {
      setError(householdErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <section
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      dir="rtl"
    >
      <h1 className="text-2xl font-semibold tracking-tight">הצטרפות לבית</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        הזינו את קוד ההזמנה שקיבלתם מבן/בת המשפחה
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-right shadow-sm"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="קוד הזמנה (8 תווים)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-ring"
          maxLength={8}
        />
        {error && (
          <div className="mt-2 text-sm text-destructive">
            {error}
            {error.includes("לעזוב") && (
              <>
                {" "}
                <Link to="/settings/household" className="underline underline-offset-4">
                  להגדרות הבית
                </Link>
              </>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="mt-3 w-full rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow)] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "מצטרפים…" : "הצטרפו לבית"}
        </button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        אין לכם עדיין בית?{" "}
        <Link to="/onboarding" className="font-medium text-foreground underline-offset-4 hover:underline">
          צרו בית חדש
        </Link>
      </div>
    </section>
  );
}
