'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { ObjectPrimaryTabView } from '../../domain/object-page.types';

export type ObjectPrimaryNavProps = {
  tabs: ObjectPrimaryTabView[];
  activeSegment: string;
  onSelect: (segment: string) => void;
};

export function ObjectPrimaryNav({
  tabs,
  activeSegment,
  onSelect,
}: ObjectPrimaryNavProps) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t('object_detail_primary_nav_aria')}
      className="flex flex-wrap gap-x-1 gap-y-1 border-b border-border"
    >
      {tabs.map((tab) => {
        const active = activeSegment === tab.segment;
        const label = tab.label;
        const suffix =
          typeof tab.count === 'number' ? ` ${tab.count}` : '';
        return (
          <button
            key={tab.segment}
            type="button"
            className={[
              '-mb-px inline-flex items-center border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-accent text-fg'
                : 'border-transparent text-muted hover:border-border hover:text-fg',
            ].join(' ')}
            onClick={() => onSelect(tab.segment)}
          >
            {label}
            {suffix}
          </button>
        );
      })}
    </nav>
  );
}
