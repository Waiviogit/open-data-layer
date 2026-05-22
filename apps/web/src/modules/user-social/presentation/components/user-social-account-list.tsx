'use client';

import { useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useSyncedPaginatedList } from '@/shared/presentation';

import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
  LoadMoreUserSocialAccountListFn,
} from '@/modules/user-social/application/dto/user-social.dto';

import { UserSocialAccountRow } from './user-social-account-row';
import { UserSocialSubscriptionSort } from './user-social-subscription-sort';

export type UserSocialAccountListKind =
  | 'followers'
  | 'following'
  | 'authority_administrative'
  | 'authority_ownership';

export type UserSocialAccountListProps = {
  profileAccountName: string;
  listKind: UserSocialAccountListKind;
  initialPage: PaginatedUserFollowListView;
  sort: UserSubscriptionSort;
  currentUsername: string | null;
  loadMoreAction: LoadMoreUserSocialAccountListFn;
  /** Server action — pass by reference from RSC (not an inline arrow). */
  onBroadcastRevalidate?: (accountName: string) => Promise<void>;
};

export function UserSocialAccountList({
  profileAccountName,
  listKind,
  initialPage,
  sort,
  currentUsername,
  loadMoreAction,
  onBroadcastRevalidate,
}: UserSocialAccountListProps) {
  const { t } = useI18n();
  const { items, setItems, hasMore, setHasMore } = useSyncedPaginatedList(initialPage);
  const [pending, startTransition] = useTransition();

  const emptyKey =
    listKind === 'followers'
      ? 'social_list_empty_followers'
      : listKind === 'following'
        ? 'social_list_empty_following'
        : listKind === 'authority_administrative'
          ? 'social_list_empty_authority_administrative'
          : 'social_list_empty_authority_ownership';

  const headingKey =
    listKind === 'followers'
      ? 'followers'
      : listKind === 'following'
        ? 'following'
        : listKind === 'authority_administrative'
          ? 'object_authority_sub_administrative'
          : 'object_authority_sub_ownership';

  return (
    <section
      className="rounded-card border border-border bg-surface/80 p-card-padding"
      aria-labelledby={`social-list-${listKind}-${profileAccountName}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <h2 id={`social-list-${listKind}-${profileAccountName}`} className="sr-only">
          {t(headingKey)}
        </h2>
        <UserSocialSubscriptionSort />
      </div>
      {items.length === 0 ? (
        <p className="text-body-sm text-muted">{t(emptyKey)}</p>
      ) : (
        <>
          <ul>
            {items.map((row) => (
              <UserSocialAccountRow
                key={row.name}
                row={row}
                profileAccountName={profileAccountName}
                viewerUsername={currentUsername}
                onBroadcastRevalidate={onBroadcastRevalidate}
              />
            ))}
          </ul>
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={pending}
                className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-medium text-fg hover:bg-surface-control-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const next = await loadMoreAction(profileAccountName, sort, items.length);
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
