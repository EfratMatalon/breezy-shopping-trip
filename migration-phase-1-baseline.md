# Migration Phase 1 — Baseline Verification

**Date:** 2026-07-14  
**Author:** Claude Code (pre-migration audit)  
**Status:** Approved for Phase 2

---

## Runtime

| Component | Version |
|---|---|
| Node.js | 22.22.3 |
| npm | 10.9.8 |
| TypeScript | 5.9.3 |
| React | 19.2.5 |
| React DOM | 19.2.5 |
| Vite | 7.3.2 |
| TanStack Router | 1.168.21 |
| TanStack Router Plugin | 1.167.22 |
| TanStack React Query | 5.99.0 |
| TanStack React Start | 1.167.39 |
| @supabase/supabase-js | 2.108.2 |
| @lovable.dev/vite-tanstack-config | 1.8.0 |
| Tailwind CSS | 4.2.2 |

---

## Architecture

### Routing Architecture

File-based routing via **TanStack Router** with code generation (`@tanstack/router-plugin`). Routes live in `src/routes/`. The route tree is auto-generated into `src/routeTree.gen.ts` — this file must never be edited manually.

The app is wrapped by **TanStack Start** (`@tanstack/react-start`) in **SPA mode** (`spa: { enabled: true }`). Start adds an SSR layer, a server build (`dist/server/`), and a prerender pass at build time. In practice only the SPA client output (`dist/client/`) is used by Vercel.

The entry point is **not** a standard `index.html` + `main.tsx` — TanStack Start owns the HTML shell. The shell is defined by `shellComponent: RootShell` in `src/routes/__root.tsx`, which renders the `<html>/<head>/<body>` wrapper. `HeadContent` and `Scripts` are TanStack Start APIs injected into the shell.

**Routes:**

| Route | File | Guard |
|---|---|---|
| `/` | `src/routes/index.tsx` | Redirects to `/login` |
| `/login` | `src/routes/login.tsx` | `requireGuest` |
| `/register` | `src/routes/register.tsx` | `requireGuest` |
| `/onboarding` | `src/routes/onboarding.tsx` | `requireNoHousehold` |
| `/workspace` | `src/routes/workspace.tsx` | `requireAuth` + `requireHousehold` |
| `/history` | `src/routes/history.tsx` | `requireAuth` + `requireHousehold` |
| `/join` | `src/routes/join.tsx` | `requireAuth` |
| `/join/$code` | `src/routes/join.$code.tsx` | `requireAuth` |
| `/settings/household` | `src/routes/settings.household.tsx` | `requireAuth` + `requireHousehold` |

### Authentication Architecture

Single Supabase client singleton: `src/lib/supabase/client.ts`.

Auth state managed by `AuthProvider` (`src/lib/auth/AuthProvider.tsx`), consumed via `useAuth()`. The provider:
- Calls `supabase.auth.getSession()` on mount to restore an existing session.
- Subscribes to `supabase.auth.onAuthStateChange` to react to login/logout events.
- Exposes `signInWithPassword`, `signUp`, `signOut`.

Session readiness is gated by the `sessionReady` promise exported from `client.ts` — route guards `await sessionReady` before checking the session, preventing race conditions on cold load.

Auth guards in `src/lib/auth/requireAuth.ts` run as TanStack Router `beforeLoad` callbacks:
- `requireAuth` — redirects to `/login` if no session.
- `requireGuest` — redirects to `/` if already logged in.
- `requireHousehold` — redirects to `/onboarding` if user has no household.
- `requireNoHousehold` — redirects to `/` if user already has a household.

PKCE flow is enabled (`flowType: "pkce"`). Sessions are persisted in localStorage.

After Phase 1, the Supabase URL is normalized to `origin` only before being passed to `createClient`, defending against env var misconfiguration.

### State Management

Two independent state layers:

**1. Server state — TanStack Query**
All Supabase data (households, lists, items, products, categories, notes) is managed by `@tanstack/react-query`. Query keys are centralized in `src/lib/queries/queryKeys.ts`. Mutations invalidate the relevant query keys to trigger refetch.

**2. Local UI state — `AppStateProvider`**
`src/lib/store.tsx` manages a localStorage-persisted catalog of products and the current shopping session (selected items, shopping lists, cycle ID). This is a custom React context with `useState` — no external state library.

### Providers

Provider tree defined in `src/routes/__root.tsx` (innermost to outermost):

```
HebrewErrorBoundary
  QueryClientProvider        (TanStack Query)
    AuthProvider             (Supabase auth state)
      HouseholdProvider      (current household, via React Query)
        AppStateProvider     (localStorage shopping state)
          Nav + Outlet
```

### Supabase Integration

