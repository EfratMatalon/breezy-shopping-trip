import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../_shared/database.ts";
import { handleChatMessage } from "./service.ts";
import { AIError, normalizeAIError, type AIErrorType } from "./errors.ts";
import type { AIMessage, ConversationState } from "./types.ts";

interface ChatRequestBody {
  message: string;
  conversationHistory?: AIMessage[];
  conversationState?: ConversationState;
}

const ERROR_STATUS: Record<AIErrorType, number> = {
  TimeoutError: 504,
  RateLimitError: 429,
  NetworkError: 502,
  ProviderError: 502,
  InvalidResponseError: 502,
};

export default {
  fetch: withSupabase({ auth: "user", cors: true }, async (req, ctx) => {
    let body: ChatRequestBody;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "INVALID_REQUEST", message: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    if (!body?.message || typeof body.message !== "string") {
      return Response.json(
        { error: "INVALID_REQUEST", message: '"message" is required' },
        { status: 400 },
      );
    }

    const claims = ctx.userClaims as { id?: string; sub?: string } | null;
    const userId = claims?.id ?? claims?.sub;
    if (!userId) {
      return Response.json({ error: "UNAUTHORIZED", message: "Sign-in required" }, { status: 401 });
    }

    try {
      const result = await handleChatMessage({
        supabase: ctx.supabase as unknown as SupabaseClient<Database>,
        userId,
        message: body.message,
        conversationHistory: body.conversationHistory,
        conversationState: body.conversationState,
      });

      return Response.json(result);
    } catch (error) {
      const normalized = error instanceof AIError ? error : normalizeAIError(error);
      console.error(
        JSON.stringify({ event: "ai_error", type: normalized.type, message: normalized.message }),
      );
      return Response.json(
        { error: normalized.type, message: normalized.message },
        { status: ERROR_STATUS[normalized.type] ?? 500 },
      );
    }
  }),
};
