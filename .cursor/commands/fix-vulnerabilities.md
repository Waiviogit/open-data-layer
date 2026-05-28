# Fix OSV Vulnerabilities

Remediate dependency vulnerabilities in this Nx + pnpm monorepo using OSV Scanner results.

## Context

- **Scan script:** `pnpm scan:vulnerabilities` → writes `osv-results.json` (gitignored)
- **Verify script:** `pnpm verify:deps` → scan + build + bundle-deps + test
- **Scanner config:** `osv-scanner.toml` at repo root
- **CI:** `.github/workflows/verify.yml` (PR/push), `.github/workflows/osv-scan-scheduled.yml` (weekly)
- **Package manager:** pnpm at root; Nest apps have per-app `apps/<app>/package.json` for Docker `pnpm deploy --legacy --prod`

## User Instructions

$ARGUMENTS

**Important:** Respect user instructions over default behaviors below (e.g. "scan only", "no suppressions", "skip verify:deps").

## Workflow

### 1. Scan (if needed)

Run when `osv-results.json` is missing, stale, or user asks for a fresh scan:

```bash
pnpm scan:vulnerabilities
```

Exit code 1 with findings is expected. Exit code 0 means clean (including filtered suppressions).

If the user attached or referenced `osv-results.json`, use it; re-scan only when unsure it matches the current lockfile.

### 2. Triage

Parse `osv-results.json` and summarize:

- Unique CVE count and affected packages
- **Direct** deps (root `package.json` or `apps/*/package.json`)
- **Transitive** deps (lockfile only)
- Fix versions from OSV `affected[].ranges[].events[].fixed` where available
- Note whether each affected package is **direct** (manifest) or **transitive only** (lockfile), and whether it already appears in `pnpm.overrides`

### Direct vs override decision

Many packages in this repo appear in both root `dependencies`/`devDependencies` and `pnpm.overrides` (e.g. `@nestjs/*`, `kysely`, `ws`, `vite`). Overrides here are workspace-wide pins — not a substitute for direct deps.

| Scenario | Fix approach |
|----------|--------------|
| In root `dependencies`/`devDependencies` or `apps/*/package.json` | Step 3: `pnpm add` / `pnpm update` |
| Same package also in `pnpm.overrides` | Step 3 **and** sync override to the same patched version (override alone is not enough; pnpm overrides take precedence) |
| Transitive only (not in any manifest) | Step 4: add or extend `pnpm.overrides` |
| Override fails to dedupe (e.g. `vite` via Nx) | Step 4: add direct devDependency **and** keep override in sync |

**Do not fix a direct dep by changing `pnpm.overrides` only** — update the manifest via `pnpm add`, then align override and `apps/*/package.json` if present.

### 3. Fix direct dependencies

Update at root via pnpm — **never hand-write versions** in `package.json`:

```bash
pnpm add <pkg>@<version>
pnpm add -D <pkg>@<version>
pnpm update @nestjs/common @nestjs/core ... --latest
```

Also align matching versions in `apps/*/package.json` when the app lists the same package (Nest, kysely, ws, next). App manifests declare webpack externals for Docker `pnpm deploy --prod`; keep them in sync with root deps.

If the same package is listed in `pnpm.overrides`, update the override to the same patched version after `pnpm add` (e.g. `pnpm add kysely@<patched>` then `pnpm pkg set pnpm.overrides.kysely=<same-range>` or re-run `pnpm add` with override-aware workflow). Never leave a stale override pinning an older vulnerable version.

### 4. Fix transitive dependencies

Use this step only when the vulnerable package is **not** declared in root or app manifests (see **Direct vs override decision** above).

Add or extend `pnpm.overrides` in root `package.json`:

- Force one patched version across the whole workspace
- Use scoped overrides when multiple major lines coexist:
  - `"picomatch@2": "^2.3.2"`, `"picomatch@>=4": "^4.0.4"`
  - `"path-to-regexp@0.1": "^0.1.13"`, `"path-to-regexp@>=8": "^8.4.0"`
- If an override does not dedupe (e.g. vite via Nx), add a direct devDependency: `pnpm add -D vite@<patched>`

Then:

```bash
pnpm install
```

### 5. Re-scan loop

```bash
pnpm scan:vulnerabilities
```

Repeat steps 3–5 until clean or only unfixable CVEs remain.

### 6. Suppressions (last resort)

When **no safe fix** exists, add to `osv-scanner.toml`:

```toml
[[IgnoredVulns]]
id = "GHSA-..."
reason = "Why not applicable or no upstream patch"
ignoreUntil = YYYY-MM-DD
```

**Policy:** every suppression MUST have `reason` and `ignoreUntil`. Never suppress without both. Prefer fixing over suppressing.

Known hard cases in this repo:

- `elliptic` — transitive via `@hiveio/dhive` → `secp256k1`; no patched npm release
- `uuid@8` — dev-only via `webpack-dev-server` → `sockjs`; fix needs uuid v11+ incompatible with sockjs

### 7. Verify

After dependency changes, run the full verification suite (unless user says to skip):

```bash
pnpm verify:deps
```

This runs in order:

1. `pnpm scan:vulnerabilities` — OSV scan must pass (including documented suppressions)
2. `pnpm nx run-many -t build --skip-nx-cache` — all apps compile
3. `node scripts/check-bundle-deps.cjs` — Nest Docker deps match webpack externals
4. `pnpm --filter @opden-data-layer/query-api --legacy --prod deploy <tmpdir>` — deploy smoke (same path Docker builder uses)
5. `pnpm nx run-many -t test --skip-nx-cache` — unit tests

Docker Nest images use `pnpm deploy --legacy --prod` in the builder stage (no second install). Any webpack external must be listed in `apps/<app>/package.json` — enforced by `check-bundle-deps.cjs`.

Implementation: `scripts/verify-deps.cjs`. For a lighter check after small changes:

```bash
pnpm nx run query-api:build --skip-nx-cache
pnpm nx run web:build --skip-nx-cache
node scripts/check-bundle-deps.cjs --app query-api
```

## Rules

- Use `pnpm add` / `pnpm update` for direct deps; do not edit version strings by hand
- If a vulnerable package is in `dependencies`/`devDependencies` (or `apps/*/package.json`), fix via `pnpm add` — not by changing `pnpm.overrides` alone
- When a package exists in both a manifest and `pnpm.overrides`, update both to the same patched version
- `pnpm.overrides` is the correct tool for **transitive-only** fixes across the whole workspace
- Do not commit `osv-results.json`
- Do not commit unless the user explicitly asks
- Keep suppressions minimal and time-bounded

## Output

Report to the user:

- CVE count before / after
- Direct deps updated
- Overrides added or changed
- Suppressions added (with expiry dates)
- Build verification results
- Anything still unfixable and why
