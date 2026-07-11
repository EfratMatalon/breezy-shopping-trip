import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../_shared/database.ts";
import { AIError } from "./errors.ts";

type Client = SupabaseClient<Database>;

export interface HouseholdRow {
  household_id: string;
  household: { id: string; name: string } | null;
}

export async function findUserHousehold(
  supabase: Client,
  userId: string,
): Promise<HouseholdRow | null> {
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, households(id, name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AIError("ProviderError", "Failed to resolve household membership", { cause: error });
  }
  if (!data) return null;

  const household = (data as unknown as { households: { id: string; name: string } | null })
    .households;
  return { household_id: data.household_id, household };
}

export interface MemberRow {
  user_id: string;
  display_name: string | null;
}

export async function fetchMembers(
  supabase: Client,
  householdId: string,
): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("user_id, profiles(display_name)")
    .eq("household_id", householdId);

  if (error) {
    throw new AIError("ProviderError", "Failed to load household members", { cause: error });
  }

  return (data ?? []).map((m) => {
    const profile = m.profiles as unknown as { display_name: string | null } | null;
    return { user_id: m.user_id, display_name: profile?.display_name ?? null };
  });
}

export interface ProductRow {
  id: string;
  name: string;
  category_id: string | null;
}

export async function fetchActiveProducts(
  supabase: Client,
  householdId: string,
): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category_id")
    .or(`household_id.is.null,household_id.eq.${householdId}`)
    .eq("active", true);

  if (error) {
    throw new AIError("ProviderError", "Failed to load products", { cause: error });
  }
  return (data ?? []) as ProductRow[];
}

export interface CategoryRow {
  slug: string;
  display_name_he: string;
}

export async function fetchActiveCategories(supabase: Client): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("slug, display_name_he")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new AIError("ProviderError", "Failed to load categories", { cause: error });
  }
  return (data ?? []) as CategoryRow[];
}

export async function fetchActiveListId(
  supabase: Client,
  householdId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("household_id", householdId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new AIError("ProviderError", "Failed to load active list", { cause: error });
  }
  return data?.id ?? null;
}

export interface ListItemRow {
  product_id: string;
  quantity: number;
  status: string;
  product_name: string;
  product_category_id: string | null;
}

export async function fetchListItems(
  supabase: Client,
  listId: string,
): Promise<ListItemRow[]> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select("product_id, quantity, status, products(name, category_id)")
    .eq("list_id", listId);

  if (error) {
    throw new AIError("ProviderError", "Failed to load active list items", { cause: error });
  }

  return (data ?? []).map((row) => {
    const product = row.products as unknown as {
      name: string;
      category_id: string | null;
    } | null;
    return {
      product_id: row.product_id,
      quantity: row.quantity,
      status: row.status,
      product_name: product?.name ?? "",
      product_category_id: product?.category_id ?? null,
    };
  });
}

export interface NoteRow {
  id: string;
  title: string | null;
  note: string;
}

export async function fetchListNotes(
  supabase: Client,
  listId: string,
): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from("shopping_notes")
    .select("id, title, note")
    .eq("shopping_list_id", listId);

  if (error) {
    throw new AIError("ProviderError", "Failed to load shopping notes", { cause: error });
  }
  return (data ?? []) as NoteRow[];
}

export interface HistoryListRow {
  id: string;
  completed_at: string | null;
  items: Array<{ product_name: string; quantity: number }>;
}

const MAX_HISTORY_LISTS = 5;

export async function fetchCompletedLists(
  supabase: Client,
  householdId: string,
): Promise<HistoryListRow[]> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, completed_at, shopping_items(quantity, products(name))")
    .eq("household_id", householdId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(MAX_HISTORY_LISTS);

  if (error) {
    throw new AIError("ProviderError", "Failed to load shopping history", { cause: error });
  }

  return (data ?? []).map((list) => {
    const items = (
      list as unknown as {
        shopping_items: Array<{ quantity: number; products: { name: string } | null }>;
      }
    ).shopping_items;
    return {
      id: list.id,
      completed_at: list.completed_at,
      items: (items ?? []).map((i) => ({
        product_name: i.products?.name ?? "",
        quantity: i.quantity,
      })),
    };
  });
}
