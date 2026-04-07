// const { createGlobPatternsForDependencies } = require('@nx/next/tailwind');

// The above utility import will not work if you are using Next.js' --turbo.
// Instead you will have to manually add the dependent paths to be included.
// For example
// ../libs/buttons/**/*.{ts,tsx,js,jsx,html}',                 <--- Adding a shared lib
// !../libs/buttons/**/*.{stories,spec}.{ts,tsx,js,jsx,html}', <--- Skip adding spec/stories files from shared lib

// If you are **not** using `--turbo` you can uncomment both lines 1 & 19.
// A discussion of the issue can be found: https://github.com/nrwl/nx/issues/26510

/** @type {import('tailwindcss').Config} */
module.exports = {
  safelist: [
    { pattern: /^grid-cols-[1-6]$/ },
    { pattern: /^sm:grid-cols-[1-6]$/ },
    { pattern: /^md:grid-cols-[1-6]$/ },
    { pattern: /^lg:grid-cols-[1-6]$/ },
    { pattern: /^xl:grid-cols-[1-6]$/ },
  ],
  content: [
    './{src,pages,components,app}/**/*.{ts,tsx,js,jsx,html}',
    '!./{src,pages,components,app}/**/*.{stories,spec}.{ts,tsx,js,jsx,html}',
    //     ...createGlobPatternsForDependencies(__dirname)
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        fg: 'var(--color-fg)',
        'fg-secondary': 'var(--color-fg-secondary)',
        'fg-tertiary': 'var(--color-fg-tertiary)',
        muted: 'var(--color-muted)',
        link: 'var(--color-link)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        'surface-raised': 'var(--color-surface-raised)',
        heading: 'var(--color-heading)',
        accent: 'var(--color-accent)',
        'accent-fg': 'var(--color-accent-fg)',
        'cta-secondary-bg': 'var(--color-cta-secondary-bg)',
        'cta-secondary-fg': 'var(--color-cta-secondary-fg)',
        'code-bg': 'var(--color-code-bg)',
        'code-fg': 'var(--color-code-fg)',
        'nav-bg': 'var(--color-nav-bg)',
        'nav-fg': 'var(--color-nav-fg)',
        secondary: 'var(--color-secondary)',
        'secondary-fg': 'var(--color-secondary-fg)',
        tertiary: 'var(--color-tertiary)',
        'tertiary-fg': 'var(--color-tertiary-fg)',
        error: 'var(--color-error)',
        'error-fg': 'var(--color-error-fg)',
        focus: 'var(--color-focus)',
        overlay: 'var(--color-overlay)',
        'ghost-surface': 'var(--color-ghost-surface)',
        'ghost-border': 'var(--color-ghost-border)',
        'fg-disabled': 'var(--color-fg-disabled)',
        'surface-control': 'var(--color-surface-control)',
        'accent-alt': 'var(--color-accent-alt)',
        'accent-hover': 'var(--color-accent-hover)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        editorial: ['var(--font-editorial)'],
        label: ['var(--font-label)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        hero: [
          'var(--font-size-hero)',
          { lineHeight: 'var(--leading-compressed)' },
        ],
        display: [
          'var(--font-size-display)',
          { lineHeight: 'var(--leading-display)' },
        ],
        section: [
          'var(--font-size-section)',
          { lineHeight: 'var(--leading-display)' },
        ],
        'body-lg': [
          'var(--font-size-body-lg)',
          { lineHeight: 'var(--leading-body)' },
        ],
        body: [
          'var(--font-size-body)',
          { lineHeight: 'var(--leading-body)' },
        ],
        'body-sm': [
          'var(--font-size-body-sm)',
          { lineHeight: 'var(--leading-body)' },
        ],
        caption: [
          'var(--font-size-caption)',
          { lineHeight: '1.43' },
        ],
        'body-xs': [
          'var(--font-size-body-xs)',
          { lineHeight: '1.43' },
        ],
        micro: [
          'var(--font-size-micro)',
          { lineHeight: '1.33' },
        ],
        nano: [
          'var(--font-size-nano)',
          { lineHeight: 'var(--leading-editorial)' },
        ],
      },
      fontWeight: {
        'weight-display': 'var(--font-weight-display)',
        'weight-body': 'var(--font-weight-body)',
        'weight-label': 'var(--font-weight-label)',
        'weight-strong': 'var(--font-weight-strong)',
      },
      outlineColor: {
        focus: 'var(--color-focus)',
      },
      letterSpacing: {
        display: 'var(--tracking-display)',
        body: 'var(--tracking-body)',
        caption: 'var(--tracking-caption)',
        loose: 'var(--tracking-loose)',
        looser: 'var(--tracking-looser)',
      },
      lineHeight: {
        display: 'var(--leading-display)',
        body: 'var(--leading-body)',
        compressed: 'var(--leading-compressed)',
        editorial: 'var(--leading-editorial)',
      },
      borderRadius: {
        btn: 'var(--radius-btn)',
        card: 'var(--radius-card)',
        'card-lg': 'var(--radius-card-lg)',
        pill: 'var(--radius-pill)',
        circle: 'var(--radius-circle)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-float': 'var(--shadow-card-float)',
        'card-warm': 'var(--shadow-card-warm)',
        hover: 'var(--shadow-hover)',
        ring: 'var(--shadow-ring)',
        whisper: 'var(--shadow-whisper)',
        inset: 'var(--shadow-inset)',
        'focus-ring': 'var(--shadow-focus-ring)',
      },
      maxWidth: {
        'container-page': 'var(--container-max)',
        'container-content': 'var(--container-content)',
        'container-narrow': 'var(--container-narrow)',
      },
      spacing: {
        'section-y-sm': 'var(--spacing-section-y-sm)',
        'section-y': 'var(--spacing-section-y)',
        'section-y-lg': 'var(--spacing-section-y-lg)',
        'section-y-hero': 'var(--spacing-section-y-hero)',
        'card-padding': 'var(--spacing-card)',
        gutter: 'var(--spacing-gutter)',
        'gutter-sm': 'var(--spacing-gutter-sm)',
        'shell-header': 'var(--shell-header-height)',
        'shell-left': 'var(--shell-left-width)',
        'shell-right': 'var(--shell-right-width)',
        'shell-bottom': 'var(--shell-bottom-height)',
      },
    },
  },
  plugins: [],
};
