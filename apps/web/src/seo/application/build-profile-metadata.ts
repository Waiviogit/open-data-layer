import type { Metadata } from 'next';

import { profileCanonical } from '../domain/canonical';
import { resolveOgImageUrl } from '../domain/og-image';
import type { ProfileSeoInput } from '../domain/metadata.types';
import { seoPublicOrigin } from '../infrastructure/seo-public-origin';

export function buildProfileMetadata(input: ProfileSeoInput): Metadata {
  const origin = seoPublicOrigin();
  const canonical = origin ? profileCanonical(origin, input.name) : undefined;
  const title = input.displayName.trim() || input.name;
  const description = input.bio.trim() || undefined;
  const image = resolveOgImageUrl(
    [input.coverImageUrl, input.avatarUrl],
    origin,
  );

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'profile',
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
