import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { DiscoverPageClient } from '@/modules/discover/presentation/components/discover-page-client';
import { getCookieDiscoverObjectType } from '@/modules/discover/domain/discover-type-cookie.server';
import { buildDiscoverHref, parseDiscoverPageState } from '@/modules/discover/domain/discover-url';
import { resolveInitialDiscoverType } from '@/modules/discover/domain/resolve-initial-discover-type';
import { buildDiscoverMetadata } from '@/seo';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export const dynamic = 'force-dynamic';

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
  const [user, rememberedObjectType, rawSearch] = await Promise.all([
    auth.getUser(),
    getCookieDiscoverObjectType(),
    searchParams,
  ]);
  const state = parseDiscoverPageState(rawSearch);
  const resolution = resolveInitialDiscoverType({
    objectType: state.objectType,
    usersMode: state.usersMode,
    remembered: rememberedObjectType,
  });
  if (resolution.action === 'navigate') {
    redirect(
      buildDiscoverHref({
        type: resolution.type,
        q: state.q,
        tags: state.tags,
        sort: state.sort,
        box: state.box,
        map: state.map,
      }),
    );
  }
  const viewerUsername = user?.username ?? null;
  return (
    <Suspense fallback={null}>
      <DiscoverPageClient
        viewerUsername={viewerUsername}
        rememberedObjectType={rememberedObjectType}
      />
    </Suspense>
  );
}
