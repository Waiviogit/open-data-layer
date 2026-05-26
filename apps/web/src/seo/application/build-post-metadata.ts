import type { Metadata } from 'next';

import { postCanonical } from '../domain/canonical';
import { resolveOgImageUrl } from '../domain/og-image';
import type { PostSeoInput } from '../domain/metadata.types';
import { seoPublicOrigin } from '../infrastructure/seo-public-origin';

export function buildPostMetadata(input: PostSeoInput): Metadata {
  const origin = seoPublicOrigin();
  const canonical = origin
    ? postCanonical(origin, input.permalinkPath)
    : undefined;
  const title =
    input.title?.trim() ||
    input.excerpt.trim().slice(0, 110) ||
    `${input.authorName}/${input.permlink}`;
  const image = resolveOgImageUrl(
    [input.thumbnailUrl, input.videoThumbnailUrl, input.authorAvatarUrl],
    origin,
  );

  return {
    title,
    description: input.excerpt,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description: input.excerpt,
      url: canonical,
      type: 'article',
      publishedTime: input.createdAt,
      authors: [input.authorDisplayName ?? input.authorName],
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: input.excerpt,
      ...(image ? { images: [image] } : {}),
    },
  };
}
