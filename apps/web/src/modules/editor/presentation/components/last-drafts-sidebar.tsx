'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { HydrationSafeRelativeTime } from './hydration-safe-relative-time';

export type LastDraftSidebarItem = {
  draftId: string;
  title: string;
  lastUpdated: number;
};

export type LastDraftsSidebarProps = {
  drafts: LastDraftSidebarItem[];
};

export function LastDraftsSidebar({ drafts }: LastDraftsSidebarProps) {
  const { t, locale } = useI18n();

  return (
    <aside
      className={[
        'rounded-card border border-border bg-surface p-card-padding shadow-card',
        'lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto',
      ].join(' ')}
    >
      <div className="mb-3 border-b border-border pb-3">
        <h2 className="font-label text-caption text-fg-secondary tracking-caption">
          {t('editor_last_drafts')}
        </h2>
      </div>
      <ul className="flex flex-col gap-3">
        {drafts.length === 0 ? (
          <li className="text-body-sm text-fg-tertiary">{t('editor_last_drafts_empty')}</li>
        ) : (
          drafts.map((d) => {
            const label =
              d.title.trim() !== '' ? d.title : t('drafts_untitled');
            return (
              <li key={d.draftId}>
                <Link
                  href={`/editor?draftId=${encodeURIComponent(d.draftId)}`}
                  suppressHydrationWarning
                  className={[
                    'block w-full rounded-btn px-1 py-1 text-start transition-colors',
                    'hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  ].join(' ')}
                >
                  <span className="line-clamp-2 font-display text-body-sm text-heading">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-caption text-fg-tertiary">
                    <HydrationSafeRelativeTime
                      locale={locale}
                      lastUpdatedMs={d.lastUpdated}
                    />
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
      <div className="mt-4 border-t border-border pt-3">
        <Link
          href="/drafts"
          suppressHydrationWarning
          className="text-body-sm text-link hover:text-accent-alt"
        >
          {t('editor_last_drafts_show_more')}
        </Link>
      </div>
    </aside>
  );
}
