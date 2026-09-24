## Web: client imports and `@/modules/user-social` barrel

**Pattern:** Importing the public `user-social` barrel from a **client** component can pull **server-only** modules (`query-api.client` → `env`) and break the Next.js build.

**Rule:** From client code, import **`SortDropdown`** (and similar pure UI) via **deep path**  
`@/modules/user-social/presentation/components/sort-dropdown` instead of the module barrel.

## Web: `@opden-data-layer/core` barrel in App Router

**Pattern (historical):** Importing `@opden-data-layer/core` in a Server Component could pull Nest HTTP code and fail Turbopack.

**Current rule:** Core barrel is **web-safe** after the split (Nest `ReqLocale` moved to query-api; DB types moved to `@opden-data-layer/odl-db-types`). For **large registries** in client components, still prefer subpaths (`/update-registry`, `/object-type-registry`, `/update-types`) for tree-shaking. See [`docs/standards/core-imports.md`](../docs/standards/core-imports.md) and `pnpm check:core-imports`.

## Web: Leaflet must not load on the server at module evaluation

**Pattern:** `MapProvider` defaulted to `leafletMapProvider` built from `leaflet/index.ts` that **statically imported** `leaflet-map.tsx` → the `leaflet` package touches **`window` at import time** → frequent `ReferenceError: window is not defined` in Turbopack/SSR logs when `@/modules/map` is part of the graph (e.g. object updates geo cards).

**Rule:** Build `leafletMapProvider` with **lazy** map/marker/popup components that `require()` Leaflet modules only on **first client render**, not when the provider module loads.

## Web: `@/modules/object-updates` barrel in client components

**Pattern:** The module `index.ts` re-exports `getObjectUpdatesFeedPageQuery` → **`query-api.client`** (`server-only`). Importing `@/modules/object-updates` from a **`'use client'`** file breaks the Next.js build.

**Rule:** From client code, import **`ObjectUpdatesFeed`** from  
`@/modules/object-updates/presentation/components/object-updates-feed` and **`ObjectEmbeddedUpdatesFeedModel`** from  
`@/modules/object-updates/embedded-updates-feed.model`. Keep using the barrel from **Server Components** only (`page.tsx`, server actions).

## query-api: recency cursor + numeric fields from pg

**Pattern:** `created_at_unix` (or offsets) may round-trip through JSON as **strings**. Strict `z.number()` in `decodeUpdatesCursor` fails → cursor is dropped → every “load more” repeats the **first page** → broken global order and “infinite” pagination.

**Rule:** Use **`z.coerce.number().int()`** in cursor payloads; **`Number()` / `Math.trunc`** when encoding and before keyset `WHERE`. If encoding fails, return **`hasMore: false`** so the client stops. Optionally **dedupe by `update_id`** when appending on the client.

## query-api: float weight keyset + integer COALESCE sentinel

**Pattern:** `COALESCE(${cursor.weight}, -1)` with a JS float makes Postgres infer the bound param as **integer** → `invalid input syntax for type integer: "9.71…"`. Discover page 2 fails and returns empty/`hasMore: false`.

**Rule:** For `double precision` / float columns, use **`-1::float8`** and **`${value}::float8`** in keyset filters (same for `wobjects_weight`). Coerce cursor weight with `Number()` on decode. ASC secondary keys use `>` (not `<`).

## TypeScript 6: paths without baseUrl

**Pattern:** Removing `baseUrl` without rewriting `paths` to `./…` relative entries → `TS5090` and Nx graph plugin parse failures.

**Rule:** Every `paths` value must start with `./` or `../` relative to the tsconfig that owns it. Prefer Node/`Write` for JSON (no UTF-8 BOM); PowerShell `Set-Content`/`ConvertTo-Json` can inject BOM and break Nx.

## TypeScript 6 + ts-jest

**Pattern:** ts-jest ≤29.4.9 forces `moduleResolution: node10` on the CJS path → `TS5107` under TypeScript 6 even when specs say `bundler`.

**Rule:** Use **ts-jest ≥29.4.11**, keep `moduleResolution: "bundler"` in `tsconfig.spec.json`, and do **not** rely on `ignoreDeprecations`.

## webpack-cli 7

**Pattern:** Nest `project.json` still passing `--node-env=production` fails after Nx migrate bumps webpack-cli to 7.

**Rule:** Use `--config-node-env=production` / `development` instead.

## Nest `strict: true`

**Pattern:** Under full `strict`, Nest `useFactory (...args: unknown[])` fails `strictFunctionTypes` against Nest’s factory typing; Jest `mockResolvedValue(null)` fails when the mocked method is typed `T | undefined`.

**Rule:** Use `useFactory (...args: any[])` at Nest factory boundaries; in specs use `undefined` (or widen the mock) to match the declared return, and `as unknown as T` for partial fixtures. Keep strict on Nest apps + `clients` only — do not flip `tsconfig.base.json` until other consumers are ready. Gate with `pnpm typecheck:nest` (webpack build alone is not enough).

## Nx Next: plain `next.config.js`

**Pattern:** `composePlugins()` / `withNx()` from `@nx/next` are deprecated (removed in Nx v24).

**Rule:** Export a plain Next config (`module.exports = nextConfig`); drop `@nx/next` import and `nx: {}`. Workspace libs transpile without `withNx`.

