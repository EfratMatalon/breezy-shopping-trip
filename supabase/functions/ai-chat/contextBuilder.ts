import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../_shared/database.ts";
import type { AIContext, AIMessage, ConversationState } from "./types.ts";
import {
  findUserHousehold,
  fetchMembers,
  fetchActiveProducts,
  fetchActiveCategories,
  fetchActiveListId,
  fetchListItems,
  fetchListNotes,
  fetchCompletedLists,
} from "./repository.ts";

const MAX_CONVERSATION_MESSAGES = 10;

export function defaultConversationState(): ConversationState {
  return { pendingIntent: null, awaitingField: null, collectedSlots: {} };
}

function emptyContext(
  conversationHistory: AIMessage[],
  conversationState: ConversationState,
): AIContext {
  return {
    household: null,
    members: [],
    activeList: null,
    products: [],
    categories: [],
    reminders: [],
    shoppingHistory: [],
    conversationHistory,
    conversationState,
  };
}

export interface BuildContextParams {
  supabase: SupabaseClient<Database>;
  userId: string;
  conversationHistory?: AIMessage[];
  conversationState?: ConversationState;
}

export async function buildContext(params: BuildContextParams): Promise<AIContext> {
  const { supabase, userId } = params;
  const conversationHistory = (params.conversationHistory ?? []).slice(-MAX_CONVERSATION_MESSAGES);
  const conversationState = params.conversationState ?? defaultConversationState();

  const membership = await findUserHousehold(supabase, userId);
  if (!membership) {
    return emptyContext(conversationHistory, conversationState);
  }

  const householdId = membership.household_id;

  const [members, products, categories, activeListId, history] = await Promise.all([
    fetchMembers(supabase, householdId),
    fetchActiveProducts(supabase, householdId),
    fetchActiveCategories(supabase),
    fetchActiveListId(supabase, householdId),
    fetchCompletedLists(supabase, householdId),
  ]);

  const categoryNameBySlug = new Map(categories.map((c) => [c.slug, c.display_name_he]));

  let activeList: AIContext["activeList"] = null;
  let reminders: AIContext["reminders"] = [];

  if (activeListId) {
    const [items, notes] = await Promise.all([
      fetchListItems(supabase, activeListId),
      fetchListNotes(supabase, activeListId),
    ]);

    activeList = {
      id: activeListId,
      items: items.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        categoryName: row.product_category_id
          ? (categoryNameBySlug.get(row.product_category_id) ?? null)
          : null,
        quantity: row.quantity,
        status: row.status as "pending" | "purchased" | "unavailable",
      })),
    };

    reminders = notes.map((n) => ({ id: n.id, title: n.title, note: n.note }));
  }

  return {
    household: membership.household
      ? { id: membership.household.id, name: membership.household.name }
      : { id: householdId, name: "" },
    members: members.map((m) => ({
      userId: m.user_id,
      displayName: m.display_name,
    })),
    activeList,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      categoryName: p.category_id ? (categoryNameBySlug.get(p.category_id) ?? null) : null,
    })),
    categories: categories.map((c) => ({
      slug: c.slug,
      displayName: c.display_name_he,
    })),
    reminders,
    shoppingHistory: history.map((list) => ({
      listId: list.id,
      completedAt: list.completed_at,
      items: list.items.map((i) => ({
        productName: i.product_name,
        quantity: i.quantity,
      })),
    })),
    conversationHistory,
    conversationState,
  };
}
