import { Suspense } from 'react';

import { DiscoverPageClient } from '@/modules/discover/presentation/components/discover-page-client';

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverPageClient />
    </Suspense>
  );
}
