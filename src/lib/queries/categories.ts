import { supabase } from "../supabase/client";
import type { Database } from "../supabase/types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
