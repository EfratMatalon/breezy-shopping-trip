# Migration Phase 3 v2 — Infrastructure Stabilization Plan

**Date:** 2026-07-14  
**Status:** Plan complete — awaiting approval  
**Priority:** Stability first. No framework migration.  
**Rule:** No source code was modified to produce this document.

---

## Objective

Remove Lovable-specific infrastructure while keeping every framework, provider, route, and behaviour unchanged. The application must behave identically before and after. No visible change to any user-facing feature.

---

## What is NOT changing

| Item | Reason |
|---|---|
| `@tanstack/react-start` | Kept. Routing architecture untouched. |
| `src/routes/__root.tsx` | Kept. `shellComponent`, `HeadContent`, `Scripts`, `head()` all preserved. |
| `vercel.json` | Kept. Rewrites to `/_shell.html` — correct for TanStack Start SPA, which still produces that file. |
| All route files | Kept. No change. |
| All providers | Kept. No change. |
| All business logic | Kept. No change. |
| All auth flow | Kept. No change. |
| All Supabase integration | Kept. No change. |
| Build output structure | Kept. `dist/client/` is TanStack Start's default; `_shell.html` is still generated. |

---

## Current vs Target Architecture

### Current build pipeline
```
vite.config.ts
  └── @lovable.dev/vite-tanstack-config (black-box wrapper)
        ├── tanstackStart()              ← from @tanstack/react-start/plugin/vite
        ├── @vitejs/plugin-react         ← added by Lovable wrapper
        ├── @tailwindcss/vite            ← added by Lovable wrapper
        ├── vite-tsconfig-paths          ← added by Lovable wrapper
        ├── lovable-tagger               ← Lovable visual editor (ACTIVE in dev mode)
        ├── @lovable.dev/vite-plugin-hmr-gate         ← Lovable sandbox (dev only)
        ├── @lovable.dev/vite-plugin-dev-server-bridge ← Lovable sandbox (dev only)
        └── nitro / @cloudflare/vite-plugin            ← SKIPPED (no Lovable context)
```

### Target build pipeline
```
vite.config.ts
  └── standard Vite defineConfig (owned by this project)
        ├── tanstackStart()              ← same plugin, same options
        ├── @vitejs/plugin-react         ← same plugin, configured directly
        ├── @tailwindcss/vite            ← same plugin, configured directly
        └── vite-tsconfig-paths          ← same plugin, configured directly
```

All four functional plugins are preserved in the same form. Only the Lovable wrapper and its three proprietary sub-plugins are eliminated.

---

## Complete File Inventory

### Files to CREATE

**None.** TanStack Start continues to own the HTML shell (`_shell.html`) and entry point. No `index.html` or `src/main.tsx` are needed.

---

### Files to MODIFY

#### `vite.config.ts` — REPLACE content

**From (current):**
```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: { enabled: true },
  },
});
```

**To (new):**
```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({ spa: { enabled: true } }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
```

**What changes:**
- `defineConfig` now comes from `vite` directly, not from Lovable.
- `tanstackStart()` is called directly from `@tanstack/react-start/plugin/vite` — the same internal function the Lovable wrapper was calling.
- `spa: { enabled: true }` is preserved exactly — same SPA build mode.
- `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths` are now listed explicitly rather than being silently added by the wrapper.
- No `build.outDir` — TanStack Start's own plugin sets the output structure to `dist/client/` internally.

**What does NOT change:**
- All four functional plugins are the same.
- Build output is identical (`dist/client/`, `dist/server/`, `_shell.html`, prerender).
- Plugin options are identical (`spa: { enabled: true }`).

**Why this is safe:** `tanstackStart()` from `@tanstack/react-start/plugin/vite` is exactly what the Lovable wrapper called internally (confirmed from `@lovable.dev/vite-tanstack-config/dist/index.js` line 261: `const { tanstackStart } = await import("@tanstack/react-start/plugin/vite")`). This is not a different plugin — it is the same plugin, now called directly.

