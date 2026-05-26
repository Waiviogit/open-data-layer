import type { Metadata } from 'next';

import { signInCanonical } from '../domain/canonical';
import { SEO_FALLBACKS, SEO_I18N_KEYS } from '../domain/constants';
import type { SeoBuildContext } from '../domain/metadata.types';
import { seoPublicOrigin } from '../infrastructure/seo-public-origin';

function messageOrFallback(
  messages: Readonly<Record<string, string>>,
  key: string,
  fallback: string,
): string {
  const value = messages[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export function buildSignInMetadata(ctx: SeoBuildContext): Metadata {
  const origin = seoPublicOrigin();
  const title = messageOrFallback(
    ctx.messages,
    SEO_I18N_KEYS.signInTitle,
    SEO_FALLBACKS.signInTitle,
  );
  const description = messageOrFallback(
    ctx.messages,
    SEO_I18N_KEYS.signInDescription,
    SEO_FALLBACKS.signInDescription,
  );
  const canonical = origin ? signInCanonical(origin) : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