| Layer | File | Responsibility |
|---|---|---|
| Client singleton | `src/lib/supabase/client.ts` | `createClient`, `isSupabaseConfigured`, `sessionReady` |
| Auth provider | `src/lib/auth/AuthProvider.tsx` | Session state, sign-in/up/out |
| Auth guards | `src/lib/auth/requireAuth.ts` | Route-level session + household checks |
| Queries | `src/lib/queries/*.ts` | All database reads via Supabase PostgREST |
| Realtime | `src/lib/realtime/*.ts` | Live updates to shopping items and notes |
| AI client | `src/lib/ai/assistantClient.ts` | Calls `ai-chat` Edge Function |
| Edge Function | `supabase/functions/ai-chat/` | Gemini-backed assistant (Deno runtime) |
| Migrations | `supabase/migrations/` | 9 migrations defining schema, RLS, RPCs, seed |

### Folder Structure

```
breezy-shopping-trip/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (40+ components)
│   │   ├── AssistantPanel.tsx   # AI assistant drawer
│   │   ├── HebrewErrorBoundary.tsx
│   │   └── Nav.tsx
│   ├── hooks/
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   ├── ai/                  # AI feature (config, client, types, hook)
│   │   ├── auth/                # Auth provider, guards, error translations
│   │   ├── hooks/               # Cart, notes, complete-trip mutations
│   │   ├── household/           # Household provider, invite helpers
│   │   ├── queries/             # All Supabase data-fetching functions
│   │   ├── realtime/            # Supabase realtime subscriptions
│   │   ├── supabase/            # Client singleton + generated DB types
│   │   ├── queryClient.ts
│   │   ├── shopping.ts
│   │   ├── store.tsx            # Local AppStateProvider
│   │   └── utils.ts
│   ├── routes/                  # TanStack Router file-based routes
│   ├── routeTree.gen.ts         # Auto-generated — do not edit
│   ├── router.tsx               # createRouter() + error component
│   └── styles.css               # Tailwind 4 + design tokens
├── supabase/
│   ├── functions/ai-chat/       # Edge Function (Deno)
│   ├── migrations/              # 9 SQL migration files
│   └── tests/
├── docs/
├── .env.local                   # Local env vars (gitignored)
├── .env.example
├── vite.config.ts               # Uses @lovable.dev/vite-tanstack-config
├── components.json              # shadcn/ui config
├── bunfig.toml                  # Bun config (unused — project uses npm)
├── eslint.config.js
├── package.json
└── tsconfig.json                # (implicit, via vite-tsconfig-paths)
```

### Build Pipeline

`npm run build` → `vite build` → `@lovable.dev/vite-tanstack-config` orchestrates:

1. **Client build** — Vite bundles `src/` into `dist/client/` (JS chunks + CSS).
2. **Server build** — TanStack Start builds a server bundle `dist/server/server.js` (used for SSR/prerendering).
3. **Prerender** — Crawls the SPA and pre-renders `/` into `dist/client/_shell.html`.

The Cloudflare plugin (`@cloudflare/vite-plugin`) is referenced in dependencies but produces no output in SPA mode.

---

## Current Features

| Feature | Status | Notes |
|---|---|---|
| User registration | Not Verified | Code present and correct; cannot test without valid anon key |
| User login | Broken | Supabase auth URL misconfiguration in production; fixed locally by Phase 1 URL normalization |
| User logout | Not Verified | Code correct |
| Session restore on reload | Not Verified | PKCE + localStorage; code correct |
| Protected route guards | Not Verified | Code correct; depends on auth working |
| Household creation (onboarding) | Not Verified | Code present |
| Household invite (join via code) | Not Verified | Code present |
| Household settings | Not Verified | Code present |
| Active shopping list view | Not Verified | Code present; requires auth + household |
| Add item to list | Not Verified | Code present |
| Update item quantity | Not Verified | Code present |
| Mark item purchased/pending/unavailable | Not Verified | Code present |
| Complete shopping trip (RPC) | Not Verified | Uses `complete_shopping_trip_v3` RPC |
| Shopping history | Not Verified | Code present |
| Product search/catalog | Not Verified | Code present; seeded via migration 00006 |
| Custom products | Not Verified | Code present |
| Notes per list | Not Verified | Code present |
| Realtime sync (items) | Not Verified | `useShoppingItemsChannel` — requires Supabase Realtime publication (migration 00007) |
| Realtime sync (notes) | Not Verified | `useShoppingNotesChannel` |
| AI assistant | Not Verified | Disabled by `VITE_AI_ENABLED=false` in `.env.local` |
| 404 page | Working | Renders correct Hebrew 404 component |
| Hebrew RTL layout | Working | `<html dir="rtl">`, Heebo font, RTL CSS |
| Dark mode | Working | CSS variables + `@custom-variant dark` defined in `styles.css` |

