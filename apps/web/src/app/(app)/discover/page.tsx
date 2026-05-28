import type { Metadata } from 'next';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { parseDiscoverPageState } from '@/modules/discover/domain/discover-url';
import { DiscoverPageClient } from '@/modules/discover/presentation/components/discover-page-client';
import { buildDiscoverMetadata } from '@/seo';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  return buildDiscoverMetadata({ locale, messages });
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewerUsername = user?.username ?? null;
  const discoverState = parseDiscoverPageState(await searchParams);

  return <DiscoverPageClient {...discoverState} viewerUsername={viewerUsername} />;
}
