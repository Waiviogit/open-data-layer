'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ObjectNestedViewResolved,
  ObjectPageViewModel,
  AuthoritySubType,
} from '@/modules/object';
import {
  LeftObjectProfileSidebar,
  ObjectHero,
  ObjectLeftRailPanel,
  ObjectPrimaryContent,
  ObjectPrimaryNav,
  ObjectAuthoritySubNav,
  ObjectRightSidebar,
  ObjectViewShell,
} from '@/modules/object';
import { AuthorityActionButton } from '@/modules/object/presentation/components/authority-action-button';
import type { ObjectEmbeddedUpdatesFeedModel } from '@/modules/object-updates/embedded-updates-feed.model';
import { ObjectUpdatesFeed } from '@/modules/object-updates/presentation/components/object-updates-feed';
import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';
import { UserSocialAccountList } from '@/modules/user-social/presentation/components/user-social-account-list';
import { getWalletFacade, useHydrateWalletProvider, useLoginModal } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { buildOdlObjectAuthorityOp, buildOdlObjectFollowOp } from '@opden-data-layer/hive-broadcast';
import { useOdlCustomJsonId } from '@/config/odl-network-provider';

import { loadMoreObjectAuthorityAction } from './authority/object-authority.actions';
import { loadMoreObjectFollowersAction } from './followers/object-followers.actions';
import {
  OBJECT_PAGE_AUTHORITY_SUB_PARAM,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
} from './object-page-search';
import { loadMoreObjectUpdatesFeedAction } from './updates/updates-feed.actions';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

export type ObjectPageClientProps = {
  model: ObjectPageViewModel;
  embeddedUpdatesFeed: ObjectEmbeddedUpdatesFeedModel;
  /** Preloaded followers list when `?tab=followers` (see {@link getObjectFollowersPageQuery}). Null on other tabs. */
  embeddedFollowersPage: PaginatedUserFollowListView | null;
  /** Subscription list sort from `?sort=` (validated on the server for the initial followers payload). */
  followersSort: UserSubscriptionSort;
  /** Preloaded authority accounts when `?tab=authority` (see {@link getObjectAuthorityPageQuery}). */
  embeddedAuthorityPage: PaginatedUserFollowListView | null;
  /** `?sub=administrative|ownership` — validated on the server for the initial authority payload. */
  authoritySubType: AuthoritySubType;
  authoritySort: UserSubscriptionSort;
  viewerUsername: string | null;
  /** Primary tab from `?tab=` (server-validated). */
  initialPrimarySegment: string;
  /** First tab in the nav — URL omits `?tab` when this segment is active. */
  defaultPrimarySegment: string;
  /** SSR-restored nested stack from `?path=`. */
  initialNestedStack: ObjectNestedViewResolved[];
  /** SSR-resolved first menu item content when URL has no `?path=` (business-like objects). */
  defaultNestedContent: ObjectNestedViewResolved | null;
  /** Server-rendered page body for top-level page-type objects. */
  objectPageBody?: ReactNode;
};

