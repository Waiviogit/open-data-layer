import type { PostSeoInput } from './metadata.types';

export function buildArticleJsonLd(
  input: PostSeoInput,
  canonical: string,
): Record<string, unknown> {
  const headline =
    input.title?.trim() ||
    input.excerpt.trim().slice(0, 110) ||
    `${input.authorName}/${input.permlink}`;
  const image = input.thumbnailUrl ?? input.videoThumbnailUrl ?? undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description: input.excerpt,
    datePublished: input.createdAt,
    ...(image ? { image } : {}),
    mainEntityOfPage: canonical,
    author: {
      '@type': 'Person',
      name: input.authorDisplayName ?? input.authorName,
      identifier: `@${input.authorName}`,
      ...(input.authorAvatarUrl ? { image: input.authorAvatarUrl } : {}),
    },
  };
}