**All four packages are already installed:**
- `@vitejs/plugin-react@^5.0.4` — in `devDependencies` ✅
- `@tailwindcss/vite@^4.2.1` — in `dependencies` ✅
- `vite-tsconfig-paths@^6.0.2` — in `dependencies` ✅
- `@tanstack/react-start@^1.167.14` — in `dependencies` ✅

---

#### `package.json` — MODIFY (2 lines removed)

Remove from `dependencies`:
```
"@cloudflare/vite-plugin": "^1.25.5"
```

Remove from `devDependencies`:
```
"@lovable.dev/vite-tanstack-config": "^1.4.0"
```

**Nothing is added.** All needed packages are already present.

`@tanstack/react-start` **stays in** `dependencies`.

---

#### `src/routes/index.tsx` — MODIFY (dead code only)

The exported `Route` (lines 1–7) is CORE and stays unchanged.

The `Home()` function (lines 9–113) is dead code: `beforeLoad` always throws a redirect so the component is never rendered. It also references identifiers (`useMyHousehold`, `useQuery`, `Link`, `ShoppingBasket`, `queryKeys`, `fetchActiveList`, `fetchListItems`) that are not imported at the top of the file. This means if TypeScript strict checking is ever enabled on this file, it will fail.

**After:**
```ts
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
```

Lines 9–113 deleted. No behaviour change.

---

### Files to DELETE

#### OBSOLETE source files (confirmed zero imports)

| File | Confirmed by |
|---|---|
| `src/lib/shopping.ts` | Full-project grep: zero imports |
| `src/lib/categoryImages.ts` | Content is `export {}` — explicitly emptied; zero imports |
| `src/components/ui/sidebar.tsx` | Full-project grep: not imported in any route or non-UI component |
| `src/hooks/use-mobile.tsx` | Only consumer is `sidebar.tsx` (deleted above) |
| `bunfig.toml` | Bun config; project uses npm (`package-lock.json` present) |
| `bun.lockb` | Bun binary lockfile; project uses npm |

#### OBSOLETE documentation (Lovable build artifacts — 16 files)

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

---

### Files explicitly KEPT unchanged

Everything not listed above. Specifically:

- `vercel.json` — correct as-is for TanStack Start SPA (`_shell.html` still produced)
- `src/routes/__root.tsx` — no change (`shellComponent`, `HeadContent`, `Scripts`, `head()` all preserved)
- All other route files
- All `src/lib/` files (except deleted OBSOLETE ones)
- All `src/components/` files (except deleted `sidebar.tsx`)
- `supabase/` (entire directory)
- `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.gitignore`
- `components.json`, `.env.local`, `.env.example`
- `.vscode/`, `.claude/launch.json`
- `migration-phase-1-baseline.md`, `migration-phase-2-inventory.md`, `migration-phase-3-replacement-plan.md`, `migration-phase-3-v2.md` (this file)
- `docs/supabase-setup.md`, `docs/ai/shopping-pal-spec.md`

---

## Execution Order

Steps are sequenced from zero-risk to highest-risk. Each step is independently verifiable.

---

### STEP 1 — Delete OBSOLETE source files
**Risk: ZERO** — none are imported anywhere; build is unaffected.

Delete:
```
src/lib/shopping.ts
src/lib/categoryImages.ts
src/components/ui/sidebar.tsx
src/hooks/use-mobile.tsx
bunfig.toml
bun.lockb
```

**Verify:** `npm run build` passes. Output is byte-for-byte identical.

**Rollback:** `git checkout -- <file>` for any individual file.

---

### STEP 2 — Delete OBSOLETE documentation files
**Risk: ZERO** — markdown files; no build or runtime impact.

Delete the 16 Lovable phase report files listed above.

**Verify:** `npm run build` passes. No change to output.

**Rollback:** `git checkout -- <filename>` for any individual file.

---

### STEP 3 — Remove dead `Home()` function from `src/routes/index.tsx`
**Risk: LOW** — function is never called; file has `// @ts-nocheck` equivalent protection from the router plugin.

Keep lines 1–7 exactly as shown above. Delete lines 9–113.

