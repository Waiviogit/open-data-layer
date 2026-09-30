'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

export type StateBadgeVariant =
  | 'confirmed'
  | 'pending'
  | 'pending_signature'
  | 'disputed'
  | 'resolved'
  | 'retired'
  | 'cancelled'
  | 'indexing';

const LABEL_KEYS: Record<StateBadgeVariant, string> = {
  confirmed: 'business_state_confirmed',
  pending: 'business_state_pending',
  pending_signature: 'business_state_pending_signature',
  disputed: 'business_state_disputed',
  resolved: 'business_state_resolved',
  retired: 'business_state_retired',
  cancelled: 'business_state_cancelled',
  indexing: 'business_state_indexing',
};

export function StateBadge({ variant }: { variant: StateBadgeVariant }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex rounded-pill border border-border bg-surface-alt px-2 py-0.5 text-caption text-fg">
      {t(LABEL_KEYS[variant])}
    </span>
  );
}
