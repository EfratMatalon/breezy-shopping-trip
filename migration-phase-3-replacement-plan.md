# Migration Phase 3 — Infrastructure Replacement Plan

**Date:** 2026-07-14  
**Status:** Plan complete — awaiting approval  
**Rule:** No source code was modified to produce this document.

---

## 1. Current Architecture

```
npm run build
    │
    └─► vite build
            │
            └─► @lovable.dev/vite-tanstack-config (v1.8.0)
                    │
                    ├─► @tanstack/react-start/plugin/vite   ← SSR framework
                    │       ├─► BUILD 1: dist/client/       (SPA bundle)
                    │       ├─► BUILD 2: dist/server/       (unused SSR bundle)
                    │       └─► PRERENDER: dist/client/_shell.html  (TanStack Start shell)
                    │
                    ├─► @vitejs/plugin-react                (React Fast Refresh)
                    ├─► @tailwindcss/vite                   (CSS processing)
                    ├─► vite-tsconfig-paths                 (@ path aliases)
                    ├─► @tanstack/router-plugin             (route tree codegen)
                    ├─► lovable-tagger                      (Lovable visual editor — active in dev)
                    ├─► @lovable.dev/vite-plugin-hmr-gate   (dev only)
                    ├─► @lovable.dev/vite-plugin-dev-server-bridge  (dev only)
                    └─► nitro / @cloudflare/vite-plugin     (SKIPPED — no Lovable context)

Entry point: TanStack Start owns the HTML shell
    src/routes/__root.tsx → shellComponent: RootShell → <html><head><body>
    HeadContent injects: <meta> tags, font links, CSS link
    Scripts injects: JS bundle tags
    Vercel: outputDirectory=dist/client, rewrites /(.*) → /_shell.html

Build outputs:
    dist/client/          ← Vercel serves this
        _shell.html       ← SPA entry (TanStack Start generated)
        assets/*.js       ← Code-split route chunks
        assets/*.css      ← Styles
    dist/server/          ← NEVER USED (SSR artifact)
        server.js
        assets/
```

### Current dependency graph for build infrastructure

```
package.json
├── dependencies
│   ├── @tanstack/react-start@1.167.39     [LEGACY — owns build pipeline]
│   └── @cloudflare/vite-plugin@1.25.5     [LEGACY — zero output in SPA mode]
└── devDependencies
    └── @lovable.dev/vite-tanstack-config@1.8.0  [LEGACY — black-box wrapper]
```

---

## 2. Target Architecture

```
npm run build
    │
    └─► vite build
            │
            └─► Standard Vite config (owned by this project)
                    │
                    ├─► @tanstack/router-plugin    (route tree codegen)
                    ├─► @vitejs/plugin-react        (React Fast Refresh)
                    ├─► @tailwindcss/vite           (CSS processing)
                    └─► vite-tsconfig-paths         (@ path aliases)

Entry point: Standard Vite SPA
    index.html → src/main.tsx → RouterProvider → routeTree
    src/routes/__root.tsx provides layout only (no HTML shell)
    Vercel: outputDirectory=dist/client, rewrites /(.*) → /index.html

Build outputs:
    dist/client/          ← Vercel serves this (same directory, unchanged)
        index.html        ← SPA entry (standard Vite generated)
        assets/*.js       ← Code-split route chunks
        assets/*.css      ← Styles
    (no dist/server/)     ← Server build eliminated
```

### Target dependency graph for build infrastructure

```
package.json
├── dependencies
│   └── (no Lovable/Start/Cloudflare packages)
└── devDependencies
    └── (no Lovable packages)
    All remaining build packages already present:
    @vitejs/plugin-react, @tailwindcss/vite, vite-tsconfig-paths,
    @tanstack/router-plugin, vite, typescript
```

---

## 3. Complete File Inventory

### Files to CREATE (new — do not exist today)

