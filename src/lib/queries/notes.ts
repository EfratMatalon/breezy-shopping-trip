import { supabase } from "../supabase/client";
import type { Database } from "../supabase/types";

export type ShoppingNote = Database["public"]["Tables"]["shopping_notes"]["Row"];

export async function fetchNotes(listId: string): Promise<ShoppingNote[]> {
  const { data, error } = await supabase
    .from("shopping_notes")
    .select("*")
    .eq("shopping_list_id", listId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addNote(
  listId: string,
  note: string,
  title: string | null,
): Promise<ShoppingNote> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("shopping_notes")
    .insert({ shopping_list_id: listId, note, title: title || null, created_by: user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(
  id: string,
  note: string,
  title: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("shopping_notes")
    .update({ note, title: title || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("shopping_notes").delete().eq("id", id);
  if (error) throw error;
}