**Verify:** `npm run build` passes. Route `/` still redirects to `/login`.

**Rollback:** `git checkout -- src/routes/index.tsx`

---

### STEP 4 — Update `package.json`
**Risk: LOW until `npm install` is run** — file edit alone has no effect.

Remove two entries (see Section above). Validate JSON is well-formed before proceeding.

**Verify:** `package.json` is valid JSON. Do not run `npm install` yet.

**Rollback:** `git checkout -- package.json`

---

### STEP 5 — Replace `vite.config.ts`
**Risk: MEDIUM** — the build will not work with the new config until `npm install` removes the old packages. However, the old packages are still in `node_modules` until Step 6, so a rollback at this point still works immediately.

Write new content exactly as shown in Section above.

**Verify:** File is syntactically valid TypeScript. Do not run build yet.

**Rollback:** `git checkout -- vite.config.ts`

---

### STEP 6 — Run `npm install`
**Risk: MEDIUM** — removes two packages from `node_modules`, updates `package-lock.json`.

```
npm install
```

Expected: `@lovable.dev/vite-tanstack-config` and `@cloudflare/vite-plugin` are removed from `node_modules`. All other packages remain. `package-lock.json` is updated.

If `npm install` reports errors (e.g. peer dependency conflicts), stop here and do not proceed.

**Rollback:** `git checkout -- package.json && npm install` — restores both packages.

---

### STEP 7 — Run `npm run build` and verify
**Risk: HIGH** — first build with the new pipeline. This is the final verification step.

```
npm run build
```

See Section: Build Verification below.

**Rollback:** `git checkout -- vite.config.ts package.json && npm install`

---

## Build Verification

After Step 7, confirm all of the following:

### 7.1 Build success
- Exit code is `0` (no errors)
- Output contains `✓ built in` for the client build
- Output contains `✓ built in` for the server (SSR) build — TanStack Start still produces a server bundle
- Output contains `[prerender] Prerendered 1 pages` — prerender still runs

### 7.2 Build output structure (identical to today)
```
dist/client/
├── _shell.html          ← must exist (TanStack Start SPA entry)
├── assets/
│   ├── *.js             ← same route chunks
│   └── *.css            ← same styles
dist/server/
└── server.js            ← TanStack Start SSR bundle (unchanged)
```

`_shell.html` must exist — `vercel.json` rewrites all paths to it.

### 7.3 Noise eliminated
- **No** `[@lovable.dev/vite-tanstack-config]` messages in build output
- **No** `lovable-tagger` references in output
- Remaining warnings are pre-existing (chunk size, unused SSR imports from node_modules)

### 7.4 TypeScript check
```
npx tsc --noEmit
```
Must complete with zero errors.

### 7.5 Dev server
```
npm run dev
```
Server starts on port 8080. No startup errors. No Lovable-specific messages in console.

---

## Runtime Verification

Run after build verification passes:

### App loads
- [ ] App loads at `http://localhost:8080` without blank screen
- [ ] Console is clean (no new errors vs. before the migration)
- [ ] RTL layout applied, Heebo font visible

### Routing (no session)
- [ ] `/` redirects to `/login`
- [ ] `/login` renders the login form
- [ ] `/register` renders the registration form
- [ ] `/workspace` redirects to `/login`
- [ ] Invalid path renders Hebrew 404 page
- [ ] Browser back/forward navigation works

### Auth (requires valid Supabase credentials in `.env.local`)
- [ ] Login form submits; Supabase request goes to `https://jjpcbmaiprjnojszqysp.supabase.co/auth/v1/token` (not `/rest/v1/auth/v1/token`)
- [ ] Session persists on reload
- [ ] Logout clears session

### Providers
- [ ] `HebrewErrorBoundary` present (React DevTools)
- [ ] `QueryClientProvider` present
- [ ] `AuthProvider` present
- [ ] `HouseholdProvider` present
- [ ] `AppStateProvider` present

### Vercel deployment (after pushing)
- [ ] Vercel build log shows no Lovable messages
- [ ] Vercel serves `_shell.html` correctly (SPA rewrite working)
- [ ] Deep link (e.g. `/login`) returns the app

