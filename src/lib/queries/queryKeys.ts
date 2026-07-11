export const queryKeys = {
  categories: () => ["categories"] as const,
  myHousehold: (userId: string | undefined) => ["myHousehold", userId] as const,
  householdMembers: (householdId: string | undefined) =>
    ["householdMembers", householdId] as const,
  activeList: (householdId: string | undefined) =>
    ["activeList", householdId] as const,
  listItems: (listId: string | undefined) => ["listItems", listId] as const,
  products: (householdId: string | undefined) => ["products", householdId] as const,
  notes: (listId: string | undefined) => ["notes", listId] as const,
  completedLists: (householdId: string | undefined) => ["completedLists", householdId] as const,
};
