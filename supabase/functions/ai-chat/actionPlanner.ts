import type { AIIntent, PlannedAction, RawModelOutput } from "./types.ts";

const KNOWN_INTENTS: readonly AIIntent[] = [
  "Question",
  "AddProduct",
  "UpdateQuantity",
  "RemoveProduct",
  "Recipe",
  "Suggestion",
];

const CONFIRMATION_REQUIRED: Record<AIIntent, boolean> = {
  Question: false,
  AddProduct: true,
  UpdateQuantity: true,
  RemoveProduct: true,
  Recipe: true,
  Suggestion: false,
};

function isKnownIntent(value: unknown): value is AIIntent {
  return typeof value === "string" && (KNOWN_INTENTS as readonly string[]).includes(value);
}

export function classifyResponse(raw: RawModelOutput): PlannedAction {
  const intent = isKnownIntent(raw.intent) ? raw.intent : "Question";
  return {
    intent,
    requiresConfirmation: CONFIRMATION_REQUIRED[intent],
    payload: raw.payload ?? {},
  };
}
