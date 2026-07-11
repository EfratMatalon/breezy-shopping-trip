import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase/client";
import { queryKeys } from "../queries/queryKeys";

export function useShoppingNotesChannel(listId: string | undefined) {
  const queryClient = useQueryClient();
  const qcRef = useRef(queryClient);
  qcRef.current = queryClient;

  useEffect(() => {
    if (!listId) return;

    const channel = supabase
      .channel(`shopping_notes:list_id=eq.${listId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_notes", filter: `shopping_list_id=eq.${listId}` },
        () => qcRef.current.invalidateQueries({ queryKey: queryKeys.notes(listId) }),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          qcRef.current.invalidateQueries({ queryKey: queryKeys.notes(listId) });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [listId]);
}
