'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  ObjectRefListFeed,
  ObjectViewShell,
} from '@/modules/object';
import type { ObjectRefListPageView } from '@/modules/object/infrastructure/object-ref-list.client';
import { AuthorityActionButton } from '@/modules/object/presentation/components/authority-action-button';
import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';
import { UserSocialAccountList } from '@/modules/user-social/presentation/components/user-social-account-list';
import { getWalletFacade, useHydrateWalletProvider, useLoginModal } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { buildOdlObjectAuthorityOp, buildOdlObjectFollowOp } from '@opden-data-layer/hive-broadcast';
import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import {
  buildObjectAddOnPath,
  buildObjectGalleryAlbumPath,
  buildObjectGalleryPath,
  buildObjectRelatedPath,
  buildObjectSimilarPath,
} from '@/modules/object/domain/object-page-url.constants';

import { loadMoreObjectAuthorityAction } from './authority/object-authority.actions';
import { loadMoreObjectFollowersAction } from './followers/object-followers.actions';
import {
  OBJECT_PAGE_AUTHORITY_SUB_PARAM,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
  OBJECT_PAGE_VIEW_PATH_PARAM,
  resolveGalleryAlbumForObjectPage,
  resolvePrimarySegmentForObjectPage,
} from './object-page-search';
import { loadMoreObjectRefListAction } from './related/load-more-ref-list.actions';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

export type ObjectPageClientProps = {
  model: ObjectPageViewModel;
  /** Preloaded followers list when `?tab=followers` (see {@link getObjectFollowersPageQuery}). Null on other tabs. */
  embeddedFollowersPage: PaginatedUserFollowListView | null;
  /** Subscription list sort from `?sort=` (validated on the server for the initial followers payload). */
  followersSort: UserSubscriptionSort;
  /** Preloaded authority accounts when `?tab=authority` (see {@link getObjectAuthorityPageQuery}). */
  embeddedAuthorityPage: PaginatedUserFollowListView | null;
  /** `?sub=administrative|ownership` — validated on the server for the initial authority payload. */
  authoritySubType: AuthoritySubType;
  authoritySort: UserSubscriptionSort;
  embeddedRelatedPage: ObjectRefListPageView | null;
  embeddedSimilarPage: ObjectRefListPageView | null;
  embeddedAddOnPage: ObjectRefListPageView | null;
  viewerUsername: string | null;
  /** Primary tab from `?tab=` (server-validated). Empty when URL has no tab (menu landing). */
  initialPrimarySegment: string;
  /** SSR-restored active gallery album from proxy `?gallery_album=` or path. */
  initialGalleryAlbum: string | null;
  /** SSR-restored nested stack from `?path=`. */
  initialNestedStack: ObjectNestedViewResolved[];
  /** SSR-resolved first menu item content when URL has no `?path=` (business-like objects). */
  defaultNestedContent: ObjectNestedViewResolved | null;
  /** Server-rendered page body for top-level page-type objects. */
  objectPageBody?: ReactNode;
  /** Server-rendered description body when `/object/:id/description` is active. */
  objectDescriptionBody?: ReactNode;
  /** Streamed updates feed (Suspense) when Updates tab is active. */
  updatesFeedSlot?: ReactNode;
  /** Streamed right rail (Suspense). */
  rightRailSlot: ReactNode;
  /** True when `?path=` was present but nested objects could not be resolved. */
  invalidPathRequested?: boolean;
};