## Tailwind safelist + variants

**Pattern:** Safelist regex like `/^sm:grid-cols-[1-6]$/` warns and matches nothing — patterns only match **base** utilities.

**Rule:** Use `{ pattern: /^grid-cols-[1-6]$/, variants: ['sm', 'md', 'lg', 'xl'] }` for responsive dynamic classes (e.g. `buildCardGridClassName`).

## Nest webpack: Critical dependency / broken vendor source maps

**Pattern:** Nest/Express/Kysely/`load-esm` dynamic `require` → webpack `Critical dependency` warnings; MCP SDK / iterare → `source-map-loader` ENOENT in development. Not runtime bugs for this repo.

**Rule:** Silence via shared `nestIgnoreWarnings` in `apps/nest-webpack.shared.js` (scoped to `node_modules` + source-map parse failures). Wire `ignoreWarnings: nestIgnoreWarnings` in each Nest `webpack.config.js`. Do not externalize packages just to quiet warnings.

## Base64 of JSON in user-facing strings

**Pattern:** A link fragment built as base64 of JSON always starts with `eyJ` (that is `{"`), which is indistinguishable from a JWT. Secret redactors in chat clients cut such strings in half, and the failure looks like an application bug: the user reports "invalid link" or "expired" while the page and the server are both correct. Assuming a length limit and shortening the link would not have fixed it.

**Rule:** Never put base64-of-JSON into anything a human relays through a messenger. Use a binary or otherwise non-JWT-shaped encoding, and pin the invariant in a test (`expect(link).not.toContain('eyJ')`). When a string arrives mangled, first check its **shape** against redaction heuristics, and only then its length — measure both before designing a fix.

## Tool responses that agents must relay

**Pattern:** `has_login_start` returned a ~2 KB terminal QR plus two long links. The consuming agent could not tell which field to send, started post-processing it with `jq`/`python`/`xxd`, and blew the 60-second HAS window.

**Rule:** A tool whose output a human must act on returns exactly what the human needs and nothing else. Heavy or fallback artefacts go behind a separate tool. Polling endpoints return a projection, not the whole stored state. State the required action in the tool description in imperative form.

## Keychain request methods must keep their `this`

**Pattern:** `requestEncodeMessage` / `requestVerifyKey` are declared **optional** on `HiveKeychainWindow`, and TypeScript drops property narrowing inside a nested closure (the `new Promise(...)` executor), so `kc.requestEncodeMessage(...)` reports "possibly undefined". Hoisting the method to a local (`const fn = kc?.requestEncodeMessage`) silences the compiler but **detaches the method from its receiver**; the extension internally calls `this.dispatchCustomEvent(...)`, so the browser fails at runtime with `this.dispatchCustomEvent is not a function`. A typecheck-only fix produced a runtime bug that no build step could catch.

**Rule:** Narrow with `if (!kc?.method) throw`, then capture **`kc.method.bind(kc)`** — never a bare property reference. Non-optional members (`requestSignBuffer`, `requestBroadcast`) can stay as direct `kc.method(...)` calls. Cover it with a jsdom spec whose Keychain stub routes through `this` (see `keychain-memo-crypto.adapter.spec.ts`) so a detached reference fails the suite.

## Web: scroll reset that runs after paint

**Pattern:** `ObjectPageScrollReset` scrolled to the top from `requestAnimationFrame` and `setTimeout`, and treated a microtask-cleared `popstate` flag as "this navigation was back". The object page painted at Discover's clamped offset and then jumped. Back to Discover lost the list offset because nothing had saved it, and the flag was already false by the time the async object layout mounted. A check that only looked at the final `scrollY` reported success while the sample series was `1467 → 1395 → 0` and `backY` was `0`.

**Rule:** Detail pages open at the top via synchronous `useLayoutEffect` (`ScrollToTopOnEnter` / `scrollToTopNow`). List scroll is stored on the current history entry at click time and restored only on `popstate`, after the list can rebuild its height (Discover feed cache). For a visual timing bug, assert the whole sample series (no bad frame after the URL changes) and the inverse path (back), not the final value alone.

## `libs/*/package.json`: no `type` field

**Pattern:** `libs/hive-memo-crypto/package.json` carried `"type": "commonjs"` from the `@nx/js:library` generator while the source is ESM. Nest consumers never noticed (webpack and ts-jest transpile to CJS), but the moment a client component pulled the barrel in, Turbopack walked up to the nearest `package.json`, saw an explicit CJS declaration against `import`/`export` source, and failed the whole `next build`. Flipping to `"type": "module"` fixes Turbopack but silently switches `@nx/js:tsc` output from CJS to ESM ("Package type is set to module but cjs format is included") — a fix for the symptom that breaks the build format.

**Rule:** Libs are **not** pnpm workspace packages (`pnpm-workspace.yaml` lists only `apps/*`, and `node_modules/@opden-data-layer/` does not exist), so `name`/`main`/`types`/`dependencies` in a lib `package.json` are dead metadata — resolution goes through tsconfig `paths` straight to `src/index.ts`. The only field with real effect is `type`, and it can only cause harm. **Never set `type` in `libs/*/package.json`**; delete it if a generator adds one. Most libs have no `package.json` at all — that is the preferred shape.
