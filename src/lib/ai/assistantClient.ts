// Frontend AI client — Phase 6.0 (see PLAN.md § Phase 6.0 — AI Infrastructure).
//
// The ONLY module the frontend uses to reach the assistant. Sends the
// user's message to the `ai-chat` Supabase Edge Function and never
// imports a Gemini SDK or calls Gemini directly. No prompt strings are
// hardcoded here — prompts live only in src/lib/ai/prompts/*.md, loaded
// server-side by promptLoader.ts.

import { supabase, isSupabaseConfigured } from "../supabase/client";
import { AI_ENABLED } from "./config";
import type { AIMessage, AIResponse, ConversationState } from "./types";

export class AssistantClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AssistantClientError";
  }
}

export interface SendMessageParams {
  message: string;
  /** Round-tripped by the caller — Phase 6.0 does not persist conversation state server-side. */
  conversationHistory?: AIMessage[];
  conversationState?: ConversationState;
}

/**
 * Sends `{ message }` (plus optional conversation continuity fields) to
 * the `ai-chat` Edge Function and returns its structured JSON response.
 */
export async function sendMessage(params: SendMessageParams): Promise<AIResponse> {
  if (!AI_ENABLED) {
    throw new AssistantClientError("AI assistant is disabled");
  }
  if (!isSupabaseConfigured) {
    throw new AssistantClientError("Supabase is not configured");
  }

  const { data, error } = await supabase.functions.invoke<AIResponse>("ai-chat", {
    body: {
      message: params.message,
      conversationHistory: params.conversationHistory,
      conversationState: params.conversationState,
    },
  });

  if (error) {
    throw new AssistantClientError(error.message);
  }
  if (!data) {
    throw new AssistantClientError("Empty response from assistant");
  }

  return data;
}
