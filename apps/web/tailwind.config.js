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
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        heading: 'var(--color-heading)',
        accent: 'var(--color-accent)',
        'accent-fg': 'var(--color-accent-fg)',
        'cta-secondary-bg': 'var(--color-cta-secondary-bg)',
        'cta-secondary-fg': 'var(--color-cta-secondary-fg)',
        'code-bg': 'var(--color-code-bg)',
        'code-fg': 'var(--color-code-fg)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        editorial: ['var(--font-editorial)'],
      },
      borderRadius: {
        btn: 'var(--radius-btn)',
        card: 'var(--radius-card)',
        'card-lg': 'var(--radius-card-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      maxWidth: {
        'container-page': 'var(--container-max)',
      },
      spacing: {
        'section-y': 'var(--spacing-section-y)',
      },
    },
  },
  plugins: [],
};
