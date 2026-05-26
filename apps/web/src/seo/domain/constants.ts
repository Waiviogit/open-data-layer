/** Default static OG image (Next.js `app/opengraph-image.png`). */
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image.png';

/** i18n message keys for SEO builders. */
export const SEO_I18N_KEYS = {
  siteName: 'site_name',
  siteDescription: 'site_description',
  homeTitle: 'seo_home_title',
  discoverTitle: 'seo_discover_title',
  signInTitle: 'seo_sign_in_title',
  signInDescription: 'seo_sign_in_description',
} as const;

export const SEO_FALLBACKS = {
  siteName: 'Waivio',
  siteDescription:
    'Discover, organize, and earn rewards on the Hive blockchain.',
  homeTitle: 'Home',
  discoverTitle: 'Discover',
  signInTitle: 'Sign in',
  signInDescription: 'Sign in with your Hive account to use Waivio.',
} as const;
