'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { formatUpdateCountLabel } from '@/modules/object/domain/update-count-label';

export type LeftRailUpdateCountBadgeProps = {
  count: number;
};

/** Muted line under a left-rail field heading — update count, not part of the title. */
export function LeftRailUpdateCountBadge({ count }: LeftRailUpdateCountBadgeProps) {
  const { t } = useI18n();
  const label = formatUpdateCountLabel(count, t);

  return (
    <p className="text-caption leading-snug text-muted tabular-nums" aria-label={label}>
      {label}
    </p>
  );
}
