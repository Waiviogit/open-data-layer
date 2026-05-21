'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Invalidate tagged query-api caches (server action), then refresh RSC props.
 * Call after `awaitTrxConfirmation` on on-chain mutations.
 */
export async function refreshAfterBroadcast(
  router: AppRouterInstance,
  revalidate: () => Promise<void>,
): Promise<void> {
  await revalidate();
  router.refresh();
}
