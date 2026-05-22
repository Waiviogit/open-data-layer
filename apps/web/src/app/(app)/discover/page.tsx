import { Suspense } from 'react';

import { DiscoverPageClient } from '@/modules/discover/presentation/components/discover-page-client';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

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
