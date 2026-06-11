export const queryKeys = {
  myHousehold: (userId: string | undefined) => ["myHousehold", userId] as const,
  householdMembers: (householdId: string | undefined) =>
    ["householdMembers", householdId] as const,
};
