import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { supabase } from "../lib/supabase/client";
import { translateAuthError } from "../lib/auth/authErrors";

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

const MIN_PASSWORD_LENGTH = 5;

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

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

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
      // Clipboard API unavailable — silently ignore.
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPwError(`הסיסמה החדשה קצרה מדי — נדרשים לפחות ${MIN_PASSWORD_LENGTH} תווים.`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError("הסיסמאות החדשות אינן תואמות.");
      return;
    }

    setPwLoading(true);
    try {
      // Re-authenticate first to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (signInError) {
        setPwError("הסיסמה הנוכחית שגויה.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPwError(translateAuthError(updateError));
        return;
      }

      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPwError(translateAuthError(err));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <section dir="rtl">
      <h1 className="text-2xl font-semibold tracking-tight">{household.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">הגדרות בית וניהול חברים</p>

      {/* Invite code */}
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
            <p className="mt-1 text-xs text-muted-foreground">הקוד הישן יפסיק לעבוד מיידית</p>
            {regenError && <p className="mt-2 text-sm text-destructive">{regenError}</p>}
          </div>
        )}
      </div>

      {/* Household members */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">חברי הבית</h2>
        {membersQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">טוען…</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60">
            {(membersQuery.data ?? []).map((member) => {
              const isMe = member.user_id === user?.id;
              const isOwner = member.user_id === household.created_by;
              const displayName = member.profile?.display_name || null;
              const email = member.profile?.email || null;

              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      {displayName ?? email ?? "משתמש"}
                      {isMe && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          אתם
                        </span>
                      )}
                    </div>
                    {displayName && email && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                        {email}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isOwner
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isOwner ? "יוצר הבית" : "חבר"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Change password */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">שינוי סיסמה</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          יש להזין את הסיסמה הנוכחית לאימות לפני הגדרת סיסמה חדשה
        </p>

        <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-3">
          {/* Current password */}
          <div className="text-right">
            <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">
              סיסמה נוכחית
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm outline-none focus:border-ring"
                dir="ltr"
              />
              <button
                type="button"
                aria-label={showCurrent ? "הסתר סיסמה" : "הצג סיסמה"}
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="text-right">
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">
              סיסמה חדשה
            </label>
            <p className="mb-1 text-xs text-muted-foreground">לפחות {MIN_PASSWORD_LENGTH} תווים</p>
            <div className="relative">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                required
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm outline-none focus:border-ring"
                dir="ltr"
              />
              <button
                type="button"
                aria-label={showNew ? "הסתר סיסמה חדשה" : "הצג סיסמה חדשה"}
                onClick={() => setShowNew((v) => !v)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div className="text-right">
            <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium">
              אימות סיסמה חדשה
            </label>
            <div className="relative">
              <input
                id="confirmNewPassword"
                type={showConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm outline-none focus:border-ring"
                dir="ltr"
              />
              <button
                type="button"
                aria-label={showConfirm ? "הסתר אימות" : "הצג אימות"}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          {pwSuccess && (
            <p className="text-sm text-green-700">הסיסמה עודכנה בהצלחה!</p>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="mt-1 self-start rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pwLoading ? "מעדכן סיסמה…" : "עדכן סיסמה"}
          </button>
        </form>
      </div>

      {/* Leave household */}
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