| File | Purpose |
|---|---|
| `index.html` | Standard Vite SPA entry point. Replaces TanStack Start's `_shell.html`. Contains charset, viewport, base title, description, Heebo font links, `<div id="root">`, and the module script. |
| `src/main.tsx` | React application entry point. Calls `getRouter()`, mounts `RouterProvider` into `#root`. Imports `./styles.css` directly (replaces Start's CSS URL injection). |

---

### Files to MODIFY (exist today, changed content)

| File | Classification | What changes |
|---|---|---|
| `vite.config.ts` | REPLACE | Complete rewrite. Remove Lovable wrapper. Use `@vitejs/plugin-react`, `TanStackRouterVite`, `@tailwindcss/vite`, `vite-tsconfig-paths` directly. Add `build.outDir: "dist/client"` to keep Vercel output directory unchanged. |
| `package.json` | MODIFY | Remove 3 packages from `dependencies`: `@tanstack/react-start`, `@cloudflare/vite-plugin`. Remove 1 from `devDependencies`: `@lovable.dev/vite-tanstack-config`. No additions — all remaining build tools already present. |
| `src/routes/__root.tsx` | MODIFY | Remove: `HeadContent`, `Scripts` imports; `appCss?url` import; `shellComponent: RootShell` option; `head()` callback; `RootShell` function. Keep: `createRootRoute`, `RootComponent`, `NotFoundComponent`, all providers. |
| `vercel.json` | MODIFY | Change rewrite destination from `/_shell.html` to `/index.html`. Keep `outputDirectory: "dist/client"` unchanged. |
| `src/routes/index.tsx` | MODIFY | Delete dead `Home()` function (lines 9–113). Keep the exported `Route` (lines 1–7). Remove unreachable dead imports implied by the dead function. |

---

### Files to DELETE

#### LEGACY infrastructure (removed as part of package.json change)
These packages are removed from `node_modules` by `npm install` after the `package.json` update. No file-system delete required — `npm install` handles it.

| Package | Removed via |
|---|---|
| `@lovable.dev/vite-tanstack-config` | `npm install` after `package.json` change |
| `@tanstack/react-start` | `npm install` after `package.json` change |
| `@cloudflare/vite-plugin` | `npm install` after `package.json` change |

#### OBSOLETE source files (safe independent deletes)

| File | Reason |
|---|---|
| `src/lib/shopping.ts` | Zero imports. Superseded by Supabase queries and `store.tsx`. |
| `src/lib/categoryImages.ts` | Empty module (`export {}`). Never imported. |
| `src/components/ui/sidebar.tsx` | Never imported by any route or non-UI component. |
| `src/hooks/use-mobile.tsx` | Only consumer is `sidebar.tsx` (deleted above). |
| `bunfig.toml` | Bun config. Project uses npm. |
| `bun.lockb` | Bun lockfile. Project uses npm. |

#### OBSOLETE documentation (Lovable build artifacts)

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

#### Files NOT deleted (keep despite being referenced in `.gitignore` as legacy targets)

| File | Reason to keep |
|---|---|
| `.gitignore` entries for `.output`, `.vinxi`, `.nitro`, `.tanstack`, `.wrangler` | Harmless; no entries to remove |
| `dist/` directory | Gitignored; will be regenerated by new build |

---

### Files explicitly KEPT unchanged

| File | Classification |
|---|---|
| `src/router.tsx` | CORE — `createRouter()`, `DefaultErrorComponent`. Unchanged. |
| `src/routeTree.gen.ts` | ACTIVE — auto-regenerated on first build after migration. The `declare module '@tanstack/react-start'` lines disappear automatically. |
| All `src/routes/*.tsx` (except `index.tsx` dead function) | CORE — no Start-specific APIs in route components. |
| `src/lib/supabase/client.ts` | CORE — Phase 1 complete. |
| `src/lib/auth/AuthProvider.tsx` | CORE |
| `src/lib/auth/requireAuth.ts` | CORE |
| `src/lib/auth/authErrors.ts` | CORE |
| `src/lib/auth/useSession.ts` | ACTIVE |
| `src/lib/store.tsx` | CORE |
| `src/lib/queryClient.ts` | ACTIVE |
| `src/lib/household/HouseholdProvider.tsx` | CORE |
| `src/lib/household/useMyHousehold.ts` | ACTIVE |
| `src/lib/household/pendingInvite.ts` | ACTIVE |
| `src/lib/queries/*` | CORE |
| `src/lib/realtime/*` | ACTIVE |
| `src/lib/ai/*` | ACTIVE |
| `src/lib/imageHelpers.ts` | ACTIVE |
| `src/lib/utils.ts` | ACTIVE |
| `src/components/Nav.tsx` | CORE |
| `src/components/HebrewErrorBoundary.tsx` | CORE |
| `src/components/AssistantPanel.tsx` | ACTIVE |
| `src/components/ui/*` (38 files, excluding sidebar.tsx) | ACTIVE |
| `src/styles.css` | CORE — unchanged; import moves to `main.tsx` |
| `supabase/` (entire directory) | CORE |
| `eslint.config.js` | ACTIVE |
| `.prettierrc`, `.prettierignore` | ACTIVE |
| `.gitignore` | ACTIVE |
| `components.json` | ACTIVE |
| `.env.local`, `.env.example` | ACTIVE |
| `.vscode/` | ACTIVE |
| `.claude/launch.json` | ACTIVE |
| `migration-phase-1-baseline.md` | ACTIVE |
| `migration-phase-2-inventory.md` | ACTIVE |
| `migration-phase-3-replacement-plan.md` | ACTIVE (this file) |
| `docs/` | ACTIVE |

---

## 4. Exact Execution Order

Steps must be executed in this exact sequence. Each step is atomic and independently verifiable.

---

### STEP 1 — Delete OBSOLETE source files
**Risk: ZERO** — none are imported; no build impact.

Delete these files:
```
src/lib/shopping.ts
src/lib/categoryImages.ts
src/components/ui/sidebar.tsx
src/hooks/use-mobile.tsx
bunfig.toml
bun.lockb
```

**Verify:** `npm run build` still passes without errors.

---

### STEP 2 — Delete OBSOLETE documentation files
**Risk: ZERO** — markdown files; no build or runtime impact.

Delete all 16 phase report files listed in Section 3.

**Verify:** `npm run build` still passes. No change to build output.

---

### STEP 3 — Remove dead `Home()` function from `src/routes/index.tsx`
**Risk: LOW** — function is never rendered; TypeScript suppresses errors in route files.

Keep only lines 1–7:
```ts
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
```

Delete lines 9–113 (the `Home` function and its implied but undeclared imports).

**Verify:** `npm run build` still passes. Route `/` still redirects to `/login`.

---

### STEP 4 — Create `index.html`
**Risk: LOW** — new file; does not affect the current build pipeline until `vite.config.ts` is changed.

Exact content:
```html
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>רשימת קניות — פשוט לעשות קניות</title>
    <meta name="description" content="תכננו, סמנו ושמרו את רשימות הקניות שלכם." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Source of each element:
- `lang="he" dir="rtl"` — moved from `RootShell` in `__root.tsx`
- `<meta charset>`, `<meta viewport>` — moved from `head()` callback in `__root.tsx`
- `<title>` — moved from `head()` callback in `__root.tsx`
- `<meta name="description">` — moved from `head()` callback in `__root.tsx`
- Font `<link>` tags — moved from `head()` callback in `__root.tsx`
- `<div id="root">` — standard Vite SPA mount point
- `<script type="module">` — standard Vite entry

**Verify:** File exists at project root. `npm run build` is unaffected (current build does not use `index.html`).

---

### STEP 5 — Create `src/main.tsx`
**Risk: LOW** — new file; does not affect the current build pipeline.

Exact content:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

Notes:
- `getRouter()` is imported from `src/router.tsx` (already CORE, unchanged).
- `import "./styles.css"` replaces TanStack Start's `appCss?url` CSS injection.
- `StrictMode` is standard React 18+ practice.
- `RouterProvider` is from `@tanstack/react-router` — already installed.

**Verify:** File exists at `src/main.tsx`. `npm run build` is unaffected (current build does not use `main.tsx`).

---

### STEP 6 — Rewrite `src/routes/__root.tsx`
**Risk: MEDIUM** — modifying a CORE file. The current build still uses the old version until `vite.config.ts` changes. This step makes the file Start-free so it works with both the old and new build pipeline during the transition window.

New content — remove only the Start-specific parts, preserve everything else:

```tsx
import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Nav } from "../components/Nav";
import { HebrewErrorBoundary } from "../components/HebrewErrorBoundary";
import { AppStateProvider } from "../lib/store";
import { AuthProvider } from "../lib/auth/AuthProvider";
import { HouseholdProvider } from "../lib/household/HouseholdProvider";
import { getQueryClient } from "../lib/queryClient";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">הדף לא נמצא</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          הדף שחיפשתם לא קיים או שהועבר למקום אחר.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <HebrewErrorBoundary>
      <QueryClientProvider client={getQueryClient()}>
        <AuthProvider>
          <HouseholdProvider>
            <AppStateProvider>
              <div className="min-h-screen bg-background text-foreground">
                <Nav />
                <main className="mx-auto max-w-6xl px-3 py-8">
                  <Outlet />
                </main>
              </div>
            </AppStateProvider>
          </HouseholdProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HebrewErrorBoundary>
  );
}
```

What was removed:
- `HeadContent`, `Scripts` imports from `@tanstack/react-router`
- `appCss` import (`"../styles.css?url"`)
- `shellComponent: RootShell` from `createRootRoute({...})`
- `head()` callback from `createRootRoute({...})` — content moved to `index.html` in Step 4
- `RootShell` function entirely

What is preserved:
- `NotFoundComponent` (identical)
- `RootComponent` (identical)
- All provider imports and nesting (identical)

**Verify:** `npm run build` still passes. The old pipeline still runs `RootShell` via the Start plugin. This step is safe because at this point Start is still installed — it will regenerate its shell from the route file. Without `shellComponent`, Start falls back to a default shell. Confirmed safe: TanStack Start's `shellComponent` is optional.

---

### STEP 7 — Update `package.json`
**Risk: LOW until `npm install` is run** — editing `package.json` alone has no effect.

Remove exactly these three entries:

From `dependencies`:
```
"@cloudflare/vite-plugin": "^1.25.5"
"@tanstack/react-start": "^1.167.14"
```

From `devDependencies`:
```
"@lovable.dev/vite-tanstack-config": "^1.4.0"
```

No additions. All build tools needed by the new `vite.config.ts` are already present:
- `@vitejs/plugin-react@^5.0.4` — already in devDependencies
- `@tailwindcss/vite@^4.2.1` — already in dependencies
- `vite-tsconfig-paths@^6.0.2` — already in dependencies
- `@tanstack/router-plugin@^1.167.10` — already in dependencies
- `vite@^7.3.1` — already in devDependencies

**Verify:** `package.json` is valid JSON. Do not run `npm install` yet — that is Step 9.

---

### STEP 8 — Replace `vite.config.ts`
**Risk: HIGH** — this is the point of no return. The new config must be complete and correct before `npm install` removes the old packages.

New exact content:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  build: {
    outDir: "dist/client",
  },
});
```