export function ObjectPageClient({
  model,
  embeddedUpdatesFeed,
  embeddedFollowersPage,
  followersSort,
  embeddedAuthorityPage,
  authoritySubType,
  authoritySort,
  viewerUsername,
  initialPrimarySegment,
  defaultPrimarySegment,
  initialNestedStack,
  defaultNestedContent,
  objectPageBody,
}: ObjectPageClientProps) {
  const defaultFeedSub = model.feedSubTabs[0]?.segment ?? 'posts';

  const router = useRouter();
  const searchParams = useSearchParams();
  const { openLogin } = useLoginModal();
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();

  const [isEditMode, setEditMode] = useState(false);
  const [isFollowing, setFollowing] = useState(model.isFollowing);
  const [viewerBell, setViewerBell] = useState(model.viewerBell);
  const [followPending, setFollowPending] = useState(false);
  const [bellPending, setBellPending] = useState(false);
  const [isFavorite, setFavorite] = useState(model.hasAdministrativeAuthority);
  const [favoritePending, setFavoritePending] = useState(false);
  const [activePrimarySegment, setActivePrimarySegment] =
    useState(initialPrimarySegment);
  const [activeFeedSubSegment, setActiveFeedSubSegment] =
    useState(defaultFeedSub);

  useEffect(() => {
    setActivePrimarySegment(initialPrimarySegment);
  }, [initialPrimarySegment]);

  useEffect(() => {
    setFavorite(model.hasAdministrativeAuthority);
  }, [model.hasAdministrativeAuthority, model.objectId]);

  useEffect(() => {
    setFollowing(model.isFollowing);
    setViewerBell(model.viewerBell);
  }, [model.isFollowing, model.viewerBell, model.objectId]);

  const onPrimarySelect = useCallback(
    (segment: string) => {
      setActivePrimarySegment(segment);
      const id = encodeURIComponent(model.objectId);
      const base = `/object/${id}`;
      const u = new URLSearchParams(searchParams.toString());

      if (segment === defaultPrimarySegment) {
        router.replace(base, { scroll: false });
        return;
      }

      if (segment === 'updates') {
        u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
        u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
        const qs = u.toString();
        router.replace(qs ? `${base}/updates?${qs}` : `${base}/updates`, {
          scroll: false,
        });
        return;
      }

      if (segment === 'followers') {
        u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
        u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
        const qs = u.toString();
        router.replace(qs ? `${base}/followers?${qs}` : `${base}/followers`, {
          scroll: false,
        });
        return;
      }

      if (segment === 'authority') {
        u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
        const qs = u.toString();
        router.replace(qs ? `${base}/authority?${qs}` : `${base}/authority`, {
          scroll: false,
        });
        return;
      }

      u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
      u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
      u.delete('sort');
      u.delete('update_type');
      u.delete('locale');
      u.set(OBJECT_PAGE_PRIMARY_TAB_PARAM, segment);
      const qs = u.toString();
      router.replace(`${base}?${qs}`, { scroll: false });
    },
    [defaultPrimarySegment, model.objectId, router, searchParams],
  );

  const primaryNav = useMemo(
    () => (
      <ObjectPrimaryNav
        tabs={model.primaryTabs}
        activeSegment={activePrimarySegment}
        onSelect={onPrimarySelect}
      />
    ),
    [model.primaryTabs, activePrimarySegment, onPrimarySelect],
  );

  const onFollowToggle = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      openLogin();
      return;
    }
    if (followPending) {
      return;
    }
    const method = isFollowing ? 'unfollow' : 'follow';
    const previousFollowing = isFollowing;
    const previousBell = viewerBell;
    setFollowing(!previousFollowing);
    if (previousFollowing) {
      setViewerBell(false);
    }
    setFollowPending(true);
    try {
      const op = buildOdlObjectFollowOp({
        id: odlCustomJsonId,
        objectId: model.objectId,
        method,
        required_posting_auths: [account],
      });
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      void awaitTrxConfirmation(transactionId).finally(() => {
        void refreshAfterBroadcast(router, () =>
          revalidateObjectAfterBroadcast(model.objectId),
        ).finally(() => {
          setFollowPending(false);
        });
      });
    } catch {
      setFollowing(previousFollowing);
      setViewerBell(previousBell);
      setFollowPending(false);
    }
  }, [
    followPending,
    isFollowing,
    model.objectId,
    odlCustomJsonId,
    openLogin,
    router,
    viewerBell,
    viewerUsername,
  ]);

  const onBellToggle = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      openLogin();
      return;
    }
    if (bellPending || !isFollowing) {
      return;
    }
    const nextBell = !viewerBell;
    const previousBell = viewerBell;
    setViewerBell(nextBell);
    setBellPending(true);
    try {
      const op = buildOdlObjectFollowOp({
        id: odlCustomJsonId,
        objectId: model.objectId,
        method: 'bell',
        bell: nextBell,
        required_posting_auths: [account],
      });
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      void awaitTrxConfirmation(transactionId).finally(() => {
        void refreshAfterBroadcast(router, () =>
          revalidateObjectAfterBroadcast(model.objectId),
        ).finally(() => {
          setBellPending(false);
        });
      });
    } catch {
      setViewerBell(previousBell);
      setBellPending(false);
    }
  }, [
    bellPending,
    isFollowing,
    model.objectId,
    odlCustomJsonId,
    openLogin,
    router,
    viewerBell,
    viewerUsername,
  ]);

  const onFavoriteToggle = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      openLogin();
      return;
    }
    if (favoritePending) {
      return;
    }
    const method = isFavorite ? 'remove' : 'add';
    const previous = isFavorite;
    setFavorite(!previous);
    setFavoritePending(true);
    try {
      const op = buildOdlObjectAuthorityOp({
        id: odlCustomJsonId,
        objectId: model.objectId,
        authorityType: 'administrative',
        method,
        required_posting_auths: [account],
      });
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      void awaitTrxConfirmation(transactionId).finally(() => {
        void refreshAfterBroadcast(router, () =>
          revalidateObjectAfterBroadcast(model.objectId),
        ).finally(() => {
          setFavoritePending(false);
        });
      });
    } catch {
      setFavorite(previous);
      setFavoritePending(false);
    }
  }, [
    favoritePending,
    isFavorite,
    model.objectId,
    odlCustomJsonId,
    openLogin,
    router,
    viewerUsername,
  ]);

  const updatesFeedKey = [
    embeddedUpdatesFeed.filters.sort,
    embeddedUpdatesFeed.filters.update_type ?? '',
    embeddedUpdatesFeed.filters.locale ?? '',
  ].join('|');

  const objectUpdatesFeed = (
    <ObjectUpdatesFeed
      key={updatesFeedKey}
      objectId={model.objectId}
      initialItems={embeddedUpdatesFeed.initialPage.items}
      initialCursor={embeddedUpdatesFeed.initialPage.cursor}
      initialHasMore={embeddedUpdatesFeed.initialPage.hasMore}
      filters={embeddedUpdatesFeed.filters}
      typeOptions={embeddedUpdatesFeed.typeOptions}
      showLocaleFilter={embeddedUpdatesFeed.showLocaleFilter}
      localizableTypes={embeddedUpdatesFeed.localizableTypes}
      filterSync="url"
      loadMoreAction={loadMoreObjectUpdatesFeedAction}
      viewerUsername={viewerUsername}
      tagCategoryNames={model.tagCategoryNames}
    />
  );

  const objectFollowersFeed = useMemo(() => {
    if (embeddedFollowersPage == null) {
      return null;
    }
    return (
      <UserSocialAccountList
        key={`${model.objectId}-${followersSort}`}
        profileAccountName={model.objectId}
        listKind="followers"
        initialPage={embeddedFollowersPage}
        sort={followersSort}
        currentUsername={viewerUsername}
        loadMoreAction={loadMoreObjectFollowersAction}
        onBroadcastRevalidate={revalidateObjectAfterBroadcast}
      />
    );
  }, [embeddedFollowersPage, followersSort, model.objectId, viewerUsername]);

  const onAuthoritySubSelect = useCallback(
    (sub: AuthoritySubType) => {
      const id = encodeURIComponent(model.objectId);
      const base = `/object/${id}`;
      const u = new URLSearchParams(searchParams.toString());
      u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
      u.set(OBJECT_PAGE_AUTHORITY_SUB_PARAM, sub);
      const qs = u.toString();
      router.replace(qs ? `${base}/authority?${qs}` : `${base}/authority`, {
        scroll: false,
      });
    },
    [model.objectId, router, searchParams],
  );

  const loadMoreObjectAuthority = useMemo(
    () => (profileAccountName: string, sort: UserSubscriptionSort, skip: number) =>
      loadMoreObjectAuthorityAction(profileAccountName, authoritySubType, sort, skip),
    [authoritySubType],
  );

  const objectAuthorityFeed = useMemo(() => {
    if (embeddedAuthorityPage == null) {
      return null;
    }
    const viewerHasThisAuthority =
      authoritySubType === 'administrative'
        ? model.hasAdministrativeAuthority
        : model.hasOwnershipAuthority;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-card border border-border bg-bg px-card-padding pt-2">
          <ObjectAuthoritySubNav
            administrativeCount={model.administrativeAuthorityCount}
            ownershipCount={model.ownershipAuthorityCount}
            activeSub={authoritySubType}
            onSelect={onAuthoritySubSelect}
          />
        </div>
        <AuthorityActionButton
          objectId={model.objectId}
          authorityType={authoritySubType}
          hasAuthority={viewerHasThisAuthority}
          viewerUsername={viewerUsername}
          onRequireLogin={openLogin}
        />
        <UserSocialAccountList
          key={`${model.objectId}-${authoritySubType}-${authoritySort}`}
          profileAccountName={model.objectId}
          listKind={
            authoritySubType === 'administrative'
              ? 'authority_administrative'
              : 'authority_ownership'
          }
          initialPage={embeddedAuthorityPage}
          sort={authoritySort}
          currentUsername={viewerUsername}
          loadMoreAction={loadMoreObjectAuthority}
          onBroadcastRevalidate={revalidateObjectAfterBroadcast}
        />
      </div>
    );
  }, [
    embeddedAuthorityPage,
    authoritySubType,
    authoritySort,
    model.administrativeAuthorityCount,
    model.hasAdministrativeAuthority,
    model.hasOwnershipAuthority,
    model.objectId,
    model.ownershipAuthorityCount,
    onAuthoritySubSelect,
    openLogin,
    viewerUsername,
    loadMoreObjectAuthority,
  ]);

  const supportedUpdateTypes = useMemo(
    () => embeddedUpdatesFeed.typeOptions.map((o) => o.value),
    [embeddedUpdatesFeed.typeOptions],
  );

  const leftRailEditContext =
    isEditMode && viewerUsername
      ? {
          objectId: model.objectId,
          viewerUsername,
          supportedUpdateTypes,
          tagCategoryNames: model.tagCategoryNames,
          updateTypeCounts: model.updateTypeCounts,
        }
      : undefined;

  const leftRail = (
    <LeftObjectProfileSidebar>
      <ObjectLeftRailPanel
        blocks={model.leftRailBlocks}
        objectTypeKey={model.objectTypeKey}
        editContext={leftRailEditContext}
        objectId={model.objectId}
        viewerUsername={viewerUsername}
        onRequireLogin={openLogin}
      />
    </LeftObjectProfileSidebar>
  );

  return (
    <ObjectViewShell
      hero={
        <ObjectHero
          title={model.title}
          subtitleTitle={model.subtitleTitle}
          avatarUrl={model.avatarUrl}
          coverImageUrl={model.coverImageUrl}
          tagline={model.tagline}
          displayWeightLabel={model.displayWeightLabel}
          kindLabel={model.kindLabel}
          isEditMode={isEditMode}
          isFollowing={isFollowing}
          isBell={viewerBell}
          isFavorite={isFavorite}
          onToggleEdit={() => setEditMode((v) => !v)}
          onFollowToggle={onFollowToggle}
          onBellToggle={onBellToggle}
          onFavoriteToggle={onFavoriteToggle}
          primaryNav={primaryNav}
        />
      }
      leftRail={leftRail}
      center={
        <ObjectPrimaryContent
          objectId={model.objectId}
          activePrimarySegment={activePrimarySegment}
          activeFeedSubSegment={activeFeedSubSegment}
          feedSubTabs={model.feedSubTabs}
          title={model.title}
          objectType={model.objectType}
          listItems={model.listItems}
          listItemsSortCustom={model.listItemsSortCustom}
          initialNestedStack={initialNestedStack}
          defaultNestedContent={defaultNestedContent}
          onFeedSubSelect={setActiveFeedSubSegment}
          objectUpdatesFeed={objectUpdatesFeed}
          objectFollowersFeed={objectFollowersFeed}
          objectAuthorityFeed={objectAuthorityFeed}
          objectPageBody={objectPageBody}
          viewerUsername={viewerUsername}
          onRequireLogin={openLogin}
        />
      }
      rightRail={
        <ObjectRightSidebar
          featured={model.rightFeatured}
          related={model.rightRelated}
          similar={model.rightSimilar}
        />
      }
    />
  );
}
