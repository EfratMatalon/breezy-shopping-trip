import { AIError } from "./errors.ts";

const promptCache = new Map<string, string>();

export async function loadPrompt(name: string): Promise<string> {
  const cached = promptCache.get(name);
  if (cached !== undefined) return cached;

  const url = new URL(`./prompts/${name}.md`, import.meta.url);
  try {
    const text = await Deno.readTextFile(url);
    promptCache.set(name, text);
    return text;
  } catch (cause) {
    throw new AIError("ProviderError", `Failed to load prompt "${name}"`, { cause });
  }
}