Notes:
- `TanStackRouterVite()` uses defaults: `routesDirectory: "./src/routes"`, `generatedRouteTree: "./src/routeTree.gen.ts"`. These match the current project structure.
- `build.outDir: "dist/client"` preserves Vercel's `outputDirectory` setting — no Vercel dashboard change needed.
- Plugin order matters: `TanStackRouterVite` must be **first** (generates code before React processes it).
- `tailwindcss()` and `tsConfigPaths()` are identical to what Lovable's wrapper was loading.

**Verify:** File is syntactically valid TypeScript.

---

### STEP 9 — Run `npm install`
**Risk: HIGH** — removes three packages from `node_modules`. Point of no return for packages.

```
npm install
```

Expected: `@lovable.dev/vite-tanstack-config`, `@tanstack/react-start`, `@cloudflare/vite-plugin` are removed from `node_modules`. `package-lock.json` is updated.

If `npm install` fails (e.g. peer dependency conflict), stop here and do not proceed to Step 10.

---

### STEP 10 — Update `vercel.json`
**Risk: LOW** — affects production deployment only when pushed. Does not affect local build.

Current content:
```json
{
  "outputDirectory": "dist/client",
  "rewrites": [{ "source": "/(.*)", "destination": "/_shell.html" }]
}
```

