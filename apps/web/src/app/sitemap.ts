import type { MetadataRoute } from 'next';

import {
  fetchDiscoverObjectsForSitemap,
  fetchDiscoverUsersForSitemap,
  seoPublicOrigin,
  type SitemapObjectEntry,
  type SitemapUserEntry,
} from '@/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = seoPublicOrigin();
  if (!origin) {
    return [];
  }

  const [objects, users]: [SitemapObjectEntry[], SitemapUserEntry[]] =
    await Promise.all([
      fetchDiscoverObjectsForSitemap({ limit: 5000 }),
      fetchDiscoverUsersForSitemap({ limit: 5000 }),
    ]);

  return [
    {
      url: `${origin}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${origin}/discover`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...objects.map((object) => ({
      url: `${origin}/object/${encodeURIComponent(object.object_id)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...users.map((user) => ({
      url: `${origin}/@${encodeURIComponent(user.name)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
