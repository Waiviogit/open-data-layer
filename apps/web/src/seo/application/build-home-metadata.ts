import type { Metadata } from 'next';

import { homeCanonical } from '../domain/canonical';
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

export function buildHomeMetadata(ctx: SeoBuildContext): Metadata {
  const origin = seoPublicOrigin();
  const siteName = messageOrFallback(
    ctx.messages,
    SEO_I18N_KEYS.siteName,
    SEO_FALLBACKS.siteName,
  );
  const title = messageOrFallback(
    ctx.messages,
    SEO_I18N_KEYS.homeTitle,
    SEO_FALLBACKS.homeTitle,
  );
  const description = messageOrFallback(
    ctx.messages,
    SEO_I18N_KEYS.siteDescription,
    SEO_FALLBACKS.siteDescription,
  );
  const canonical = origin ? homeCanonical(origin) : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      siteName,
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
