import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { queryKeys } from "../queries/queryKeys";
import { fetchMyHousehold, type Household, type MyHousehold } from "../queries/households";

export type HouseholdContextValue = {
  data: MyHousehold;
  household: Household | null;
  isCreator: boolean;
  isLoading: boolean;
  error: unknown;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

/**
 * Thin wrapper around a single React Query (`["myHousehold", userId]`).
 * Holds NO independent state — `data`/`household`/`isCreator` are derived
 * directly from `useQuery`'s result on every render. The query cache is the
 * single source of truth; mutations invalidate this key to trigger refetch.
 */
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.myHousehold(user?.id),
    queryFn: () => fetchMyHousehold(user!.id),
    enabled: isConfigured && !!user,
  });

  const value = useMemo<HouseholdContextValue>(() => {
    const data = query.data ?? null;
    return {
      data,
      household: data?.household ?? null,
      isCreator: data?.household.created_by === user?.id,
      isLoading: isConfigured && !!user ? query.isLoading : false,
      error: query.error,
    };
  }, [query.data, query.isLoading, query.error, user?.id, isConfigured]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx;
}
