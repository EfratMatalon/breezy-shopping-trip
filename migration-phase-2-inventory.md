# Migration Phase 2 — Legacy Infrastructure Inventory

**Date:** 2026-07-14  
**Status:** Audit complete — awaiting approval  
**Rule:** No code was modified to produce this document.

---

## Classification Key

| Label | Meaning |
|---|---|
| **CORE** | Load-bearing. Cannot be removed without breaking the application. |
| **ACTIVE** | In use and correct. Not a migration blocker; keep as-is. |
| **LEGACY** | Currently required by the build but will be replaced in the migration. |
| **OBSOLETE** | Not used by any runtime or build path. Safe to delete. |
| **UNKNOWN** | Cannot confirm usage from static analysis alone. |

---

## 1. Build Infrastructure

---

### `vite.config.ts`
**Classification: LEGACY**

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({ tanstackStart: { spa: { enabled: true } } });
```

**Purpose:** Entry point for the Vite build. Delegates everything to `@lovable.dev/vite-tanstack-config`.

**Who uses it:** Vite at `npm run build` and `npm run dev`.

**Internal deps:** None.

**External deps:** `@lovable.dev/vite-tanstack-config` (which internally chains `@tanstack/react-start/plugin/vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`, `lovable-tagger`, and conditionally `nitro`).

**Runtime usage:** None — build-time only.

**Build usage:** Controls every aspect of the build pipeline: client bundle, server bundle, SPA prerender, HMR, path aliases, CSS processing.

**Why LEGACY:** The entire config is one call to a Lovable-owned black-box function. It cannot be modified, audited, or maintained independently. It requires `@tanstack/react-start` as a peer dependency. After the migration it will be replaced with a standard `vite.config.ts` using `@vitejs/plugin-react` and `@tanstack/router-plugin` directly.

**Safe removal procedure:**
1. Replace with a standard Vite config (see Phase 2 execution plan).
2. Remove `@lovable.dev/vite-tanstack-config`, `@tanstack/react-start`, and `@cloudflare/vite-plugin` from `package.json`.
3. Run `npm install` then `npm run build`.

**Verification:** Build produces `dist/client/` with all route chunks and CSS. Dev server starts on port 8080.

**Rollback:** `git checkout vite.config.ts package.json && npm install`.

---

### `@lovable.dev/vite-tanstack-config` (npm package, v1.8.0)
**Classification: LEGACY**

**Purpose:** Lovable's opaque Vite plugin wrapper. Internally it:
- Calls `tanstackStart()` from `@tanstack/react-start/plugin/vite` to enable SSR/SPA build.
- Loads `lovable-tagger` (`componentTagger`) for Lovable's visual editor tagging — **active in dev mode even outside Lovable sandbox**.
- Loads `@lovable.dev/vite-plugin-hmr-gate` and `@lovable.dev/vite-plugin-dev-server-bridge` in dev mode.
- Conditionally loads `nitro` for Cloudflare/server deployment (skipped when `isSandbox` is false, which is always true outside Lovable).
- Owns Tailwind, tsconfig paths, React, dedupe, and CORS configuration.

**Who uses it:** `vite.config.ts` only.

**Internal deps:** `@tanstack/react-start` (peer), `@vitejs/plugin-react` (peer), `nitro`, `lovable-tagger`, `@lovable.dev/vite-plugin-dev-server-bridge`, `@lovable.dev/vite-plugin-hmr-gate`.

**External deps:** As above.

**Runtime usage:** None.

**Build usage:** Entire build pipeline depends on it.

**Why LEGACY:** Lovable-specific. Not auditable. Requires TanStack Start as peer. Prints warnings on every build outside the Lovable sandbox. All functionality it provides (`@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`, `@tanstack/router-plugin`) can be configured directly.

**Safe removal procedure:** Replaced simultaneously with `vite.config.ts` rewrite (Phase 2).

**Verification:** Same as `vite.config.ts`.

**Rollback:** `git checkout vite.config.ts package.json && npm install`.

---

### `@tanstack/react-start` (npm package, v1.167.39)
**Classification: LEGACY**

**Purpose:** Full-stack SSR framework built on top of TanStack Router. In this project it is used in SPA mode only (`spa: { enabled: true }`). It adds:
- A second build pass that produces `dist/server/server.js` (unused by Vercel SPA deployment).
- A prerender step that crawls and statically renders `/`.
- TanStack Start-specific React APIs: `HeadContent`, `Scripts`, `shellComponent`.
- Module augmentation of `@tanstack/react-start` in `routeTree.gen.ts`.

**Who uses it:** `vite.config.ts` (via `@lovable.dev/vite-tanstack-config`), `src/routes/__root.tsx` (imports `HeadContent`, `Scripts` from `@tanstack/react-router` which re-exports Start APIs when Start is active), `src/routeTree.gen.ts` (declares module).

**Internal deps:** `@tanstack/react-router`, `@tanstack/router-plugin`.

**External deps:** `@cloudflare/vite-plugin` (peer), `nitro`.

**Runtime usage:** `HeadContent` and `Scripts` are rendered at runtime inside `RootShell`. In SPA mode they inject the CSS link tag and JS bundle script tags.

**Build usage:** Doubles the build time by producing a server bundle. Enables the prerender pass.

**Why LEGACY:** The server build and prerender are dead weight for a Vercel SPA deployment. TanStack Router works without TanStack Start. `HeadContent` and `Scripts` will be replaced by a static `index.html`.

**Safe removal procedure:**
1. Delete `shellComponent` and `RootShell` from `src/routes/__root.tsx`.
2. Remove `HeadContent`, `Scripts` imports and `head()` callbacks.
3. Create `index.html` and `src/main.tsx`.
4. Remove from `package.json` dependencies.
5. Run `npm install` then `npm run build`.

**Verification:** `dist/client/` produced, no `dist/server/` produced. Single build pass. App renders in browser.

**Rollback:** `git checkout src/routes/__root.tsx package.json && npm install`.

---

### `@cloudflare/vite-plugin` (npm package, v1.25.5)
**Classification: LEGACY**

**Purpose:** Cloudflare Workers/Pages adapter for Vite. Enables Cloudflare-specific runtime features in the build.

**Who uses it:** Referenced in `package.json` dependencies. Internally loaded by `@lovable.dev/vite-tanstack-config` when `nitro` Cloudflare preset is active.

**Internal deps:** None in source code.

**External deps:** Cloudflare Wrangler toolchain.

**Runtime usage:** None — build-time only.

**Build usage:** In this project's SPA mode, the Lovable config explicitly skips the nitro/Cloudflare deploy plugin (`No Lovable context detected — skipping nitro deploy plugin`). The plugin is loaded as a dependency but produces **no output** in any build run.

**Why LEGACY:** Zero functional contribution in the current build. Required only because `@lovable.dev/vite-tanstack-config` lists it as a dependency. Removing it has no effect on build output.

**Safe removal procedure:** Remove from `package.json` dependencies. Run `npm install`.

**Verification:** `npm run build` produces identical output.

**Rollback:** Re-add `"@cloudflare/vite-plugin": "^1.25.5"` to `package.json`. Run `npm install`.

---

### `@tanstack/router-plugin` (npm package, v1.167.22)
**Classification: ACTIVE**

**Purpose:** Vite plugin that watches `src/routes/` and auto-generates `src/routeTree.gen.ts`. Required for file-based routing to function. Works with standalone TanStack Router (without TanStack Start).

**Who uses it:** Loaded internally by `@lovable.dev/vite-tanstack-config`. After migration, referenced directly in `vite.config.ts`.

**Runtime usage:** None — build/dev only.

**Build usage:** Code generation on every build and file change.

**Why ACTIVE:** Survives the migration unchanged. Will be moved from implicit (loaded by Lovable wrapper) to explicit (configured directly in `vite.config.ts`).

---

## 2. Routing Infrastructure

---

### `src/routes/__root.tsx`
**Classification: LEGACY**

**Purpose:** Defines the root layout for all routes. Wraps the app in providers and renders `Nav` + `<Outlet>`.

**Who uses it:** TanStack Router — referenced in `routeTree.gen.ts` as the root of the route tree.

**Internal deps:** `QueryClientProvider`, `AuthProvider`, `HouseholdProvider`, `AppStateProvider`, `Nav`, `HebrewErrorBoundary`, `getQueryClient`.

**External deps:** `@tanstack/react-router` (imports `HeadContent`, `Scripts`, `HeadContent` — TanStack Start APIs).

**Runtime usage:** Renders on every page load as the layout wrapper.

**Build usage:** TanStack Router plugin processes it to generate route tree.

**Why LEGACY:** Contains three TanStack Start-specific constructs that must be removed:
1. `shellComponent: RootShell` — renders `<html>/<head>/<body>` at SSR time.
2. `RootShell` component — uses `HeadContent` and `Scripts`.
3. `head()` callback — injects `<meta>` tags and font stylesheet via the Start SSR mechanism.

The `RootComponent` function (the actual app layout) is fully CORE and will be preserved.

**Safe removal procedure:**
1. Remove `HeadContent`, `Scripts` imports.
2. Remove `appCss` import (`?url` is a TanStack Start pattern).
3. Remove `shellComponent: RootShell` from `createRootRoute({...})`.
4. Remove `head()` callback from `createRootRoute({...})` (or convert to no-op; meta tags move to `index.html`).
5. Delete `RootShell` function entirely.
6. Move font and CSS links to `index.html`.

**Verification:** App renders with correct layout. Nav appears. Providers are active.

**Rollback:** `git checkout src/routes/__root.tsx`.

---

### `src/routeTree.gen.ts`
**Classification: ACTIVE** (auto-generated, partially LEGACY content)

**Purpose:** Auto-generated file that registers all routes with TanStack Router. Must not be manually edited.

**Who uses it:** `src/router.tsx` imports `routeTree` from here.

**Internal deps:** All route files in `src/routes/`.

**External deps:** `@tanstack/react-router`, `@tanstack/react-start` (via `declare module` at lines 242–243).

**Runtime usage:** Provides the complete route tree to `createRouter`.

**Build usage:** Regenerated on every `vite build` and on file changes during `vite dev`.

**Why ACTIVE (with LEGACY content):** The file itself is correct. However, lines 242–243 declare a module augmentation for `@tanstack/react-start`. After Start is removed, `@tanstack/router-plugin` will automatically regenerate this file without those declarations on the next build run. No manual action required.

---

### `src/router.tsx`
**Classification: CORE**

**Purpose:** Creates the TanStack Router instance via `createRouter`. Also defines `DefaultErrorComponent`.

**Who uses it:** Currently the TanStack Start entry point (implicit). After migration, will be imported by `src/main.tsx`.

**Internal deps:** `src/routeTree.gen.ts`.

**External deps:** `@tanstack/react-router`.

**Runtime usage:** `createRouter` is called to produce the router object used by `RouterProvider`.

**Why CORE:** Survives migration unchanged. The only change is how it is consumed (by `main.tsx` instead of Start's entry mechanism).

---

### Route files (`src/routes/*.tsx`)
**Classification: CORE** (with one exception noted below)

All 9 route files are CORE and survive the migration unchanged. The `beforeLoad` guards, component functions, and query integrations are all TanStack Router APIs (not Start-specific).

**Exception — `src/routes/index.tsx` dead component:**

The `Home()` function component at lines 9–113 is never rendered because `beforeLoad` always throws a redirect. The function references `useMyHousehold`, `useQuery`, `Link`, `ShoppingBasket`, `queryKeys`, `fetchActiveList`, `fetchListItems` — none of which are imported at the top of the file. The TypeScript compiler does not catch this because the function is never tree-shaken (it's in the same module as the exported route). This is dead code. The route itself (lines 1–7) is CORE.

---

## 3. Authentication Infrastructure

---

### `src/lib/supabase/client.ts`
**Classification: CORE**

**Purpose:** Single Supabase client singleton. Exports `supabase`, `isSupabaseConfigured`, `sessionReady`. URL normalization added in Phase 1.

**Who uses it:** `AuthProvider`, `requireAuth`, all query files, realtime hooks, `AssistantPanel`.

**Internal deps:** `src/lib/supabase/types.ts`.

**External deps:** `@supabase/supabase-js`.

**Runtime usage:** Every Supabase operation flows through this client.

**Build usage:** Vite replaces `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with string literals at build time.

**Why CORE:** No changes required after Phase 1 fix.

---

### `src/lib/auth/AuthProvider.tsx`
**Classification: CORE**

**Purpose:** React context providing `session`, `user`, `loading`, `isConfigured`, `signInWithPassword`, `signUp`, `signOut`. Subscribes to `supabase.auth.onAuthStateChange`.

**Who uses it:** `src/routes/__root.tsx` (provider), all components/routes via `useAuth()`.

**Internal deps:** `src/lib/supabase/client.ts`.

**External deps:** `@supabase/supabase-js` (types only).

**Runtime usage:** Mounts once at root. Active for the full session.

**Why CORE:** No changes required. Survives migration unchanged.

---

### `src/lib/auth/requireAuth.ts`
**Classification: CORE**

**Purpose:** Four route guards (`requireAuth`, `requireGuest`, `requireHousehold`, `requireNoHousehold`) used as `beforeLoad` callbacks.

**Who uses it:** Route files — `workspace`, `history`, `join`, `join.$code`, `settings.household`, `login`, `register`, `onboarding`.

**Internal deps:** `src/lib/supabase/client.ts`, `src/lib/queryClient.ts`, `src/lib/queries/queryKeys.ts`, `src/lib/queries/households.ts`.

**External deps:** `@tanstack/react-router` (redirect).

**Runtime usage:** Runs before each protected route renders.

**Why CORE:** No changes required. Survives migration unchanged.

---

### `src/lib/auth/authErrors.ts`
**Classification: CORE**

**Purpose:** Translates Supabase English error messages to Hebrew UI strings.

**Who uses it:** `src/routes/login.tsx`, `src/routes/register.tsx`.

**Internal deps:** None.

**External deps:** None.

**Why CORE:** No changes required.

---

### `src/lib/auth/useSession.ts`
**Classification: ACTIVE**

**Purpose:** Thin convenience hook over `useAuth()` — returns only `session`, `user`, `loading`, `isConfigured`. Avoids importing actions in components that don't need them.

**Who uses it:** Not imported by any current route or component (confirmed by grep). Exported for potential future use.

**Internal deps:** `AuthProvider`.

**Why ACTIVE:** Correct, zero-dependency wrapper. No action required.

---

## 4. State Management Infrastructure

---

### `src/lib/store.tsx` (`AppStateProvider`)
**Classification: CORE**

**Purpose:** localStorage-backed React context for the local shopping session: selected items, shopping lists, product catalog, cycle management. Uses `shoplist:state:v1` localStorage key.

**Who uses it:** `src/routes/__root.tsx` (provider), `src/routes/workspace.tsx`, `src/routes/history.tsx`, and others via `useAppState()`.

**Internal deps:** None.

**External deps:** React only.

**Runtime usage:** Mounted at root. Persists to localStorage on every state change.

**Why CORE:** No changes required. Survives migration unchanged.

---

### `src/lib/queryClient.ts`
**Classification: ACTIVE** (with dead server-side code)

**Purpose:** Creates and caches a `QueryClient` singleton. The `typeof window === "undefined"` branch creates a fresh client per SSR request; the browser branch returns a cached singleton.

**Who uses it:** `src/routes/__root.tsx` (`getQueryClient()`), `src/lib/auth/requireAuth.ts` (`getQueryClient().fetchQuery(...)`).

**Internal deps:** None.

**External deps:** `@tanstack/react-query`.

**Runtime usage:** Browser path only. The server path (`typeof window === "undefined"`) is dead code after SPA migration.

**Why ACTIVE:** Correct and functional for SPA use. The server branch is dead code but harmless. Can optionally be simplified post-migration by removing the `typeof window` check.

---

### `src/lib/shopping.ts`
**Classification: OBSOLETE**

**Purpose:** Early localStorage utility — `loadHistory()`, `saveHistory()`, `loadCurrent()`, `saveCurrent()` — using keys `shoplist:history` and `shoplist:current`. Predates the Supabase migration.

**Who uses it:** **Nobody.** Confirmed by full-project grep: zero imports of this module in `src/`.

**Internal deps:** None.

**External deps:** None.

**Runtime usage:** None — never imported.

**Build usage:** None — dead module, tree-shaken out of the bundle.

**Why OBSOLETE:** All shopping state was migrated to `src/lib/store.tsx` (`shoplist:state:v1`) and Supabase. This file is an unreachable remnant. Its localStorage keys are different from the current ones, so deleting it cannot corrupt existing data.

**Safe removal procedure:** Delete `src/lib/shopping.ts`.

**Verification:** `npm run build` completes without error. No import error.

**Rollback:** `git checkout src/lib/shopping.ts`.

---

## 5. Supabase Infrastructure

---

### `src/lib/supabase/types.ts`
**Classification: CORE**

**Purpose:** Auto-generated TypeScript types for the full Supabase database schema. Used by `createClient<Database>`.

**Who uses it:** `src/lib/supabase/client.ts`, all query files.

**Why CORE:** Do not manually edit. Regenerate with `supabase gen types typescript` after schema changes.

---

### `src/lib/queries/` (all files)
**Classification: CORE**

All query files (`categories.ts`, `households.ts`, `items.ts`, `lists.ts`, `notes.ts`, `products.ts`, `queryKeys.ts`) are CORE. They contain Supabase PostgREST calls consumed by route components via TanStack Query. No changes required for the migration.

---

### `src/lib/realtime/useShoppingItemsChannel.ts` and `useShoppingNotesChannel.ts`
**Classification: ACTIVE**

**Purpose:** Subscribe to Supabase Realtime channels for live shopping item and note updates.

**Who uses it:** `src/routes/workspace.tsx`.

**External deps:** `@supabase/supabase-js` (via client singleton).

**Why ACTIVE:** Correct and functional. No changes required.

---

### `supabase/config.toml`
**Classification: CORE**

**Purpose:** Local Supabase stack configuration. Defines ports, auth settings, Realtime, and the `ai-chat` Edge Function entrypoint.

**Who uses it:** `supabase` CLI (`npm run supabase:start`).

**Why CORE:** Required for local development. Do not modify.

---

### `supabase/migrations/` (9 files)
**Classification: CORE**

All 9 migration files define the production database schema, indexes, RLS policies, RPCs, seed data, and Realtime publication. Applied once to the remote project; applied on reset to the local stack.

| File | Content |
|---|---|
| `00001` | Extensions, helper functions, auth trigger |
| `00002` | All core tables (profiles, households, members, products, lists, items, etc.) |
| `00003` | Indexes |
| `00004` | RLS policies |
| `00005` | RPC functions (household lifecycle) |
| `00006` | Product seed data |
| `00007` | Realtime publication |
| `00008` | `complete_shopping_trip_v2` RPC (superseded) |
| `00009` | `complete_shopping_trip_v3` RPC (current) |

**Why CORE:** Applied to production. Irreversible in production. Never delete or reorder.

---

### `supabase/functions/ai-chat/` (entire directory)
**Classification: ACTIVE**

**Purpose:** Deno-based Edge Function. Receives a chat message from the frontend, calls Gemini, returns a structured `AIResponse`. Currently gated by `VITE_AI_ENABLED=false` — the function is deployed but the frontend never calls it.

**Who uses it:** `src/lib/ai/assistantClient.ts` → `supabase.functions.invoke("ai-chat", ...)`.

**External deps (Deno):** `@supabase/functions-js`, `@supabase/server`, `@supabase/supabase-js`.

**Why ACTIVE:** Correct, deployed, gated. No changes required for migration.

---

### `supabase/.temp/linked-project.json`
**Classification: ACTIVE**

**Purpose:** Supabase CLI state — records the linked remote project ref (`jjpcbmaiprjnojszqysp`), name, and org.

**Who uses it:** `supabase` CLI for `push`, `pull`, `gen types`, etc.

**Why ACTIVE:** Required for CLI operations. Gitignored. Do not delete.

---

## 6. Environment Infrastructure

---

### `.env.local`
**Classification: ACTIVE** (with one BROKEN value)

**Purpose:** Local environment variables baked into the Vite bundle at build time.

**Contents:**
```
VITE_SUPABASE_URL=https://jjpcbmaiprjnojszqysp.supabase.co   ✅ correct
VITE_SUPABASE_ANON_KEY=sb_publishable_nVimC8Ffkw_g3ohsILE1eg_l5U9nWRw   ❌ wrong format
VITE_AI_ENABLED=false                                                     ✅ correct
```

**Why ACTIVE:** Required for local development. Gitignored. The `VITE_SUPABASE_ANON_KEY` must be replaced with the JWT anon key from Supabase Dashboard → Project Settings → API → `anon public`. This is a credentials issue, not a code issue.

---

### `.env.example`
**Classification: ACTIVE**

**Purpose:** Template for `.env.local`. Committed to git. Explains each variable.

**Why ACTIVE:** Keep as reference documentation. No changes needed.

---

## 7. Developer Tooling

---

### `eslint.config.js`
**Classification: ACTIVE**

**Purpose:** ESLint flat config with TypeScript, React Hooks, and Prettier rules.

**Why ACTIVE:** Standard configuration. No Lovable-specific content. Survives migration unchanged.

---

### `.prettierrc` / `.prettierignore`
**Classification: ACTIVE**

**Purpose:** Code formatter configuration. `.prettierignore` correctly excludes `routeTree.gen.ts`, `node_modules`, `dist`.

**Why ACTIVE:** Standard. No changes required.

---

### `.gitignore`
**Classification: ACTIVE** (with LEGACY entries)

**Why ACTIVE:** Correct. Contains two LEGACY entries that are harmless to keep:
- `.output`, `.vinxi`, `.nitro`, `.tanstack/**` — TanStack Start / Vinxi build artifacts. Not produced by SPA builds; no harm leaving them.
- `.wrangler/`, `.dev.vars` — Cloudflare Wrangler. Not used in this project.

These entries do no harm if left in place after the migration.

---

### `components.json`
**Classification: ACTIVE**

**Purpose:** shadcn/ui CLI configuration. Defines component style, Tailwind CSS path, aliases, and icon library.

**Who uses it:** `npx shadcn add <component>` — used to install new shadcn components.

**Why ACTIVE:** Correct. No changes required.

---

### `bunfig.toml`
**Classification: OBSOLETE**

**Purpose:** Bun package manager configuration (`saveTextLockfile = false`).

**Who uses it:** Nobody. The project uses `npm` (`package-lock.json` is present). There is no script that invokes Bun.

**Internal deps:** None.

**External deps:** Bun runtime.

**Runtime usage:** None.

**Build usage:** None.

**Why OBSOLETE:** Lovable originally scaffolded with Bun. The project has since been using npm exclusively. This file is inert.

**Safe removal procedure:** Delete `bunfig.toml`.

**Verification:** `npm install` and `npm run build` are unaffected (they never read this file).

**Rollback:** `git checkout bunfig.toml`.

---

### `bun.lockb` (binary lockfile)
**Classification: OBSOLETE**

**Purpose:** Bun's binary dependency lockfile.

**Who uses it:** Nobody. `npm` uses `package-lock.json`.

**Why OBSOLETE:** Same reason as `bunfig.toml`. Bun is not used.

**Safe removal procedure:** Delete `bun.lockb`.

**Verification:** `npm install` is unaffected.

**Rollback:** `git checkout bun.lockb`.

---

### `.vscode/extensions.json`
**Classification: ACTIVE**

**Purpose:** Recommends `denoland.vscode-deno` extension. Required for Deno intellisense in `supabase/functions/`.

**Why ACTIVE:** Correct. Keep.

---

### `.vscode/settings.json`
**Classification: ACTIVE**

**Purpose:** Enables Deno language server scoped to `supabase/functions/` only. Prevents Deno's type checker from conflicting with TypeScript in `src/`.

**Why ACTIVE:** Correct. Keep.

---

### `.claude/launch.json`
**Classification: ACTIVE**

**Purpose:** Claude Code dev server configuration for the in-app browser preview.

**Why ACTIVE:** Keep. The `vite-dev` server configuration is correct.

---

## 8. Obsolete Documentation (Lovable Build Artifacts)

---

### Root-level markdown files
**Classification: OBSOLETE**

The following files were generated by Lovable's AI during the original build phases. They are not referenced by any code, test, or configuration. They describe historical implementation decisions, not the current system state.

| File |
|---|
| `PLAN.md` |
| `phase1-implementation-report.md` |
| `phase1-validation-report.md` |
| `phase2-implementation-report.md` |
| `phase3-implementation-report.md` |
| `phase3-readiness-report.md` |
| `phase4-implementation-plan.md` |
| `phase4-implementation-plan-v2.md` |
| `phase4-readiness-report.md` |
| `phase4-slice1-implementation-report.md` |
| `phase4-slice2-implementation-report.md` |
| `shopping-pal-phase1-design.md` |
| `shopping-ui-design-review.md` |
| `shopping-ui-design-v1.md` |
| `supabase-deployment-report.md` |
| `supabase-status-report.md` |

**Safe removal procedure:** Delete all 16 files.

**Verification:** `npm run build` unaffected. No file imports from root-level markdown.

**Rollback:** `git checkout <filename>` for any individual file.

**Exceptions — keep:**
- `migration-phase-1-baseline.md` — current migration artifact.
- `migration-phase-2-inventory.md` — this file.
- `docs/supabase-setup.md` — useful operational reference.
- `docs/ai/shopping-pal-spec.md` — feature specification.

---

## 9. Source Files — Remaining Classification

---

### `src/lib/categoryImages.ts`
**Classification: OBSOLETE**

**Purpose:** Originally contained a static map of category names to image files. Content replaced with `export {}` and a comment explaining it was removed.

**Who uses it:** Nobody — confirmed by full-project grep.

**Why OBSOLETE:** Empty module. Cannot affect behavior.

**Safe removal procedure:** Delete `src/lib/categoryImages.ts`.

**Verification:** `npm run build` unaffected.

**Rollback:** `git checkout src/lib/categoryImages.ts`.

---

### `src/components/ui/sidebar.tsx`
**Classification: OBSOLETE**

**Purpose:** shadcn sidebar component. Imports `use-mobile` hook.

**Who uses it:** Nobody — no route, layout, or non-UI component imports it. Confirmed by full-project grep.

**Why OBSOLETE:** Generated by Lovable's default shadcn install. Never integrated into the app.

**Cascading effect:** If `sidebar.tsx` is deleted, `src/hooks/use-mobile.tsx` also becomes unreferenced (its only consumer is `sidebar.tsx`).

**Safe removal procedure:** Delete `src/components/ui/sidebar.tsx` and `src/hooks/use-mobile.tsx`.

**Verification:** `npm run build` unaffected.

**Rollback:** `git checkout src/components/ui/sidebar.tsx src/hooks/use-mobile.tsx`.

---

### `src/hooks/use-mobile.tsx`
**Classification: OBSOLETE**

**Purpose:** `useIsMobile()` hook based on a `768px` media query breakpoint.

**Who uses it:** Only `src/components/ui/sidebar.tsx` — which is itself OBSOLETE.

**Why OBSOLETE:** Sole consumer is also OBSOLETE.

**Safe removal procedure:** Delete alongside `sidebar.tsx` (see above).

---

### `src/routes/index.tsx` — dead `Home` component
**Classification:** Route is CORE; `Home()` function is OBSOLETE.

The exported `Route` with `beforeLoad: () => { throw redirect({ to: "/login" }) }` is CORE and must be kept.

The `Home()` function (lines 9–113) is dead code — never rendered, never exported, never tree-shaken because TypeScript doesn't remove functions from modules at compile time. It also references identifiers (`useMyHousehold`, `useQuery`, `Link`, `ShoppingBasket`, `queryKeys`, `fetchActiveList`, `fetchListItems`) that are **not imported at the top of the file**. This means the file would fail TypeScript strict checking if the compiler were asked to type-check it in isolation. Currently the router plugin's route code generation wraps route files in a way that suppresses this.

**Safe removal procedure:** Delete lines 9–113 from `src/routes/index.tsx`. Keep lines 1–7.

**Verification:** `npm run build` unaffected. Route still redirects to `/login`.

**Rollback:** `git checkout src/routes/index.tsx`.

---

### Other `src/components/ui/*` files (38 remaining)
**Classification: ACTIVE**

shadcn/ui primitive components. All are consumed by at least one route or layout component. No action required.

---

## 10. Summary Table

| Artifact | Classification | Action for Phase 2 |
|---|---|---|
| `vite.config.ts` | LEGACY | Replace with standard Vite config |
| `@lovable.dev/vite-tanstack-config` | LEGACY | Remove from package.json |
| `@tanstack/react-start` | LEGACY | Remove from package.json |
| `@cloudflare/vite-plugin` | LEGACY | Remove from package.json |
| `src/routes/__root.tsx` | LEGACY | Remove Start APIs; keep RootComponent |
| `src/routeTree.gen.ts` | ACTIVE | Auto-regenerates; no action |
| `src/router.tsx` | CORE | No action |
| All route files | CORE | No action (except dead Home() function) |
| `src/lib/supabase/client.ts` | CORE | No action (Phase 1 complete) |
| `src/lib/auth/AuthProvider.tsx` | CORE | No action |
| `src/lib/auth/requireAuth.ts` | CORE | No action |
| `src/lib/auth/authErrors.ts` | CORE | No action |
| `src/lib/auth/useSession.ts` | ACTIVE | No action |
| `src/lib/store.tsx` | CORE | No action |
| `src/lib/queryClient.ts` | ACTIVE | Optional: remove SSR branch post-migration |
| `src/lib/household/HouseholdProvider.tsx` | CORE | No action |
| `src/lib/household/useMyHousehold.ts` | ACTIVE | No action |
| `src/lib/household/pendingInvite.ts` | ACTIVE | No action |
| `src/lib/queries/*` | CORE | No action |
| `src/lib/realtime/*` | ACTIVE | No action |
| `src/lib/ai/*` | ACTIVE | No action |
| `src/lib/imageHelpers.ts` | ACTIVE | No action |
| `src/lib/utils.ts` | ACTIVE | No action |
| `src/lib/shopping.ts` | OBSOLETE | Delete |
| `src/lib/categoryImages.ts` | OBSOLETE | Delete |
| `src/components/Nav.tsx` | CORE | No action |
| `src/components/HebrewErrorBoundary.tsx` | CORE | No action |
| `src/components/AssistantPanel.tsx` | ACTIVE | No action |
| `src/components/ui/sidebar.tsx` | OBSOLETE | Delete |
| `src/hooks/use-mobile.tsx` | OBSOLETE | Delete |
| `src/routes/index.tsx` — `Home()` | OBSOLETE | Delete dead function (lines 9–113) |
| `supabase/config.toml` | CORE | No action |
| `supabase/migrations/*` | CORE | No action |
| `supabase/functions/ai-chat/*` | ACTIVE | No action |
| `supabase/.temp/linked-project.json` | ACTIVE | No action |
| `.env.local` | ACTIVE (broken key) | Fix anon key manually |
| `.env.example` | ACTIVE | No action |
| `bunfig.toml` | OBSOLETE | Delete |
| `bun.lockb` | OBSOLETE | Delete |
| `eslint.config.js` | ACTIVE | No action |
| `.prettierrc` / `.prettierignore` | ACTIVE | No action |
| `.gitignore` | ACTIVE | No action (legacy entries harmless) |
| `components.json` | ACTIVE | No action |
| `.vscode/*` | ACTIVE | No action |
| `.claude/launch.json` | ACTIVE | No action |
| 16 phase report `.md` files | OBSOLETE | Delete |
| `migration-phase-1-baseline.md` | ACTIVE | Keep |
| `migration-phase-2-inventory.md` | ACTIVE | Keep (this file) |
| `docs/supabase-setup.md` | ACTIVE | Keep |
| `docs/ai/shopping-pal-spec.md` | ACTIVE | Keep |

---

## 11. LEGACY/OBSOLETE Removal Sequence (for Phase 2 execution)

When approved, changes should be applied in this order to keep the build passing at every step:

1. **Delete OBSOLETE source files** (no build impact): `shopping.ts`, `categoryImages.ts`, `sidebar.tsx`, `use-mobile.tsx`, dead `Home()` in `index.tsx`.
2. **Delete OBSOLETE root files** (no build impact): `bunfig.toml`, `bun.lockb`, 16 phase report `.md` files.
3. **Replace the build pipeline** (high risk, do last): `vite.config.ts` rewrite + `__root.tsx` rewrite + create `index.html` + create `main.tsx` + `package.json` update + `npm install` + verify build.

---

*End of Phase 2 Inventory — no source code was modified. Awaiting approval.*
