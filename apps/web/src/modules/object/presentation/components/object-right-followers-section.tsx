'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import type { PaginatedUserFollowListView } from '@/modules/user-social/application/dto/user-social.dto';
import { UserAvatar } from '@/shared/presentation';

import { buildObjectFollowersPath } from '../../domain/object-page-url.constants';

const RIGHT_RAIL_MAX_ITEMS = 5;

export type ObjectRightFollowersSectionProps = {
  objectId: string;
  page: PaginatedUserFollowListView;
};

export function ObjectRightFollowersSection({
  objectId,
  page,
}: ObjectRightFollowersSectionProps) {
  const { t } = useI18n();
  const visible = page.items.slice(0, RIGHT_RAIL_MAX_ITEMS);
  const hasMore = page.hasMore || page.total > RIGHT_RAIL_MAX_ITEMS;

  return (
    <aside className="w-full rounded-card border border-border bg-surface/60 px-3 py-card-padding text-body-sm text-muted">
      <p className="font-weight-label text-fg">{t('followers')}</p>
      <ul className="mt-3 w-full space-y-2">
        {visible.map((row) => (
          <li key={row.name} className="w-full">
            <Link
              href={`/@${row.name}`}
              className="flex w-full min-w-0 items-center gap-2 rounded-btn border border-border bg-bg p-2 transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              suppressHydrationWarning
            >
              <UserAvatar
                username={row.name}
                avatarUrl={row.avatarUrl}
                displayName={row.name}
                size={40}
              />
              <p className="min-w-0 flex-1 truncate text-body-sm font-weight-label leading-body text-fg">
                {row.name}
              </p>
              <span className="shrink-0 rounded-btn border border-border bg-surface-control px-2 py-0.5 font-mono text-body-sm tabular-nums text-fg">
                {row.wobjectsWeight.toFixed(2)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <Link
          href={buildObjectFollowersPath(objectId)}
          className="mt-3 inline-block text-body-sm font-weight-label text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          suppressHydrationWarning
        >
          {t('object_right_show_more')}
        </Link>
      ) : null}
    </aside>
  );
}
