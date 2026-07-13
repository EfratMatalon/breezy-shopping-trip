import { AIError } from "../errors.ts";
import type { RawModelOutput } from "../types.ts";

export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    intent: {
      type: "STRING",
      enum: ["Question", "AddProduct", "UpdateQuantity", "RemoveProduct", "Recipe", "Suggestion"],
    },
  },
  required: ["reply", "intent"],
} as const;

const VALID_INTENTS = new Set<string>(RESPONSE_SCHEMA.properties.intent.enum);

export function validateModelOutput(raw: unknown): RawModelOutput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    const detail = `expected object, got ${Array.isArray(raw) ? "array" : typeof raw}`;
    console.error(JSON.stringify({ event: "ai_schema_violation", detail }));
    throw new AIError("InvalidResponseError", `Model output schema violation: ${detail}`);
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.reply !== "string") {
    const detail = `"reply" must be a string, got ${typeof obj.reply}`;
    console.error(JSON.stringify({ event: "ai_schema_violation", detail }));
    throw new AIError("InvalidResponseError", `Model output schema violation: ${detail}`);
  }

  if (typeof obj.intent !== "string" || !VALID_INTENTS.has(obj.intent)) {
    const detail = `"intent" must be one of [${[...VALID_INTENTS].join(", ")}], got ${JSON.stringify(obj.intent)}`;
    console.error(JSON.stringify({ event: "ai_schema_violation", detail }));
    throw new AIError("InvalidResponseError", `Model output schema violation: ${detail}`);
  }

  if (
    obj.payload !== undefined &&
    (typeof obj.payload !== "object" || obj.payload === null || Array.isArray(obj.payload))
  ) {
    const detail = `"payload" must be a plain object when present`;
    console.error(JSON.stringify({ event: "ai_schema_violation", detail }));
    throw new AIError("InvalidResponseError", `Model output schema violation: ${detail}`);
  }

  return obj as RawModelOutput;
}
