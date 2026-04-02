# Theme — `data-theme` + design tokens

**Back:** [web overview](overview.md) · **Related:** [i18n](i18n.md)

Theming uses **`data-theme` on `<html>`** as the single source of truth for appearance. `apps/web/src/styles/theme.css` defines **design tokens** (CSS custom properties) per theme. Tailwind maps semantic utilities to those variables. Do **not** rely on `prefers-color-scheme` via `dark:` as the primary mechanism; use explicit themes (`light`, `dark`, `sepia`) or **`system`** (OS-driven light/dark).

## Normative goals

- Resolve the active **preference** on the **server** (root layout) from cookie and optional user settings; persist **preference**, not the resolved `ThemeId`.
- **SSR:** For non-`system` preferences, set `data-theme` on `<html>` to the resolved `ThemeId`. For `system`, omit `data-theme` on the server and inject a **synchronous** inline script in `<head>` that sets `data-theme` from `matchMedia('(prefers-color-scheme: dark)')` before paint (no flicker).
- **Client:** `ThemeProvider` keeps **preference** in React state; applies `document.documentElement.dataset.theme` to the **resolved** theme; subscribes to `matchMedia` only while `preference === 'system'`.
- **Tailwind:** Use semantic utilities (`bg-bg`, `text-fg`, `bg-secondary`, `text-error`, `outline-focus`, `text-hero`, `text-display`, `font-weight-display`, `rounded-card`, `rounded-xl`, `shadow-card`, `shadow-card-warm`, `font-body`, `font-mono`, etc.). Avoid hardcoded palette hex values and fixed Tailwind default scale for radii/shadows when a tokenized utility exists.

## Module layout

