import type { ProfileSeoInput } from './metadata.types';

export function buildPersonJsonLd(
  input: ProfileSeoInput,
  canonical: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.displayName || input.name,
    identifier: `@${input.name}`,
    ...(input.bio.trim() ? { description: input.bio.trim() } : {}),
    ...(input.avatarUrl ? { image: input.avatarUrl } : {}),
    url: canonical,
  };
}
