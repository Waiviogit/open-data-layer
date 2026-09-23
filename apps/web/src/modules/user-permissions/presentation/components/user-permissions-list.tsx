'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useInfiniteScroll, useSyncedPaginatedList } from '@/shared/presentation';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';

import {
  type LoadMoreUserPermissionsFn,
  PaginatedUserPermissionsList,
  UserPermissionsSort,
  UserPermissionsTab,
  UserPermissionsAuthorityType,
} from '../../application/dto/user-permissions.dto';
import { GrantAuthorityModal } from './grant-authority-modal';
import { PermissionsFilterBar, PermissionsTabLinks } from './permissions-controls';
import { UserPermissionsRow } from './user-permissions-row';

export type UserPermissionsListProps = {
  profileAccountName: string;
  tab: UserPermissionsTab;
  initialPage: PaginatedUserPermissionsList;
  sort: UserPermissionsSort;
  typeFilter?: UserPermissionsAuthorityType;
  viewerUsername: string | null;
  loadMoreAction: LoadMoreUserPermissionsFn;
  onBroadcastRevalidate?: (accountName: string) => Promise<void>;
};

export function UserPermissionsList({
  profileAccountName,
  tab,
  initialPage,
  sort,
  typeFilter,
  viewerUsername,
  loadMoreAction,
  onBroadcastRevalidate,
}: UserPermissionsListProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [grantOpen, setGrantOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { items, setItems, hasMore, setHasMore } =
    useSyncedPaginatedList({
      items: initialPage.items,
      hasMore: initialPage.hasMore,
    });

  const isOwner = viewerUsername != null &&
    viewerUsername.toLowerCase() === profileAccountName.toLowerCase();
  const showGrantedChrome = tab === 'granted';

  const onLoadMore = useCallback(() => {
    if (!hasMore || pending) {
      return;
    }
    startTransition(async () => {
      const next = await loadMoreAction(profileAccountName, tab, {
        type: typeFilter,
        sort,
        skip: items.length,
      });
      setItems((prev) => [...prev, ...next.items]);
      setHasMore(next.items.length > 0 && next.hasMore);
    });
  }, [
    hasMore,
    items.length,
    loadMoreAction,
    pending,
    profileAccountName,
    setHasMore,
    setItems,
    sort,
    tab,
    typeFilter,
  ]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: pending,
    onLoadMore,
  });

  const onGrantSuccess = useCallback(async () => {
    await refreshAfterBroadcast(
      router,
      () => onBroadcastRevalidate?.(profileAccountName) ?? Promise.resolve(),
    );
  }, [onBroadcastRevalidate, profileAccountName, router]);

  return (
    <section className="rounded-card border border-border bg-surface/80 p-card-padding">
      <PermissionsTabLinks profileAccountName={profileAccountName} />

      <div className="mt-4 space-y-4">
        {showGrantedChrome ? (
          <div className="space-y-3 rounded-card border border-border bg-surface-alt/40 p-4 text-body-sm text-fg">
            <p className="font-weight-label">{t('permissions_granted_disclaimer_title')}</p>
            <p>{t('permissions_granted_disclaimer_tip')}</p>
            <p>{t('permissions_granted_disclaimer_important')}</p>
          </div>
        ) : null}

        <PermissionsFilterBar
          onGrant={showGrantedChrome && isOwner ? () => setGrantOpen(true) : undefined}
        />

        {items.length === 0 ? (
          <p className="text-body-sm text-muted">{t('permissions_list_empty')}</p>
        ) : (
          <>
            <ul>
              {items.map((row) => (
                <UserPermissionsRow
                  key={`${row.accountName}:${row.authorityType}`}
                  row={row}
                  profileAccountName={profileAccountName}
                  viewerUsername={viewerUsername}
                  canRevoke={showGrantedChrome && isOwner}
                  onBroadcastRevalidate={onBroadcastRevalidate}
                />
              ))}
            </ul>
            {hasMore ? (
              <div className="mt-4 flex flex-col items-center gap-2">
                <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
              </div>
            ) : null}
          </>
        )}
      </div>

      {showGrantedChrome && isOwner ? (
        <GrantAuthorityModal
          open={grantOpen}
          onClose={() => setGrantOpen(false)}
          profileAccountName={profileAccountName}
          onSuccess={onGrantSuccess}
        />
      ) : null}
    </section>
  );
}
