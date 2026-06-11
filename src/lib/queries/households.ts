import { supabase } from "../supabase/client";
import type { Database } from "../supabase/types";

export type Household = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdMember = Database["public"]["Tables"]["household_members"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type MyHousehold = {
  household: Household;
  membership: HouseholdMember;
} | null;

export type HouseholdMemberWithProfile = HouseholdMember & {
  profile: Pick<Profile, "id" | "display_name" | "email" | "avatar_url">;
};

/**
 * Resolves the single household the given user belongs to (or null).
 * One row max — `household_members.user_id` is UNIQUE (ADR-11).
 */
export async function fetchMyHousehold(userId: string): Promise<MyHousehold> {
  const { data, error } = await supabase
    .from("household_members")
    .select("id, household_id, user_id, joined_at, households(*)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { households, ...membership } = data as HouseholdMember & {
    households: Household;
  };

  return { household: households, membership };
}

/** Members of a household, joined with their profile (display name, avatar). */
export async function fetchHouseholdMembers(
  householdId: string,
): Promise<HouseholdMemberWithProfile[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("id, household_id, user_id, joined_at, profiles(id, display_name, email, avatar_url)")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { profiles, ...rest } = row as HouseholdMember & {
      profiles: HouseholdMemberWithProfile["profile"];
    };
    return { ...rest, profile: profiles };
  });
}

export type CreateHouseholdResult = {
  household_id: string;
  invite_code: string;
  list_id: string;
};

export async function createHousehold(name: string): Promise<CreateHouseholdResult> {
  const { data, error } = await supabase.rpc("create_household", { p_name: name });
  if (error) throw error;
  return data as unknown as CreateHouseholdResult;
}

export type JoinHouseholdResult = {
  household_id: string;
};

export async function joinHouseholdByCode(code: string): Promise<JoinHouseholdResult> {
  const { data, error } = await supabase.rpc("join_household_by_code", { p_code: code });
  if (error) throw error;
  return data as unknown as JoinHouseholdResult;
}

export async function regenerateInviteCode(householdId: string): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_invite_code", {
    p_household_id: householdId,
  });
  if (error) throw error;
  return data as string;
}

export async function leaveHousehold(): Promise<void> {
  const { error } = await supabase.rpc("leave_household");
  if (error) throw error;
}

/**
 * Maps the error-code-style messages raised by the Phase 1 RPCs
 * (UNAUTHORIZED / FORBIDDEN / NOT_FOUND / CONFLICT / ALREADY_IN_HOUSEHOLD)
 * to a Hebrew message for display.
 */
export function householdErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err);
  switch (code) {
    case "ALREADY_IN_HOUSEHOLD":
      return "אתם כבר חברים בבית אחר. כדי להצטרף לבית הזה יש לעזוב את הבית הנוכחי תחילה.";
    case "NOT_FOUND":
      return "קוד ההזמנה אינו תקין.";
    case "FORBIDDEN":
      return "אין לכם הרשאה לבצע פעולה זו.";
    case "UNAUTHORIZED":
      return "יש להתחבר מחדש כדי להמשיך.";
    case "CONFLICT":
      return "הפעולה נכשלה עקב התנגשות נתונים.";
    default:
      return "אירעה שגיאה. נסו שוב.";
  }
}