export function ObjectPageClient({
  model,
  embeddedFollowersPage,
  followersSort,
  embeddedAuthorityPage,
  authoritySubType,
  authoritySort,
  embeddedRelatedPage,
  embeddedSimilarPage,
  embeddedAddOnPage,
  viewerUsername,
  initialPrimarySegment,
  initialGalleryAlbum,
  initialNestedStack,
  defaultNestedContent,
  objectPageBody,
  objectDescriptionBody,
  updatesFeedSlot = null,
  rightRailSlot,
  invalidPathRequested = false,
}: ObjectPageClientProps) {
  const defaultFeedSub = model.feedSubTabs[0]?.segment ?? 'posts';

  const router = useRouter();
  const pathname = usePathname();
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
  const [activeGalleryAlbum, setActiveGalleryAlbum] =
    useState(initialGalleryAlbum);
  const [activeFeedSubSegment, setActiveFeedSubSegment] =
    useState(defaultFeedSub);

  useEffect(() => {
    setActivePrimarySegment(
      resolvePrimarySegmentForObjectPage(
        model.objectId,
        pathname,
        searchParams,
        initialPrimarySegment,
      ),
    );
    setActiveGalleryAlbum(
      resolveGalleryAlbumForObjectPage(model.objectId, pathname, searchParams),
    );
  }, [initialPrimarySegment, model.objectId, pathname, searchParams]);

  useEffect(() => {
    setFavorite(model.hasAdministrativeAuthority);
  }, [model.hasAdministrativeAuthority, model.objectId]);

  useEffect(() => {
    setFollowing(model.isFollowing);
    setViewerBell(model.viewerBell);
  }, [model.isFollowing, model.viewerBell, model.objectId]);

  useEffect(() => {
    if (!invalidPathRequested) {
      return;
    }
    const u = new URLSearchParams(searchParams.toString());
    if (!u.has(OBJECT_PAGE_VIEW_PATH_PARAM)) {
      return;
    }
    u.delete(OBJECT_PAGE_VIEW_PATH_PARAM);
    const qs = u.toString();
    const base = `/object/${encodeURIComponent(model.objectId)}`;
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  }, [invalidPathRequested, model.objectId, router, searchParams]);

  const onPrimarySelect = useCallback(
    (segment: string) => {
      setActivePrimarySegment(segment);
      const id = encodeURIComponent(model.objectId);
      const base = `/object/${id}`;
      const u = new URLSearchParams(searchParams.toString());

      if (segment === 'reviews') {
        u.delete(OBJECT_PAGE_VIEW_PATH_PARAM);
        u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
        const qs = u.toString();
        router.push(qs ? `${base}/reviews?${qs}` : `${base}/reviews`, {
          scroll: false,
        });
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

      if (segment === 'gallery' || segment === 'experts') {
        u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
        u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
        u.delete('sort');
        u.delete('update_type');
        u.delete('locale');
        const qs = u.toString();
        if (segment === 'gallery') {
          setActiveGalleryAlbum(null);
          router.replace(
            qs ? `${base}/gallery?${qs}` : `${base}/gallery`,
            { scroll: false },
          );
          return;
        }
        router.replace(qs ? `${base}/${segment}?${qs}` : `${base}/${segment}`, {
          scroll: false,
        });
        return;
      }

      if (segment === 'related') {
        u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
        u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
        const qs = u.toString();
        router.replace(
          qs ? `${buildObjectRelatedPath(model.objectId)}?${qs}` : buildObjectRelatedPath(model.objectId),
          { scroll: false },
        );
        return;
      }

      if (segment === 'similar') {
        u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
        u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
        const qs = u.toString();
        router.replace(
          qs ? `${buildObjectSimilarPath(model.objectId)}?${qs}` : buildObjectSimilarPath(model.objectId),
          { scroll: false },
        );
        return;
      }

      if (segment === 'add-on') {
        u.delete(OBJECT_PAGE_PRIMARY_TAB_PARAM);
        u.delete(OBJECT_PAGE_AUTHORITY_SUB_PARAM);
        const qs = u.toString();
        router.replace(
          qs ? `${buildObjectAddOnPath(model.objectId)}?${qs}` : buildObjectAddOnPath(model.objectId),
          { scroll: false },
        );
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
    [model.objectId, router, searchParams],
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

  const supportedUpdateTypes = useMemo(() => {
    const registryEntry =
      OBJECT_TYPE_REGISTRY[model.objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
    return registryEntry?.supported_updates ?? [];
  }, [model.objectTypeKey]);

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

  const objectRelatedFeed = useMemo(() => {
    if (embeddedRelatedPage == null) {
      return null;
    }
    return (
      <ObjectRefListFeed
        key={`${model.objectId}-related`}
        objectId={model.objectId}
        relation="related"
        initialItems={embeddedRelatedPage.items}
        initialCursor={embeddedRelatedPage.cursor}
        initialHasMore={embeddedRelatedPage.hasMore}
        viewerUsername={viewerUsername}
        onRequireLogin={openLogin}
        loadMoreAction={loadMoreObjectRefListAction}
      />
    );
  }, [embeddedRelatedPage, model.objectId, openLogin, viewerUsername]);

  const objectSimilarFeed = useMemo(() => {
    if (embeddedSimilarPage == null) {
      return null;
    }
    return (
      <ObjectRefListFeed
        key={`${model.objectId}-similar`}
        objectId={model.objectId}
        relation="similar"
        initialItems={embeddedSimilarPage.items}
        initialCursor={embeddedSimilarPage.cursor}
        initialHasMore={embeddedSimilarPage.hasMore}
        viewerUsername={viewerUsername}
        onRequireLogin={openLogin}
        loadMoreAction={loadMoreObjectRefListAction}
      />
    );
  }, [embeddedSimilarPage, model.objectId, openLogin, viewerUsername]);

  const objectAddOnFeed = useMemo(() => {
    if (embeddedAddOnPage == null) {
      return null;
    }
    return (
      <ObjectRefListFeed
        key={`${model.objectId}-add-on`}
        objectId={model.objectId}
        relation="add-on"
        initialItems={embeddedAddOnPage.items}
        initialCursor={embeddedAddOnPage.cursor}
        initialHasMore={embeddedAddOnPage.hasMore}
        viewerUsername={viewerUsername}
        onRequireLogin={openLogin}
        loadMoreAction={loadMoreObjectRefListAction}
      />
    );
  }, [embeddedAddOnPage, model.objectId, openLogin, viewerUsername]);

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

  const onOpenGalleryAlbum = useCallback(
    (albumName: string) => {
      setActiveGalleryAlbum(albumName);
      router.push(buildObjectGalleryAlbumPath(model.objectId, albumName), {
        scroll: false,
      });
    },
    [model.objectId, router],
  );

  const onBackToGalleryAlbums = useCallback(() => {
    setActiveGalleryAlbum(null);
    router.replace(buildObjectGalleryPath(model.objectId), { scroll: false });
  }, [model.objectId, router]);

  const galleryPhotosAlbum = useMemo(() => {
    const photosAlbum = model.galleryAlbums.find((album) => album.name === 'Photos');
    if (photosAlbum) {
      return photosAlbum;
    }
    if (model.previewGallery.length > 0) {
      return { name: 'Photos', items: model.previewGallery };
    }
    return null;
  }, [model.galleryAlbums, model.previewGallery]);

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

  const defaultNestedTargetId =
    model.defaultLanding.kind === 'nestedInHost'
      ? model.defaultLanding.targetObjectId
      : null;

  const canOpenDescriptionPage =
    Boolean(model.descriptionContent?.trim()) || model.previewGallery.length > 0;

  const leftRail = (
    <LeftObjectProfileSidebar>
      <ObjectLeftRailPanel
        blocks={model.leftRailBlocks}
        objectTypeKey={model.objectTypeKey}
        editContext={leftRailEditContext}
        objectId={model.objectId}
        defaultNestedTargetId={defaultNestedTargetId}
        canOpenDescriptionPage={canOpenDescriptionPage}
        objectName={model.title}
        galleryPhotosAlbum={galleryPhotosAlbum}
        supportedUpdateTypes={supportedUpdateTypes}
        updateTypeCounts={model.updateTypeCounts}
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
          objectUpdatesFeed={updatesFeedSlot}
          objectFollowersFeed={objectFollowersFeed}
          objectAuthorityFeed={objectAuthorityFeed}
          objectRelatedFeed={objectRelatedFeed}
          objectSimilarFeed={objectSimilarFeed}
          objectAddOnFeed={objectAddOnFeed}
          objectPageBody={objectPageBody}
          objectDescriptionBody={objectDescriptionBody}
          galleryAlbums={model.galleryAlbums}
          activeGalleryAlbum={activeGalleryAlbum}
          onOpenGalleryAlbum={onOpenGalleryAlbum}
          onBackToGalleryAlbums={onBackToGalleryAlbums}
          supportedUpdateTypes={supportedUpdateTypes}
          updateTypeCounts={model.updateTypeCounts}
          viewerUsername={viewerUsername}
          onRequireLogin={openLogin}
        />
      }
      rightRail={rightRailSlot}
    />
  );
}