---

## Known Technical Issues

### 1. Supabase anon key format (CRITICAL)
**File:** `.env.local` line 2  
`VITE_SUPABASE_ANON_KEY=sb_publishable_nVimC8Ffkw_g3ohsILE1eg_l5U9nWRw`  
This is not a valid Supabase JWT anon key. Valid keys start with `eyJ`. All API calls that require authentication will fail with 401. **Must be replaced before any feature can be verified.**  
**Fix:** Supabase Dashboard → Project Settings → API → copy the `anon public` key.

### 2. Supabase URL in Vercel env (CRITICAL — production only)
The browser was sending auth requests to `/rest/v1/auth/v1/token`, which means the Vercel environment variable `VITE_SUPABASE_URL` contains `/rest/v1` as a path suffix. Phase 1 added URL origin normalization in `client.ts` to defend against this, but the Vercel env var must also be corrected.  
**Fix:** Vercel Dashboard → Project Settings → Environment Variables → set `VITE_SUPABASE_URL=https://jjpcbmaiprjnojszqysp.supabase.co` (no trailing path).

### 3. `bunfig.toml` and `bun.lockb` present
The project uses `npm` (`package-lock.json` exists) but also has Bun config files. These are inert but signal Lovable's original toolchain. Will be removed in Phase 2.

### 4. Phase report markdown files in root
`phase1-implementation-report.md`, `phase2-implementation-report.md`, etc. — Lovable build artifacts. Inert. Will be removed in Phase 2.

### 5. `index.tsx` route dead code
`src/routes/index.tsx` exports a `Home` function component (with `useQuery`, `useMyHousehold`, etc.) that is never rendered — the route's `beforeLoad` always redirects to `/login`. The component references undefined imports. This is dead code; no impact on build or runtime.

### 6. Large main bundle (pre-existing warning)
`dist/client/assets/index-*.js` is 587 kB minified / 174 kB gzip. This is the shared vendor chunk (React, TanStack Router, Supabase JS, shadcn). Not a blocker but should be addressed with code-splitting after migration.

### 7. SSR build output never used
TanStack Start produces `dist/server/server.js` on every build, but Vercel serves the SPA from `dist/client/`. The server build adds ~2 seconds to every build and is dead weight in SPA mode.

---

## External Dependencies

### Runtime (shipped to browser)

| Package | Version | Purpose |
|---|---|---|
| `react` | 19.2.5 | UI rendering |
| `react-dom` | 19.2.5 | DOM mounting |
| `@tanstack/react-router` | 1.168.21 | File-based client-side routing, type-safe navigation |
| `@tanstack/react-query` | 5.99.0 | Server state, caching, mutation management |
| `@tanstack/react-start` | 1.167.39 | SSR/SPA framework wrapping TanStack Router (Lovable-required; will be removed in Phase 2) |
| `@supabase/supabase-js` | 2.108.2 | Supabase client: auth, PostgREST, realtime, edge functions |
| `tailwindcss` | 4.2.2 | Utility CSS |
| `tw-animate-css` | — | Tailwind animation utilities |
| `@radix-ui/*` | various | Accessible UI primitives (basis for shadcn/ui) |
| `lucide-react` | 0.575.0 | Icon set |
| `@tanstack/react-query` | 5.99.0 | Data fetching and caching |
| `class-variance-authority` | 0.7.1 | shadcn variant builder |
| `clsx` + `tailwind-merge` | — | Class name utilities |
| `sonner` | 2.0.7 | Toast notifications |
| `date-fns` | 4.1.0 | Date formatting (history screen) |
| `react-hook-form` | 7.71.2 | Form state management |
| `zod` | 3.24.2 | Schema validation |
| `recharts` | 2.15.4 | Charts (imported by shadcn chart component, not actively used) |
| `vaul` | 1.1.2 | Drawer primitive (used by shadcn drawer) |
| `cmdk` | 1.1.1 | Command palette primitive (shadcn command component) |
| `embla-carousel-react` | 8.6.0 | Carousel (shadcn carousel, not actively used) |
| `react-day-picker` | 9.14.0 | Date picker (shadcn calendar, not actively used) |
| `react-resizable-panels` | 4.6.5 | Resizable layout (shadcn, not actively used) |
| `input-otp` | 1.4.2 | OTP input (shadcn, not actively used) |
| `@cloudflare/vite-plugin` | 1.25.5 | Cloudflare adapter (Lovable-required; inert in SPA mode; will be removed in Phase 2) |

### Build / Dev only

