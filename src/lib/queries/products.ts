import { supabase } from "../supabase/client";
import type { Database } from "../supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];

/**
 * System catalog (household_id IS NULL) plus the household's own products.
 * `or()` filter mirrors the RLS policy for `products` select.
 */
export async function fetchProducts(householdId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(`household_id.is.null,household_id.eq.${householdId}`)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