New content:
```json
{
  "outputDirectory": "dist/client",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Only change: `/_shell.html` → `/index.html`.

`outputDirectory` stays `dist/client` — unchanged, matching Step 8's `build.outDir`.

---

### STEP 11 — Run `npm run build` and verify
**Risk: HIGH** — first build with the new pipeline.

```
npm run build
```

Expected outcomes:
1. No errors.
2. `dist/client/index.html` is generated (not `dist/client/_shell.html`).
3. `dist/client/assets/*.js` chunks are generated.
4. `dist/client/assets/*.css` is generated.
5. No `dist/server/` directory is created.
6. `src/routeTree.gen.ts` is regenerated without the `@tanstack/react-start` module declaration.
7. Build time is significantly shorter (single pass, no server build, no prerender).

---

## 5. Exact Content of New and Modified Files

### NEW: `index.html`
*(Full content in Step 4 above)*

### NEW: `src/main.tsx`
*(Full content in Step 5 above)*

### REPLACE: `vite.config.ts`
*(Full content in Step 8 above)*

### MODIFY: `package.json`
Three lines deleted. No lines added. See Step 7.

### MODIFY: `src/routes/__root.tsx`
*(Full content in Step 6 above)*

### MODIFY: `vercel.json`
*(Full content in Step 10 above)*

### MODIFY: `src/routes/index.tsx`
Reduce to 7 lines:
```ts
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
```

---

## 6. Build Verification Plan

After Step 11, verify:

### 6.1 Build artifacts
```
dist/client/
├── index.html          ← must exist (replaces _shell.html)
├── assets/
│   ├── *.js            ← route chunks present
│   └── *.css           ← styles present
(no dist/server/)       ← must NOT exist
```

### 6.2 Build output assertions
- `dist/client/_shell.html` — **must NOT exist**
- `dist/client/index.html` — **must exist**
- `dist/server/` — **must NOT exist**
- Build completes in a single pass (no "building ssr environment" message)
- No errors in stdout
- No `[@lovable.dev/vite-tanstack-config]` messages
- No `"createRequestHandler" ... imported ... but never used` warnings

### 6.3 TypeScript assertion
```
npx tsc --noEmit
```
Must complete without errors.

### 6.4 Dev server assertion
```
npm run dev
```
Server starts on port 8080. No startup errors. Console does not print `[@lovable.dev/vite-tanstack-config]`.

---

## 7. Runtime Verification Plan

After build verification, open the app in a browser (local dev server or Vercel preview):

### 7.1 Page load
- [ ] App loads without blank screen
- [ ] No console errors on initial load
- [ ] RTL layout is applied (`dir="rtl"`)
- [ ] Heebo font is loaded (check Network tab for fonts.googleapis.com)
- [ ] Background/foreground colors from design tokens are applied

### 7.2 Routing
- [ ] Navigating to `/` redirects to `/login`
- [ ] Browser back/forward navigation works
- [ ] Direct navigation to `/login` renders Login screen
- [ ] Direct navigation to `/register` renders Register screen
- [ ] Direct navigation to `/workspace` redirects to `/login` (if no session)
- [ ] 404 page renders for an invalid path (e.g. `/does-not-exist`)

### 7.3 Authentication (requires valid Supabase credentials)
- [ ] Login form submits without errors
- [ ] Successful login redirects to `/onboarding` or `/workspace`
- [ ] Session persists on page reload
- [ ] Logout clears session and redirects to `/login`
- [ ] Returning to `/login` while logged in redirects to `/`

### 7.4 Error boundary
- [ ] `HebrewErrorBoundary` component is present in DOM (verify via React DevTools)

### 7.5 Vercel deployment
- [ ] Push to main branch triggers Vercel build
- [ ] Vercel build log shows single build pass (no "building ssr environment")
- [ ] Deployed URL loads app correctly
- [ ] Deep link (e.g. `/login`) returns the app (SPA rewrite working with `index.html`)

---

## 8. Rollback Plan

The rollback strategy depends on how far the migration has progressed.

### Rollback after Steps 1–3 only (OBSOLETE deletes)
```bash
git checkout -- src/lib/shopping.ts src/lib/categoryImages.ts \
               src/components/ui/sidebar.tsx src/hooks/use-mobile.tsx \
               bunfig.toml src/routes/index.tsx
git checkout -- PLAN.md phase1-implementation-report.md \
               phase1-validation-report.md phase2-implementation-report.md \
               phase3-implementation-report.md phase3-readiness-report.md \
               phase4-implementation-plan.md phase4-implementation-plan-v2.md \
               phase4-readiness-report.md phase4-slice1-implementation-report.md \
               phase4-slice2-implementation-report.md shopping-pal-phase1-design.md \
               shopping-ui-design-review.md shopping-ui-design-v1.md \
               supabase-deployment-report.md supabase-status-report.md
```
Zero build impact. Fully reversible.

### Rollback after Steps 4–8 (before `npm install`)
```bash
git checkout -- vite.config.ts src/routes/__root.tsx vercel.json \
               src/routes/index.tsx package.json
rm -f index.html src/main.tsx
```
`npm install` has not run — node_modules is unchanged. Old build works immediately.

### Rollback after Step 9 (`npm install` has run)
```bash
git checkout -- vite.config.ts src/routes/__root.tsx vercel.json \
               src/routes/index.tsx package.json
rm -f index.html src/main.tsx
npm install
```
`npm install` reinstalls the three removed packages. Old build works again.

### Full git rollback (any point)
```bash
git stash       # if uncommitted
# or
git reset --hard HEAD   # discard all uncommitted changes
npm install             # restore node_modules to match package.json
```

**Recommended practice:** Commit after each step so each step is independently reversible with `git revert`.

---

## 9. Risk Analysis

### Risk 1 — `TanStackRouterVite()` plugin order (HIGH, mitigated)
**What:** `@tanstack/router-plugin` generates `routeTree.gen.ts` during the build. If it runs after `@vitejs/plugin-react`, React may try to transform files before the generated tree exists.

**Mitigation:** In the new `vite.config.ts`, `TanStackRouterVite()` is listed **first** in the plugins array. This is the documented requirement.

**Fallback:** If the build fails with a missing import from `routeTree.gen.ts`, run `npm run build` a second time — the first pass generates the file and the second pass builds successfully.

---

### Risk 2 — `vercel.json` rewrite to non-existent file (HIGH, mitigated)
**What:** The current rewrite sends all paths to `/_shell.html`. After migration `_shell.html` will not exist and `index.html` will. If `vercel.json` is not updated before deploying, the Vercel deployment will serve 404 for all routes.

**Mitigation:** `vercel.json` is updated in Step 10, before any git push. The `outputDirectory` stays `dist/client` — no Vercel dashboard changes required.

**Verification:** After deploying, navigate directly to `/login` on the Vercel URL. A blank page or 404 means the rewrite is still pointing to `_shell.html`.

---

### Risk 3 — Per-route `head()` callbacks become no-ops (MEDIUM, accepted)
**What:** `src/routes/login.tsx` and `src/routes/register.tsx` define `head()` callbacks that set per-route `<title>` tags. In standalone TanStack Router (without Start), these callbacks are accepted by the API but produce no DOM output. The browser tab title will always show the base title from `index.html`.

**Impact:** Page titles do not update on navigation. Not a functional bug — just missing browser tab title updates.

**Mitigation:** Accepted for this migration. The `head()` calls cause no errors and do not break routing. Dynamic titles can be added later with a `useEffect(() => { document.title = "..." }, [])` pattern in each route component.

---

### Risk 4 — `routeTree.gen.ts` contains Start module declarations (LOW, auto-resolved)
**What:** The current `routeTree.gen.ts` contains:
```ts
import type { createStart } from '@tanstack/react-start'
declare module '@tanstack/react-start' { ... }
```
After `@tanstack/react-start` is removed from `node_modules`, this causes a TypeScript module not found error.

**Mitigation:** The file has `// @ts-nocheck` at line 3 — TypeScript ignores it. The `@tanstack/router-plugin` automatically regenerates the file on the first `npm run build` or `npm run dev`, removing the Start declarations. No manual action needed.

**Verification:** After the first successful build, inspect `routeTree.gen.ts` — the `@tanstack/react-start` lines will be gone.

---

### Risk 5 — CSS loading race condition (LOW, mitigated)
**What:** Currently `styles.css` is injected by TanStack Start's `HeadContent` as a `<link>` tag. After migration it is imported in `src/main.tsx`. During development, Vite injects CSS via a `<style>` tag in the module graph. In production, Vite extracts it to `dist/client/assets/*.css` and references it from `index.html` via a generated `<link>` tag.

**Mitigation:** This is standard Vite CSS behavior. No FOUC (flash of unstyled content) risk — Vite's production build injects the CSS link into `index.html` automatically. No action needed.

---

### Risk 6 — `@vitejs/plugin-react` already in devDependencies but previously unused (LOW)
**What:** `@vitejs/plugin-react@^5.0.4` is listed in `devDependencies` and installed in `node_modules` (it was a peer dependency of `@lovable.dev/vite-tanstack-config`). The new `vite.config.ts` imports it directly.

**Mitigation:** Already installed and at the correct version. No change required.

---

### Risk 7 — `src/styles.css` Tailwind 4 `@source` directive (LOW)
**What:** `src/styles.css` contains `@source "../src"`. This directive tells Tailwind 4 where to scan for class names. It is relative to the CSS file's location.

**Mitigation:** The file is unchanged. Tailwind's Vite plugin processes it identically via `@tailwindcss/vite` regardless of whether Lovable's wrapper or the direct plugin is used.

---

### Risk 8 — `scripts` in `package.json` unchanged — `vite dev` vs `vite` (NO RISK)
**What:** The `dev` script uses `vite dev` (not `vite`). Some scaffolds use `vite` (which defaults to dev mode). Both are equivalent.

**Mitigation:** No change needed. `vite dev` continues to work with the new config.

---

## 10. Known Limitations After Migration

These are deliberate trade-offs, not bugs. They can be addressed in future phases.

| Limitation | Impact | Future fix |
|---|---|---|
| Per-route `<title>` tags no longer update | Browser tab always shows base title | Add `useEffect(() => { document.title = "..." }, [])` in routes, or install `@tanstack/react-head` when available for v1 |
| No SSR / prerendering | SEO limited to `index.html` static content | Acceptable for an authenticated SPA; address if needed |
| `queryClient.ts` still has dead SSR branch | Dead code; no functional impact | Remove `typeof window === "undefined"` branch in a cleanup phase |
| `bun.lockb` gitignored but tracked | Creates occasional git noise | Deleted in Step 1 |

---

## 11. Commit Strategy

Recommended git commits (one per logical step):

```
Step 1-2:  chore: delete obsolete source files and Lovable documentation artifacts
Step 3:    chore: remove dead Home() function from index route
Step 4-5:  feat: add index.html and main.tsx for standard Vite SPA entry
Step 6:    refactor: remove TanStack Start APIs from root route
Step 7-9:  chore: remove Lovable/Start/Cloudflare packages and run npm install
Step 10:   fix: update vercel.json to serve index.html instead of _shell.html
Step 11:   verify: confirm clean build with standard Vite pipeline
```

Each commit is independently revertable.

---

*End of Phase 3 Replacement Plan — no source code was modified. Awaiting approval.*
