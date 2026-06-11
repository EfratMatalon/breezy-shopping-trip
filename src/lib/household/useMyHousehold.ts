import { useHousehold } from "./HouseholdProvider";

/**
 * Convenience accessor over `HouseholdProvider`'s React Query-backed
 * context. Returns the household + membership row for the current user
 * (or null if they have none yet).
 */
export function useMyHousehold() {
  const { data, household, isCreator, isLoading, error } = useHousehold();
  return {
    household,
    membership: data?.membership ?? null,
    isCreator,
    isLoading,
    error,
  };
}
