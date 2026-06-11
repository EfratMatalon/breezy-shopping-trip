import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { requireAuth, requireHousehold } from "../lib/auth/requireAuth";
import { useAuth } from "../lib/auth/AuthProvider";
import { useMyHousehold } from "../lib/household/useMyHousehold";
import { queryKeys } from "../lib/queries/queryKeys";
import {
  fetchHouseholdMembers,
  leaveHousehold,
  regenerateInviteCode,
  householdErrorMessage,
} from "../lib/queries/households";

export const Route = createFileRoute("/settings/household")({
  beforeLoad: async () => {
    await requireAuth();
    await requireHousehold();
  },
  head: () => ({
    meta: [
      { title: "הגדרות בית — רשימת קניות" },
      { name: "description", content: "ניהול הבית, קוד הזמנה וחברים." },
    ],
  }),
  component: HouseholdSettings,
});

function HouseholdSettings() {
  const { user } = useAuth();
  const { household, isCreator, isLoading } = useMyHousehold();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: queryKeys.householdMembers(household?.id),
    queryFn: () => fetchHouseholdMembers(household!.id),
    enabled: !!household,
  });

  if (isLoading || !household) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center" dir="rtl">
        <p className="text-sm text-muted-foreground">טוען…</p>
      </section>
    );
  }

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${household.invite_code}`
      : `/join/${household.invite_code}`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — silently ignore (text remains visible).
    }
  };

  const handleRegenerate = async () => {
    setRegenError(null);
    setRegenLoading(true);
    try {
      await regenerateInviteCode(household.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.myHousehold(user?.id) });
    } catch (err) {
      setRegenError(householdErrorMessage(err));
    } finally {
      setRegenLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("פעולה זו תוציא אתכם מהבית ותאבדו גישה לרשימה המשותפת. להמשיך?")) {
      return;
    }
    setLeaveError(null);
    setLeaveLoading(true);
    try {
      await leaveHousehold();
      await queryClient.invalidateQueries({ queryKey: queryKeys.myHousehold(user?.id) });
      navigate({ to: "/onboarding" });
    } catch (err) {
      setLeaveError(householdErrorMessage(err));
      setLeaveLoading(false);
    }
  };

  return (
    <section dir="rtl">
      <h1 className="text-2xl font-semibold tracking-tight">{household.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">הגדרות בית וניהול חברים</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">קוד הזמנה</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          שתפו קוד זה (או את הקישור) עם בני משפחה כדי שיצטרפו לבית
        </p>

        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest">
            {household.invite_code}
          </code>
          <button
            type="button"
            onClick={() => handleCopy(household.invite_code)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {copied ? "הועתק!" : "העתק קוד"}
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground">
            {inviteLink}
          </code>
          <button
            type="button"
            onClick={() => handleCopy(inviteLink)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            העתק קישור
          </button>
        </div>

        {isCreator && (
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenLoading}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {regenLoading ? "מחדש קוד…" : "צור קוד הזמנה חדש"}
            </button>
            <p className="mt-1 text-xs text-muted-foreground">
              הקוד הישן יפסיק לעבוד מיידית
            </p>
            {regenError && <p className="mt-2 text-sm text-destructive">{regenError}</p>}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">חברי הבית</h2>
        {membersQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">טוען…</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(membersQuery.data ?? []).map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {member.profile?.display_name || member.profile?.email || "משתמש"}
                  {member.user_id === user?.id && (
                    <span className="mr-2 text-xs text-muted-foreground">(אתם)</span>
                  )}
                  {member.user_id === household.created_by && (
                    <span className="mr-2 text-xs text-muted-foreground">· יוצר הבית</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-destructive/30 bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-destructive">עזיבת הבית</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          תאבדו גישה לרשימה המשותפת ולהיסטוריה של בית זה
        </p>
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaveLoading}
          className="mt-3 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {leaveLoading ? "עוזבים…" : "עזוב בית"}
        </button>
        {leaveError && <p className="mt-2 text-sm text-destructive">{leaveError}</p>}
      </div>
    </section>
  );
}
