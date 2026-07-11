import { supabase } from "../supabase/client";
import type { Database } from "../supabase/types";

export type ShoppingList = Database["public"]["Tables"]["shopping_lists"]["Row"];
export type ShoppingItem = Database["public"]["Tables"]["shopping_items"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];

export type ShoppingItemWithProduct = ShoppingItem & {
  product: Pick<Product, "id" | "name" | "category_id" | "image"> & {
    categories: { display_name_he: string } | null;
  };
};

/**
 * The single active shopping list for a household, or null if none exists.
 * `shopping_lists_one_active_per_household` guarantees at most one row.
 */
export async function fetchActiveList(
  householdId: string,
): Promise<ShoppingList | null> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type CompletedListRow = {
  id: string;
  household_id: string;
  completed_at: string | null;
  created_at: string;
  shopping_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    status: "pending" | "purchased" | "unavailable";
    sort_order: number;
    created_at: string;
    products: {
      id: string;
      name: string;
      category_id: string | null;
      image: string | null;
      categories: { display_name_he: string } | null;
    } | null;
  }>;
  shopping_notes: Array<{
    id: string;
    note: string;
    title: string | null;
    sort_order: number;
    created_at: string;
  }>;
};

export async function fetchCompletedLists(householdId: string): Promise<CompletedListRow[]> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select(`
      id, household_id, completed_at, created_at,
      shopping_items(id, product_id, quantity, status, sort_order, created_at,
        products(id, name, category_id, image, categories(display_name_he))
      ),
      shopping_notes(id, note, title, sort_order, created_at)
    `)
    .eq("household_id", householdId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as unknown as CompletedListRow[];
}

/** Items on a list, joined with their product (name, category). */
export async function fetchListItems(
  listId: string,
): Promise<ShoppingItemWithProduct[]> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select("*, products(id, name, category_id, image, categories(display_name_he))")
    .eq("list_id", listId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { products, ...rest } = row as ShoppingItem & {
      products: ShoppingItemWithProduct["product"];
    };
    return { ...rest, product: products };
  });
}
