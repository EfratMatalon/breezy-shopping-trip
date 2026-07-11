export interface GeminiRuntimeConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export function getGeminiConfig(): GeminiRuntimeConfig {
  const env = Deno.env;
  const apiKey = env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return {
    apiKey,
    model: env.get("GEMINI_MODEL") ?? "gemini-2.5-flash",
    temperature: Number(env.get("GEMINI_TEMPERATURE") ?? 0.4),
    maxOutputTokens: Number(env.get("GEMINI_MAX_TOKENS") ?? 1024),
  };
}
