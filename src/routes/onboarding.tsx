import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { requireAuth, requireNoHousehold } from "../lib/auth/requireAuth";
import { useAuth } from "../lib/auth/AuthProvider";
import { queryKeys } from "../lib/queries/queryKeys";
import { createHousehold, householdErrorMessage } from "../lib/queries/households";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    await requireAuth();
    await requireNoHousehold();
  },
  head: () => ({
    meta: [
      { title: "הקמת בית — רשימת קניות" },
      { name: "description", content: "צרו בית חדש או הצטרפו לבית קיים." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);
    try {
      await createHousehold(trimmed);
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
      <h1 className="text-2xl font-semibold tracking-tight">ברוכים הבאים</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        כדי להתחיל, צרו בית חדש או הצטרפו לבית קיים
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-right shadow-sm"
      >
        <h2 className="text-base font-semibold">צרו בית חדש</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          תהיו היוצרים של הבית ותוכלו לשתף קוד הזמנה עם בני המשפחה
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: משפחת כהן"
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="mt-3 w-full rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow)] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "יוצר בית…" : "צור בית"}
        </button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        כבר קיבלתם הזמנה?{" "}
        <Link to="/join" className="font-medium text-foreground underline-offset-4 hover:underline">
          הצטרפו לבית עם קוד הזמנה
        </Link>
      </div>
    </section>
  );
}
