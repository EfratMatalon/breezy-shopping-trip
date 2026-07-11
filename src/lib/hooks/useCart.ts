import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addItem, addItemWithQuantity, setItemQuantity, increaseItemQuantity, decreaseItemQuantity, markPurchased, markPending, markUnavailable } from "../queries/items";
import { queryKeys } from "../queries/queryKeys";

function useInvalidateList(listId: string | undefined, householdId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.listItems(listId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.activeList(householdId) });
  };
}

export function useAddItem(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: (productId: string) => {
      if (!listId) throw new Error("No active list");
      return addItem(listId, productId);
    },
    onSuccess: invalidate,
  });
}

export function useAddItemWithQuantity(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) => {
      if (!listId) throw new Error("No active list");
      return addItemWithQuantity(listId, productId, qty);
    },
    onSuccess: invalidate,
  });
}

export function useSetItemQuantity(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) => {
      if (!listId) throw new Error("No active list");
      return setItemQuantity(listId, productId, qty);
    },
    onSuccess: invalidate,
  });
}

export function useIncreaseQuantity(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: (itemId: string) => increaseItemQuantity(itemId),
    onSuccess: invalidate,
  });
}

export function useDecreaseQuantity(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: (itemId: string) => decreaseItemQuantity(itemId),
    onSuccess: invalidate,
  });
}

export function useMarkPurchased(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: (itemId: string) => markPurchased(itemId),
    onSuccess: invalidate,
  });
}

export function useMarkPending(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: (itemId: string) => markPending(itemId),
    onSuccess: invalidate,
  });
}

export function useMarkUnavailable(listId: string | undefined, householdId: string | undefined) {
  const invalidate = useInvalidateList(listId, householdId);

  return useMutation({
    mutationFn: (itemId: string) => markUnavailable(itemId),
    onSuccess: invalidate,
  });
}