| Path                                                | Responsibility                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web/src/theme/types.ts`                       | `ThemeId`, `ThemePreference`, `ThemeResolution`                         |
| `apps/web/src/theme/theme-registry.ts`              | Human `label` and `description` for fixed themes                          |
| `apps/web/src/theme/resolve-theme.ts`               | Pure `resolveTheme()` — no React/DOM                                    |
| `apps/web/src/theme/theme-cookie.constants.ts`      | Cookie name, Zod schema, max-age                                        |
| `apps/web/src/theme/theme-cookie.ts`                | Server-only read/write for `app_theme`                                  |
| `apps/web/src/theme/get-user-theme-preference.ts`   | Stub until auth; returns `null`                                         |
| `apps/web/src/theme/get-server-theme-resolution.ts` | Cookie + user + optional `Sec-CH-Prefers-Color-Scheme` → `resolveTheme` |
| `apps/web/src/theme/theme-user-sync.ts`             | Optional `WEB_THEME_SYNC_URL` PATCH                                     |
| `apps/web/src/theme/theme-provider.tsx`             | Client provider + `matchMedia` for `system`                             |
| `apps/web/src/theme/theme-script.tsx`               | Inline head script when preference is `system`                          |
| `apps/web/src/theme/use-theme.ts`                   | `useTheme()` hook                                                       |
| `apps/web/src/styles/theme.css`                     | `[data-theme='…']` design tokens (all dimensions)                       |
| `apps/web/tailwind.config.js`                       | Maps tokens to Tailwind `extend` (colors, fonts, radius, shadow, etc.)    |
| `apps/web/src/components/theme-switcher.tsx`        | UI (shows **preference**, not resolved OS theme)                        |
| `apps/web/src/app/api/theme/route.ts`               | `PATCH` — validate body, set cookie, sync                               |

## Preference resolution

Priority:

1. **User** — `getUserThemePreference()` when it returns a value (auth + backend wired).
2. **Cookie** — `app_theme` (`light` `dark` `sepia` `system`), validated with Zod.
3. **Default** — typically `system`.

When preference is `system`, **resolved** appearance is `dark` or `light` from the OS (`matchMedia` on the client; optional `Sec-CH-Prefers-Color-Scheme` on the server for consistency). **Sepia** is never chosen by the OS.

`resolveTheme()` returns `{ preference, resolvedTheme, source }` where `source` records whether the **preference** came from user, cookie, default, or pure `system` default chain.

## Persistence

| Mechanism          | Content                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| Cookie `app_theme` | Always updated on change (`path: /`, `sameSite: lax`, long `maxAge`).        |
| Backend            | If `WEB_THEME_SYNC_URL` is set, `PATCH` after cookie write (no-op if unset). |

Never persist the resolved `light`/`dark` from `system` — only the preference string.

## Design tokens (CSS variables)

Each `[data-theme='…']` block in `apps/web/src/styles/theme.css` sets the same variable names; only values change. Adding a new visual preset is a **new block** (e.g. `[data-theme='brand-x']`) that overrides every dimension you need — no component changes if utilities already use tokens.

### Colors

| CSS variable | Tailwind (examples) | Role |
| ------------ | ------------------- | ---- |
| `--color-bg` | `bg-bg` | Page / main surface background |
| `--color-fg` | `text-fg` | Default body text |
| `--color-fg-secondary` | `text-fg-secondary` | Secondary text (opacity-shifted from `fg`) |
| `--color-fg-tertiary` | `text-fg-tertiary` | Tertiary / de-emphasized text |
| `--color-fg-disabled` | `text-fg-disabled` | Disabled / inactive text |
| `--color-muted` | `text-muted` | De-emphasized labels, captions |
| `--color-link` | `text-link` | Text link color (theme-aware; differs on dark vs light) |
| `--color-border` | `border-border` | Default borders |
| `--color-border-strong` | `border-border-strong` | Stronger dividers / emphasis |
| `--color-surface` | `bg-surface` | Raised panels, sidebars |
| `--color-surface-alt` | `bg-surface-alt` | Alternate tint (hover, stripes) |
| `--color-surface-raised` | `bg-surface-raised` | Elevated cards within already-raised panels |
| `--color-heading` | `text-heading` | Headings (can match `fg`) |
| `--color-accent` | `bg-accent`, `text-accent` | Primary accent / CTA fill |
| `--color-accent-fg` | `text-accent-fg` | Text on accent background |
| `--color-cta-secondary-bg` | `bg-cta-secondary-bg` | Secondary button surface |
| `--color-cta-secondary-fg` | `text-cta-secondary-fg` | Secondary button text |
| `--color-code-bg` | `bg-code-bg` | `<pre>` / code block background |
| `--color-code-fg` | `text-code-fg` | `<pre>` / code block foreground |
| `--color-nav-bg` | `bg-nav-bg` | Navigation surface (translucent per theme) |
| `--color-nav-fg` | `text-nav-fg` | Navigation link text |
| `--color-secondary` | `bg-secondary`, `text-secondary` | Supporting actions, chips, toggles |
| `--color-secondary-fg` | `text-secondary-fg` | Text on secondary fill |
| `--color-tertiary` | `bg-tertiary`, `text-tertiary` | Badges, decorative accents |
| `--color-tertiary-fg` | `text-tertiary-fg` | Text on tertiary fill |
| `--color-error` | `bg-error`, `text-error`, `border-error` | Destructive actions, validation errors |
| `--color-error-fg` | `text-error-fg` | Text on error fill |
| `--color-focus` | `outline-focus`, `ring-focus` | Keyboard focus ring (see note below) |
| `--color-overlay` | `bg-overlay` | Dark scrim over background imagery for text legibility (use with opacity or layered `::before`) |
| `--color-ghost-surface` | `bg-ghost-surface` | Ultra-low-opacity surface for ghost buttons over photography |
| `--color-ghost-border` | `border-ghost-border` | Low-opacity border for ghost elements over photography |
| `--color-surface-control` | `bg-surface-control` | Icon buttons, circular carousel controls |
| `--color-accent-alt` | `text-accent-alt`, `bg-accent-alt` | Softer brand accent for links and secondary emphasis |
| `--color-accent-hover` | `bg-accent-hover` | Hover tint of primary accent (interactive states) |

Focus: `--color-focus` is for `outline-color` / focus rings (`outline outline-2 outline-offset-2 outline-focus`), not a general surface fill. Prefer `outline-focus` over `bg-focus` for focus-visible styling.

**Photography / hero:** `--color-overlay` is intended for darkening full-bleed images so foreground text stays readable; pair with `text-fg` or `text-heading` as needed. Ghost tokens pair with `text-accent-fg` or spectral `text-fg` on dark imagery.

### Typography

| CSS variable | Tailwind | Role |
| ------------ | -------- | ---- |
| `--font-display` | `font-display` | Display / marketing headlines |
| `--font-body` | `font-body` | UI and body copy |
| `--font-editorial` | `font-editorial` | Serif / editorial accents |
| `--font-label` | `font-label` | UI labels (defaults to body stack in built-in themes) |
| `--font-mono` | `font-mono` | Code, terminal, monospace content |
| `--font-size-hero` | `text-hero` | Maximum-impact hero headline (above `display`) |
| `--font-size-display` | `text-display` | Large display headline |
| `--font-size-section` | `text-section` | Section heading size |
| `--font-size-body-lg` | `text-body-lg` | Lead / intro paragraphs, large UI text |
| `--font-size-body` | `text-body` | Standard reading size |
| `--font-size-body-sm` | `text-body-sm` | Compact body text |
| `--font-size-caption` | `text-caption` | Caption / metadata size |
| `--font-size-body-xs` | `text-body-xs` | Small labels, descriptions |
| `--font-size-micro` | `text-micro` | Fine print, small labels |
| `--font-size-nano` | `text-nano` | Legal, overline, smallest readable tier |
| `--font-weight-display` | `font-weight-display` | Display headline weight |
| `--font-weight-body` | `font-weight-body` | Body text weight |
| `--font-weight-label` | `font-weight-label` | UI label weight |
| `--font-weight-strong` | `font-weight-strong` | Emphasized / semibold weight |
| `--tracking-display` | `tracking-display` | Letter-spacing for hero headlines |
| `--tracking-body` | `tracking-body` | Letter-spacing for body text |
| `--tracking-caption` | `tracking-caption` | Letter-spacing for captions / small text |
| `--tracking-loose` | `tracking-loose` | Positive wide tracking (UI labels, buttons) |
| `--tracking-looser` | `tracking-looser` | Very wide tracking (uppercase stencil / aerospace) |
| `--leading-display` | `leading-display` | Line-height for display headlines |
| `--leading-body` | `leading-body` | Line-height for body text |
| `--leading-compressed` | `leading-compressed` | Ultra-tight display line-height (sub-1.0 feel) |
| `--leading-editorial` | `leading-editorial` | Literary / relaxed body line-height (~1.6) |

`html` in `global.css` uses `font-family: var(--font-body)`.

### Border radius

| CSS variable | Tailwind | Role |
| ------------ | -------- | ---- |
| `--radius-btn` | `rounded-btn` | Buttons, inputs, small controls |
| `--radius-card` | `rounded-card` | Cards, panels, nav chrome |
| `--radius-card-lg` | `rounded-card-lg` | Larger featured surfaces |
| `--radius-pill` | `rounded-pill` | Pills, fully rounded controls |
| `--radius-circle` | `rounded-circle` | Circular avatars, media control buttons |
| `--radius-xl` | `rounded-xl` | Large containers, featured cards, large CTAs (~40px) |

Prefer these over raw `rounded-md` / `rounded-lg` so a theme can change curvature globally.

### Elevation

| CSS variable | Tailwind | Role |
| ------------ | -------- | ---- |
| `--shadow-card` | `shadow-card` | Default card shadow (tight, subtle) |
| `--shadow-card-float` | `shadow-card-float` | Elevated / floating product card (soft, wide offset) |
| `--shadow-card-warm` | `shadow-card-warm` | Three-layer warm lift (border ring + soft ambient + lift) |
| `--shadow-hover` | `shadow-hover` | Interactive hover elevation (buttons, controls) |
| `--shadow-ring` | `shadow-ring` | Border-via-shadow ring (1px halo; interactive hover / card chrome) |
| `--shadow-whisper` | `shadow-whisper` | Ultra-soft floating shadow for editorial / elevated content |
| `--shadow-inset` | `shadow-inset` | Inset ring for pressed / active button states |
| `--shadow-focus-ring` | `shadow-focus-ring` | Offset ring (e.g. white halo) layered with focus outline |
| `--backdrop-nav` | not a utility — use `backdrop-filter: var(--backdrop-nav)` | Backdrop filter for glass-style navigation |

`--backdrop-nav` is not a Tailwind utility. Use it in a CSS rule or `style` prop:
```css
.nav { backdrop-filter: var(--backdrop-nav); }
```

**Ring vs drop shadow:** `--shadow-ring` is a **border-like** 1px halo using `box-shadow` (no layout shift). Use `shadow-card` / `shadow-card-warm` for physical lift; use `shadow-ring` for ring-shadow systems (e.g. editorial buttons, interactive cards). `shadow-focus-ring` stacks with `outline-focus` when a separate offset ring is needed.

Prefer `shadow-card` over `shadow-sm` and `shadow-card-float` over `shadow-lg` so depth tracks the active theme.

### Layout

| CSS variable | Tailwind (examples) | Role |
| ------------ | ------------------- | ---- |
| `--spacing-section-y-sm` | `py-section-y-sm`, `mt-section-y-sm` | Compact vertical rhythm (nav, dense blocks) |
| `--spacing-section-y` | `py-section-y`, `gap-section-y` | Standard section vertical rhythm |
| `--spacing-section-y-lg` | `py-section-y-lg` | Large sections (feature blocks) |
| `--spacing-section-y-hero` | `py-section-y-hero` | Hero / maximum vertical spacing |
| `--spacing-card` | `p-card-padding`, `gap-card-padding` | Card internal padding and matching grid gaps |
| `--spacing-gutter` | `px-gutter` | Default horizontal page gutter |
| `--spacing-gutter-sm` | `sm:px-gutter-sm` | Wider gutter from `sm` breakpoint up |
| `--container-max` | `max-w-container-page` | Max page / dashboard width |
| `--container-content` | `max-w-container-content` | Prose / reading column width |
| `--container-narrow` | `max-w-container-narrow` | Forms, focused single-column layouts |

Prefer these over raw `px-4` / `py-16` / `max-w-lg` when building page shells so layout rhythm tracks the active theme preset.

## Design preset

A **design preset** is one `[data-theme='<id>'] { … }` block in `theme.css` that assigns values to **all** token variables used by the app. To ship a new look (e.g. warm marketing site):

1. Add `<id>` to `ThemeId` in `types.ts`, cookie schema, and `theme-registry`.
2. Add the CSS block with colors, fonts, radii, shadows, and layout vars.
3. Wire Tailwind only if new token *names* are introduced (then extend `tailwind.config.js`).

Do not scatter one-off hex values in components; extend tokens instead.

## `global.css` constraints

- Import `../styles/theme.css` **before** `@tailwind` directives (required for Turbopack).
- **Colors:** use `var(--color-*)` (or derived tokens like `--color-code-*`), not raw `rgba`/`hsla` literals, except where documented as temporary (e.g. Nx welcome scaffold marked with `TODO`).
- **Typography:** root font stack uses `var(--font-body)`.

## Verification

| Command            | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `pnpm nx test web` | Unit tests (including `resolve-theme`)                          |
| `pnpm nx dev web`  | Manual: switch themes, `system` + OS toggle, reload with cookie |
