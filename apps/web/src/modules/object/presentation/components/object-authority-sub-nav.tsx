'use client';

import { useCallback } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { AuthoritySubType } from '../../domain/object-page.types';

export type ObjectAuthoritySubNavProps = {
  administrativeCount: number;
  ownershipCount: number;
  activeSub: AuthoritySubType;
  onSelect: (sub: AuthoritySubType) => void;
};

export function ObjectAuthoritySubNav({
  administrativeCount,
  ownershipCount,
  activeSub,
  onSelect,
}: ObjectAuthoritySubNavProps) {
  const { t } = useI18n();

  const mkLabel = useCallback(
    (sub: AuthoritySubType, count: number): string => {
      const base =
        sub === 'administrative'
          ? t('object_authority_sub_administrative')
          : t('object_authority_sub_ownership');
      return `${base} (${count})`;
    },
    [t],
  );

  return (
    <nav
      aria-label={t('object_authority_sub_nav_aria')}
      className="flex flex-wrap gap-x-2 border-b border-border"
    >
      {(['administrative', 'ownership'] as const).map((sub) => {
        const active = activeSub === sub;
        const count = sub === 'administrative' ? administrativeCount : ownershipCount;
        return (
          <button
            key={sub}
            type="button"
            className={[
              '-mb-px inline-flex border-b-2 px-2 py-2 text-caption font-medium transition-colors',
              active
                ? 'border-accent text-fg'
                : 'border-transparent text-muted hover:text-fg',
            ].join(' ')}
            onClick={() => onSelect(sub)}
          >
            {mkLabel(sub, count)}
          </button>
        );
      })}
    </nav>
  );
}
