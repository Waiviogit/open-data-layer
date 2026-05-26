import type { MetadataRoute } from 'next';

import { seoPublicOrigin } from '@/seo';

export default function robots(): MetadataRoute.Robots {
  const origin = seoPublicOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/sign-in',
          '/api/',
          '/editor',
          '/drafts',
          '/settings',
          '/notifications',
        ],
      },
    ],
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
    host: origin ?? undefined,
  };
}
