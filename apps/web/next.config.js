//@ts-check

const path = require('path');

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Minimal self-contained output for Docker (see apps/web/Dockerfile).
  // On Windows, local `next build` may fail copying standalone symlinks (EPERM); use Docker/WSL or Developer Mode.
  output: 'standalone',
  images: {
    // Known CDNs + broad HTTPS pattern for UGC (thumbnails, covers, custom avatars).
    // Long-term: consider an image proxy and tighten patterns. See docs/apps/web/spec/images.md.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.hive.blog' },
      { protocol: 'https', hostname: 'cdn.steemitimages.com' },
      { protocol: 'https', hostname: '**' },
      // UGC may use legacy http:// URLs (e.g. imgur); https-only patterns reject those.
      { protocol: 'http', hostname: '**' },
    ],
    minimumCacheTTL: 86400,
  },
  // Trace from monorepo root so file tracing includes shared workspace paths correctly.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Dynamic locale JSON imports are not always captured in server traces; include explicitly.
  outputFileTracingIncludes: {
    '/*': ['src/i18n/locales/**/*.json'],
  },
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
