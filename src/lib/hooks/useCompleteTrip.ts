import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase/client";
import { queryKeys } from "../queries/queryKeys";

type CompleteTripArgs = {
  householdId: string;
  activeListId: string;
  carryPending: boolean;
  carryUnavailable: boolean;
};

export type CompleteTripResult = {
  new_list_id: string;
  archived_list_id: string;
};

async function completeTripRpc(args: CompleteTripArgs): Promise<CompleteTripResult> {
  const { data, error } = await supabase.rpc("complete_shopping_trip", {
    p_household_id: args.householdId,
    p_active_list_id: args.activeListId,
    p_carry_pending: args.carryPending,
    p_carry_unavailable: args.carryUnavailable,
  });
  if (error) throw error;
  return data as CompleteTripResult;
}

export function useCompleteTrip(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { activeListId: string; carryPending: boolean; carryUnavailable: boolean }) => {
      if (!householdId) throw new Error("No household");
      return completeTripRpc({ householdId, ...args });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeList(householdId) });
    },
  });
}
