import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../_shared/database.ts";
import { buildContext } from "./contextBuilder.ts";
import { loadPrompt } from "./promptLoader.ts";
import { geminiProvider } from "./provider.ts";
import { classifyResponse } from "./actionPlanner.ts";
import { AIError, normalizeAIError } from "./errors.ts";
import type { AIMessage, AIResponse, ConversationState, RawModelOutput } from "./types.ts";

export interface HandleChatMessageParams {
  supabase: SupabaseClient<Database>;
  userId: string;
  message: string;
  conversationHistory?: AIMessage[];
  conversationState?: ConversationState;
}

export async function handleChatMessage(params: HandleChatMessageParams): Promise<AIResponse> {
  const message = params.message?.trim();
  if (!message) {
    throw new AIError("InvalidResponseError", "Message must not be empty");
  }

  const context = await buildContext({
    supabase: params.supabase,
    userId: params.userId,
    conversationHistory: params.conversationHistory,
    conversationState: params.conversationState,
  });

  const systemPrompt = await loadPrompt("shopping-pal");

  let modelText: string;
  let usage: AIResponse["usage"];
  try {
    const result = await geminiProvider.generate({
      systemPrompt,
      contextSummary: JSON.stringify(context),
      history: context.conversationHistory,
      message,
    });
    modelText = result.text;
    usage = result.usage;
  } catch (error) {
    throw normalizeAIError(error);
  }

  console.log(JSON.stringify({ event: "ai_token_usage", ...usage }));

  let raw: RawModelOutput;
  try {
    raw = JSON.parse(modelText) as RawModelOutput;
  } catch (cause) {
    throw new AIError("InvalidResponseError", "Gemini did not return valid JSON", { cause });
  }

  if (typeof raw.reply !== "string") {
    throw new AIError("InvalidResponseError", 'Gemini response is missing "reply"');
  }

  const action = classifyResponse(raw);

  return {
    reply: raw.reply,
    action,
    conversationState: context.conversationState,
    usage,
  };
}
