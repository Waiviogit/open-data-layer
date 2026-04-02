import type { ComponentPropsWithoutRef } from 'react';

/**
 * Anchor with hydration warnings suppressed for attribute-level mismatches.
 * Browser extensions (e.g. wallet/password managers) often inject classes on
 * links before React hydrates, which would otherwise trigger noisy mismatches.
 */
export function HydrationSafeAnchor(
  props: ComponentPropsWithoutRef<'a'>,
) {
  return <a {...props} suppressHydrationWarning />;
}