---

## Rollback Plan

### Complete rollback (any step)
```bash
git checkout -- vite.config.ts package.json src/routes/index.tsx
npm install
```
This restores the two deleted packages and the original config. The deleted files (OBSOLETE source and docs) can be restored individually if needed:
```bash
git checkout -- src/lib/shopping.ts src/lib/categoryImages.ts \
               src/components/ui/sidebar.tsx src/hooks/use-mobile.tsx \
               bunfig.toml bun.lockb
```

Markdown files:
```bash
git checkout -- PLAN.md phase1-implementation-report.md \
               phase2-implementation-report.md phase3-implementation-report.md \
               phase3-readiness-report.md phase4-implementation-plan.md \
               phase4-implementation-plan-v2.md phase4-readiness-report.md \
               phase4-slice1-implementation-report.md \
               phase4-slice2-implementation-report.md \
               shopping-pal-phase1-design.md shopping-ui-design-review.md \
               shopping-ui-design-v1.md supabase-deployment-report.md \
               supabase-status-report.md phase1-validation-report.md
```

---

## Risk Analysis

### Risk 1 — Plugin behaviour difference (LOW)
**What:** The Lovable wrapper ran `tanstackStart()` with internal default options before applying the user's `spa: { enabled: true }` via `mergeConfig`. Calling `tanstackStart({ spa: { enabled: true } })` directly may produce slightly different internal defaults.

**Mitigation:** The same `spa: { enabled: true }` option is passed. TanStack Start's public API is stable. The build output is verified in Step 7 — if `_shell.html` is present and the route chunks match, the behaviour is identical.

**Fallback:** If the build fails, the `vite.config.ts` rollback restores the original in under 30 seconds.

---

### Risk 2 — `lovable-tagger` removal changes dev experience (NEGLIGIBLE)
**What:** `lovable-tagger` added component tagging attributes to every React component in dev mode, enabling Lovable's visual editor to identify components. This is a development-only plugin and has no effect on the production build.

**Impact:** Zero. The Lovable visual editor is not used in this project.

---

### Risk 3 — `@vitejs/plugin-react` now explicitly listed (NO RISK)
**What:** `@vitejs/plugin-react` was previously added by the Lovable wrapper invisibly. It is now explicitly in the plugin array. This is the same plugin and the same version (`^5.0.4`, already installed).

**Mitigation:** None required. Explicitly listing a plugin that was previously implicit is the correct outcome of removing a wrapper.

---

### Risk 4 — `npm install` peer dependency warning for removed packages (LOW)
**What:** After removing `@lovable.dev/vite-tanstack-config`, npm may warn that `@cloudflare/vite-plugin` or `lovable-tagger` are now orphaned or have missing peer dependencies.

**Mitigation:** Warnings are not errors. The build proceeds. If npm exits with a non-zero code due to peer dep conflict, inspect the error before proceeding to Step 7.

---

## Commit Strategy

Recommended: one commit per logical group of steps.

```
Step 1–2:  chore: delete obsolete source files and Lovable documentation artifacts
Step 3:    chore: remove unreachable Home() function from index route
Step 4–6:  chore: remove Lovable vite wrapper and Cloudflare plugin; use tanstackStart directly
Step 7:    (no commit — verification only)
Final:     chore: verify clean build post-migration
```

---

## Summary

| Change | Files affected | Risk |
|---|---|---|
| Delete OBSOLETE source files | 6 files | Zero |
| Delete OBSOLETE documentation | 16 files | Zero |
| Remove dead Home() function | `src/routes/index.tsx` | Low |
| Remove Lovable/Cloudflare packages | `package.json` | Low |
| Replace vite.config.ts | `vite.config.ts` | Medium |
| Run npm install | `node_modules/`, `package-lock.json` | Medium |
| Build verification | — | — |

**No new files created. No framework removed. No routes changed. No providers changed. No behaviour changed.**

---

*End of Phase 3 v2 Plan — no source code was modified. Awaiting approval.*
