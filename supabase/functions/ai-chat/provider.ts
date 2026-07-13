import { getGeminiConfig } from "./config.ts";
import { AIError } from "./errors.ts";
import type { AIProvider, GenerateParams, GenerateResult } from "./types.ts";
import { RESPONSE_SCHEMA } from "./schemas/responseSchema.ts";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 20_000;

async function generate(params: GenerateParams): Promise<GenerateResult> {
  const config = getGeminiConfig();

  const contents = [
    ...params.history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: params.message }] },
  ];

  const requestBody = {
    systemInstruction: {
      parts: [{ text: `${params.systemPrompt}\n\n## הקשר נוכחי (JSON)\n${params.contextSummary}` }],
    },
    contents,
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${config.model}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new AIError("TimeoutError", "Gemini request timed out", { cause });
    }
    throw new AIError("NetworkError", "Failed to reach Gemini", { cause });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    throw new AIError("RateLimitError", "Gemini rate limit exceeded");
  }
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new AIError(
      "ProviderError",
      `Gemini responded with status ${response.status}: ${bodyText}`,
    );
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new AIError("InvalidResponseError", "Gemini response did not include text content");
  }

  return {
    text,
    usage: {
      inputTokens: json?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

export const geminiProvider: AIProvider = { generate };
