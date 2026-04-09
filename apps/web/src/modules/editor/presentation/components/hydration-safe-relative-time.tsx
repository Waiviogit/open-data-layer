'use client';

import { useEffect, useState } from 'react';

import { formatDraftRelativeTime } from '../format-draft-relative-time';

type HydrationSafeRelativeTimeProps = {
  locale: string;
  lastUpdatedMs: number;
  className?: string;
};

/**
 * Relative time differs between SSR and client (clock skew, locale resolution).
 * Renders a stable placeholder on server + first client paint, then fills after mount.
 */
export function HydrationSafeRelativeTime({
  locale,
  lastUpdatedMs,
  className,
}: HydrationSafeRelativeTimeProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatDraftRelativeTime(locale, lastUpdatedMs));
  }, [locale, lastUpdatedMs]);

  return (
    <span className={className} suppressHydrationWarning>
      {label ?? '\u00a0'}
    </span>
  );
}
