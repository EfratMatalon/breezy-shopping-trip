import { supabase } from "../supabase/client";
import type { Database } from "../supabase/types";

export type ShoppingItem = Database["public"]["Tables"]["shopping_items"]["Row"];

/**
 * Add a product to the active list. If the product already exists on the list,
 * increment its quantity by 1 instead of creating a duplicate row.
 */
export async function addItem(listId: string, productId: string): Promise<void> {
  return addItemWithQuantity(listId, productId, 1);
}

/**
 * Add `qty` units of a product to the active list.
 * - New item: inserts with the given quantity.
 * - Existing item: adds to current quantity AND resets status to "pending"
 *   so the shopping task is marked incomplete again.
 */
export async function addItemWithQuantity(listId: string, productId: string, qty: number): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("shopping_items")
    .select("id, quantity")
    .eq("list_id", listId)
    .eq("product_id", productId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { error } = await supabase
      .from("shopping_items")
      .update({ quantity: existing.quantity + qty, status: "pending" })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("shopping_items").insert({
      list_id: listId,
      product_id: productId,
      quantity: qty,
    });
    if (error) throw error;
  }
}

/**
 * Set the exact desired quantity for a product on the active list.
 * - qty > 0 and item exists  → UPDATE quantity + reset status to "pending"
 * - qty > 0 and item absent  → INSERT new item
 * - qty = 0 and item exists  → DELETE the item (user removed it)
 * - qty = 0 and item absent  → no-op
 */
export async function setItemQuantity(listId: string, productId: string, qty: number): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("shopping_items")
    .select("id")
    .eq("list_id", listId)
    .eq("product_id", productId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existing) {
    if (qty <= 0) return;
    const { error } = await supabase.from("shopping_items").insert({
      list_id: listId,
      product_id: productId,
      quantity: qty,
    });
    if (error) throw error;
  } else if (qty <= 0) {
    const { error } = await supabase.from("shopping_items").delete().eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("shopping_items")
      .update({ quantity: qty, status: "pending" })
      .eq("id", existing.id);
    if (error) throw error;
  }
}

export async function increaseItemQuantity(itemId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("shopping_items")
    .select("quantity")
    .eq("id", itemId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("shopping_items")
    .update({ quantity: data.quantity + 1 })
    .eq("id", itemId);
  if (error) throw error;
}

export type ItemStatus = "pending" | "purchased" | "unavailable";

async function setItemStatus(itemId: string, status: ItemStatus): Promise<void> {
  const { error } = await supabase
    .from("shopping_items")
    .update({ status })
    .eq("id", itemId);
  if (error) throw error;
}

export const markPurchased = (itemId: string) => setItemStatus(itemId, "purchased");
export const markPending = (itemId: string) => setItemStatus(itemId, "pending");
export const markUnavailable = (itemId: string) => setItemStatus(itemId, "unavailable");

export async function decreaseItemQuantity(itemId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("shopping_items")
    .select("quantity")
    .eq("id", itemId)
    .single();

  if (fetchError) throw fetchError;

  if (data.quantity <= 1) {
    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .eq("id", itemId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("shopping_items")
      .update({ quantity: data.quantity - 1 })
      .eq("id", itemId);
    if (error) throw error;
  }
}
