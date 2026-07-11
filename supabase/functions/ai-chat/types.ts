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

export interface AIContextListItem {
  productId: string;
  productName: string;
  categoryName: string | null;
  quantity: number;
  status: "pending" | "purchased" | "unavailable";
}

export interface AIContextHistoryEntry {
  listId: string;
  completedAt: string | null;
  items: Array<{ productName: string; quantity: number }>;
}

export interface AIContext {
  household: { id: string; name: string } | null;
  members: Array<{ userId: string; displayName: string | null }>;
  activeList: { id: string; items: AIContextListItem[] } | null;
  products: Array<{ id: string; name: string; categoryName: string | null }>;
  categories: Array<{ slug: string; displayName: string }>;
  reminders: Array<{ id: string; title: string | null; note: string }>;
  shoppingHistory: AIContextHistoryEntry[];
  conversationHistory: AIMessage[];
  conversationState: ConversationState;
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

export interface GenerateParams {
  systemPrompt: string;
  contextSummary: string;
  history: AIMessage[];
  message: string;
}

export interface GenerateResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AIProvider {
  generate(params: GenerateParams): Promise<GenerateResult>;
}

export interface RawModelOutput {
  reply: string;
  intent?: string;
  payload?: Record<string, unknown>;
}
