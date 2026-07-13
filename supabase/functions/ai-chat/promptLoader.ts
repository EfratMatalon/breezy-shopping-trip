import { AIError } from "./errors.ts";

// Supabase Edge Runtime restricts async filesystem APIs (Deno.readTextFile)
// to /tmp and /s3 paths inside HTTP handlers. Static files bundled via
// config.toml `static_files` are only accessible during initial script
// evaluation using the synchronous Deno.readTextFileSync API.
//
// We load all prompts eagerly at module evaluation time and serve them
// from memory for every subsequent request.

const prompts = new Map<string, string>();

function eagerLoadPrompt(name: string): void {
  const url = new URL(`./prompts/${name}.md`, import.meta.url);
  try {
    const text = Deno.readTextFileSync(url);
    prompts.set(name, text);
  } catch (cause) {
    console.error(
      JSON.stringify({
        event: "prompt_load_error",
        name,
        attempted_path: url.toString(),
        import_meta_url: import.meta.url,
        error: cause instanceof Error ? cause.message : String(cause),
      }),
    );
    throw new AIError("ProviderError", `Failed to load prompt "${name}"`, { cause });
  }
}

eagerLoadPrompt("shopping-pal");

export function loadPrompt(name: string): string {
  const text = prompts.get(name);
  if (text === undefined) {
    throw new AIError("ProviderError", `Prompt "${name}" was not pre-loaded`);
  }
  return text;
}
