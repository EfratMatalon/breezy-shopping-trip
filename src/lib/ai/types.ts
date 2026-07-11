export type AIMessageRole = "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export type AIIntent =
  | "Question"
  | "AddProduct"
  | "UpdateQuantity"
  | "RemoveProduct"
  | "Recipe"
  | "Suggestion";

export interface ConversationState {
  pendingIntent: AIIntent | null;
  awaitingField: string | null;
  collectedSlots: Record<string, string>;
}

export interface PlannedAction {
  intent: AIIntent;
  requiresConfirmation: boolean;
  payload: Record<string, unknown>;
}

export interface AIResponse {
  reply: string;
  action: PlannedAction;
  conversationState: ConversationState;
  usage: { inputTokens: number; outputTokens: number };
}
