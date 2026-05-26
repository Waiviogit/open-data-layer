import type { Metadata } from 'next';

import { objectCanonical } from '../domain/canonical';
import { resolveOgImageUrl } from '../domain/og-image';
import type { ObjectSeoInput } from '../domain/metadata.types';
import { seoPublicOrigin } from '../infrastructure/seo-public-origin';

function metadataWithImage(
  title: string,
  description: string | undefined,
  canonical: string | undefined,
  image: string | null,
  openGraphType: 'website' | 'article' | 'profile',
): Metadata {
  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: openGraphType,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function buildObjectMetadata(input: ObjectSeoInput): Metadata {
  const origin = seoPublicOrigin();
  const canonical =
    input.canonicalUrl ??
    (origin ? objectCanonical(origin, input.objectId) : undefined);
  const image = resolveOgImageUrl(
    [input.coverImageUrl, input.avatarUrl],
    origin,
  );
  return metadataWithImage(
    input.title,
    input.description ?? undefined,
    canonical,
    image,
    'website',
  );
}