| Package | Version | Purpose |
|---|---|---|
| `@lovable.dev/vite-tanstack-config` | 1.8.0 | Lovable's opaque Vite wrapper; owns the entire build pipeline. Will be replaced in Phase 2. |
| `vite` | 7.3.2 | Bundler |
| `@vitejs/plugin-react` | 5.0.4 | React Fast Refresh for Vite |
| `@tanstack/router-plugin` | 1.167.22 | Vite plugin for TanStack Router code generation |
| `vite-tsconfig-paths` | 6.0.2 | `@/` path alias resolution |
| `@tailwindcss/vite` | 4.2.1 | Tailwind 4 Vite integration |
| `typescript` | 5.9.3 | Type checking |
| `typescript-eslint` | 8.56.1 | TS-aware linting |
| `eslint` | 9.32.0 | Linting |
| `prettier` | 3.7.3 | Formatting |
| `supabase` (CLI) | 1.219.2 | Local Supabase stack, migrations, edge function deployment |

---

## Migration Risks

### Risk 1 — `shellComponent` removal (HIGH)
TanStack Start's `shellComponent: RootShell` in `__root.tsx` is the mechanism that renders `<html>/<head>/<body>` around the app. When TanStack Start is removed, this API disappears. A standard `index.html` must be created and `RootShell` must be deleted. If done incorrectly the app produces a blank page with no HTML skeleton.

### Risk 2 — `HeadContent` and `Scripts` removal (HIGH)
`HeadContent` injects `<meta>` tags and stylesheet links defined by the `head()` callbacks on each route. `Scripts` injects the JS bundle. Both are TanStack Start APIs with no equivalent in standalone TanStack Router. After removal, these meta tags and the Heebo font link must be moved into a static `index.html`.

### Risk 3 — `routeTree.gen.ts` regeneration (MEDIUM)
The file currently contains TanStack Start module declarations (`declare module '@tanstack/react-start'`). After removing Start, `@tanstack/router-plugin` will regenerate this file on the next dev/build run, removing those declarations. If the plugin version is not compatible with the installed Router version, the tree will fail to generate.

### Risk 4 — Entry point change (MEDIUM)
Standard Vite expects `index.html` → `src/main.tsx`. TanStack Start owns this entirely — there is no `main.tsx` today. The new entry must correctly call `createRouter()` (from `src/router.tsx`) and mount `RouterProvider` into `document.getElementById('root')`.

### Risk 5 — `head()` callbacks on routes (LOW)
Several routes define `head()` returning `meta` arrays. This is a TanStack Start API. In standalone TanStack Router these callbacks are silently ignored — they produce no output. The `<title>` tags and OG meta on individual routes will stop working after migration. These must be reimplemented with a different mechanism (e.g. direct DOM manipulation or a `<Helmet>`-style library) if needed.

### Risk 6 — `@tanstack/react-query` `QueryClient` SSR pattern (LOW)
`src/lib/queryClient.ts` creates a fresh `QueryClient` per request on the server and a singleton in the browser. The server-side branch (`typeof window === "undefined"`) is dead code after removing SSR. It does no harm but can be simplified.

### Risk 7 — shadcn/ui components not actively used (LOW)
The `src/components/ui/` directory has 40+ shadcn components. Many (carousel, calendar, chart, resizable) are not imported anywhere in the application routes. They were generated by Lovable. They do not affect the build but increase maintenance surface.

---

## Build Status

### `npm install`
✅ Clean install. No peer dependency errors. `package-lock.json` is present and up to date.

### `npm run build`
✅ **PASSED**

```
Client build:   ✓ 2033 modules transformed, built in 18.38s
Server build:   ✓ 92 modules transformed, built in 2.36s
Prerender:      ✓ 1 page prerendered (/)
```

### Build warnings

**Warning 1 — Chunk size (pre-existing)**
```
(!) Some chunks are larger than 500 kB after minification.
    dist/client/assets/index-*.js  587.73 kB │ gzip: 173.89 kB
```
Not a blocker. Vendor bundle is large due to React 19 + TanStack + Supabase JS all landing in the shared chunk.

**Warning 2 — Unused SSR imports (pre-existing, from node_modules)**
```
"createRequestHandler", "defineHandlerCallback" ... imported from ... but never used
"RawStream" imported from ... but never used
"hydrate" and "json" imported from ... but never used
```
These originate inside `@tanstack/start-server-core` and `@tanstack/start-client-core`. Not actionable — these are upstream library warnings.

**Warning 3 — Lovable context (informational)**
```
[@lovable.dev/vite-tanstack-config] No Lovable context detected — skipping nitro deploy plugin.
```
Printed three times (once per build environment). Expected when running outside the Lovable platform. No impact.

### Build errors
**None.**

---

*End of Phase 1 Baseline — awaiting approval for Phase 2.*
