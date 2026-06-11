import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { useAuth } from "../lib/auth/AuthProvider";
import { setPendingInvite } from "../lib/household/pendingInvite";
import { queryKeys } from "../lib/queries/queryKeys";
import { joinHouseholdByCode, householdErrorMessage } from "../lib/queries/households";

export const Route = createFileRoute("/join/$code")({
  beforeLoad: async ({ params }) => {
    if (!isSupabaseConfigured) return;

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Remember the invite so /auth/callback can resume here after login.
      setPendingInvite(params.code);
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "הצטרפות לבית — רשימת קניות" },
      { name: "description", content: "הצטרפות לבית באמצעות קישור הזמנה." },
    ],
  }),
  component: JoinByLink,
});

type Status = "loading" | "success" | "error";

function JoinByLink() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate({ to: "/login" });
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await joinHouseholdByCode(code);
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: queryKeys.myHousehold(user?.id) });
        setStatus("success");
        navigate({ to: "/" });
      } catch (err) {
        if (cancelled) return;
        setError(householdErrorMessage(err));
        setStatus("error");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <section
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      dir="rtl"
    >
      {status === "loading" && (
        <p className="text-sm text-muted-foreground">מצטרפים לבית…</p>
      )}

      {status === "error" && (
        <>
          <h1 className="text-xl font-semibold text-destructive">לא ניתן להצטרף</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <div className="mt-6 flex gap-4 text-sm">
            <Link to="/join" className="font-medium underline underline-offset-4">
              נסו קוד אחר
            </Link>
            <Link to="/settings/household" className="font-medium underline underline-offset-4">
              להגדרות הבית
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
