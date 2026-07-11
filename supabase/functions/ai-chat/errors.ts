export type AIErrorType =
  | "TimeoutError"
  | "RateLimitError"
  | "ProviderError"
  | "NetworkError"
  | "InvalidResponseError";

export class AIError extends Error {
  readonly type: AIErrorType;

  constructor(type: AIErrorType, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.type = type;
    this.name = "AIError";
  }
}

export function normalizeAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;

  if (error instanceof DOMException && error.name === "AbortError") {
    return new AIError("TimeoutError", "The AI request timed out", { cause: error });
  }

  if (error instanceof Error) {
    return new AIError("ProviderError", error.message, { cause: error });
  }

  return new AIError("ProviderError", "Unknown AI error", { cause: error });
}
