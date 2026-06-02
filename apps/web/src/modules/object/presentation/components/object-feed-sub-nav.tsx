'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { ObjectFeedSubTabView } from '../../domain/object-page.types';

export type ObjectFeedSubNavProps = {
  tabs: ObjectFeedSubTabView[];
  activeSegment: string;
  onSelect: (segment: string) => void;
};

export function ObjectFeedSubNav({
  tabs,
  activeSegment,
  onSelect,
}: ObjectFeedSubNavProps) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t('object_detail_feed_sub_nav_aria')}
      className="flex flex-wrap gap-x-2 border-b border-border"
    >
      {tabs.map((tab) => {
        const active = activeSegment === tab.segment;
        return (
          <button
            key={tab.segment}
            type="button"
            className={[
              '-mb-px inline-flex border-b-2 px-2 py-2 text-caption font-weight-label transition-colors',
              active
                ? 'border-accent text-fg'
                : 'border-transparent text-muted hover:text-fg',
            ].join(' ')}
            onClick={() => onSelect(tab.segment)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
