import type { Metadata } from 'next';
import { Suspense } from 'react';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { DiscoverPageClient } from '@/modules/discover/presentation/components/discover-page-client';
import { buildDiscoverMetadata } from '@/seo';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  return buildDiscoverMetadata({ locale, messages });
}

export default async function DiscoverPage() {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewerUsername = user?.username ?? null;

  return (
    <Suspense fallback={null}>
      <DiscoverPageClient viewerUsername={viewerUsername} />
    </Suspense>
  );
}
