import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase/client";
import { queryKeys } from "../queries/queryKeys";

/**
 * Subscribes to Supabase Realtime postgres_changes on shopping_items,
 * filtered to a single list_id. On any INSERT/UPDATE/DELETE, invalidates
 * the listItems and activeList React Query caches so the UI refreshes
 * automatically.
 *
 * Unsubscribes when the component unmounts or when listId/householdId change.
 * Safe to call with undefined — no subscription is created until both ids
 * are present.
 */
export function useShoppingItemsChannel(
  listId: string | undefined,
  householdId: string | undefined,
) {
  const queryClient = useQueryClient();
  // Stable ref so the effect callback never closes over a stale queryClient
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!listId || !householdId) return;

    const channelName = `shopping_items:list_id=eq.${listId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${listId}`,
        },
        () => {
          queryClientRef.current.invalidateQueries({
            queryKey: queryKeys.listItems(listId),
          });
          queryClientRef.current.invalidateQueries({
            queryKey: queryKeys.activeList(householdId),
          });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // On channel error, do a one-time refetch so the UI isn't stale
          queryClientRef.current.invalidateQueries({
            queryKey: queryKeys.listItems(listId),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId, householdId]);
}
