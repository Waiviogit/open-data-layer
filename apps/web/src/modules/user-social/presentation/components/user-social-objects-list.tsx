'use client';

import { useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useSyncedPaginatedList } from '@/shared/presentation';

import type {
  PaginatedFollowingObjectsView,
  UserObjectListSort,
  LoadMoreUserSocialObjectsFn,
} from '@/modules/user-social/application/dto/user-social.dto';

import { UserSocialObjectRow } from './user-social-object-row';
import { UserSocialObjectsSort } from './user-social-objects-sort';

export type UserSocialObjectsListProps = {
  profileAccountName: string;
  initialPage: PaginatedFollowingObjectsView;
  sort: UserObjectListSort;
  locale: string;
  viewerUsername: string | null;
  loadMoreAction: LoadMoreUserSocialObjectsFn;
};

export function UserSocialObjectsList({
  profileAccountName,
  initialPage,
  sort,
  locale,
  viewerUsername,
  loadMoreAction,
}: UserSocialObjectsListProps) {
  const { t } = useI18n();
  const { items, setItems, hasMore, setHasMore } = useSyncedPaginatedList(initialPage);
  const [pending, startTransition] = useTransition();

  return (
    <section
      className="rounded-card border border-border bg-surface/80 p-card-padding"
      aria-labelledby={`social-objects-${profileAccountName}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <h2 id={`social-objects-${profileAccountName}`} className="sr-only">
          {t('objects')}
        </h2>
        <UserSocialObjectsSort />
      </div>
      {items.length === 0 ? (
        <p className="text-body-sm text-muted">{t('social_list_empty_objects')}</p>
      ) : (
        <>
          <ul>
            {items.map((o) => (
              <UserSocialObjectRow
                key={o.object_id}
                object={o}
                profileAccountName={profileAccountName}
                viewerUsername={viewerUsername}
                onRemoved={(objectId) => {
                  setItems((prev) => prev.filter((item) => item.object_id !== objectId));
                }}
              />
            ))}
          </ul>
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={pending}
                className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-weight-label text-fg hover:bg-surface-control-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const next = await loadMoreAction(
                      profileAccountName,
                      sort,
                      locale,
                      items.length,
                    );
                    setItems((prev) => [...prev, ...next.items]);
                    setHasMore(next.hasMore);
                  });
                }}
              >
                {pending ? t('drafts_loading') : t('drafts_load_more')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
