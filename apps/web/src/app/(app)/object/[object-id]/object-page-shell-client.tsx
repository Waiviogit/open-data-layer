'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ObjectPageViewModel,
  ObjectLeftRailBlock,
  OwnershipSubType,
  FollowersSubType,
} from '@/modules/object/domain/object-page.types';
import type { ProjectedGalleryAlbumView } from '@/modules/object/domain/object-page.types';
import { resolveGalleryPhotosAlbum } from '@/modules/object/domain/resolve-gallery-photos-album';
import {
  objectStatusLabelKey,
  shouldShowObjectStatusBadge,
  shouldShowPermanentlyClosedLocationNotice,
} from '@/modules/object/domain/object-status-label';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import { RELATED_ALBUM_NAME } from '@opden-data-layer/core/post-related-images';
import { isPageContentVirtualGalleryAlbum } from '@/modules/object/domain/build-page-content-gallery-album';
import { galleryAlbumPickerNames } from '@/modules/object-updates/application/gallery-form-value';
import { ObjectGalleryViewer } from '@/modules/object/presentation/components/object-gallery-viewer';
import {
  LeftObjectProfileSidebar,
  ObjectHero,
  ObjectLeftRailPanel,
  ObjectPrimaryNav,
  ObjectEditRightRail,
  ObjectViewShell,
} from '@/modules/object';
import { getWalletFacade, useHydrateWalletProvider, useLoginModal } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { buildOdlObjectFavoriteOp, buildOdlObjectFollowOp } from '@opden-data-layer/hive-broadcast';
import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import {
  resolveUpdateTypeFilterForBlockKind,
  type ObjectLeftRailBlockKind,
} from '@/modules/object-updates/domain/block-update-type-map';
import {
  buildObjectGalleryAlbumPath,
  OBJECT_PAGE_CATEGORY_PATH_SEGMENT,
  OBJECT_PAGE_VIEW_PATH_PARAM,
  resolveCategoryNameForObjectPage,
} from '@/modules/object/domain/object-page-url.constants';
import { resolveObjectMobileCenterLayout } from '@/modules/object/domain/object-mobile-layout';
import { ObjectPageCenterSkeleton } from '@/modules/object/presentation/components/object-page-loading-skeleton';
import { useEffectiveNav, useInstantNavigation } from '@/shared/presentation';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

import {
  resolveGalleryAlbumForObjectPage,
  resolveDefaultPrimarySegmentFromLanding,
  resolvePrimarySegmentForObjectPage,
} from './object-page-search';
import {
  buildObjectFollowersSubHref,
  buildObjectOwnershipSubHref,
  buildObjectGalleryPath,
  buildObjectPrimaryTabNavigation,
  buildObjectUpdatesFieldHref,
} from './object-page-navigation';
import { fetchTagApprovalStatsAction } from './tag-approval.actions';
import { ObjectPageShellProvider } from './object-page-shell-context';

function tagSectionsFingerprintFromBlocks(blocks: readonly ObjectLeftRailBlock[]): string {
  for (const block of blocks) {
    if (block.kind !== 'tags') {
      continue;
    }
    return block.sections
      .map((section) =>
        [
          section.categoryTitle,
          section.tags
            .map((tag) => `${tag.value}#${tag.updateId ?? ''}`)
            .join(','),
        ].join(':'),
      )
      .join(';');
  }
  return '';
}

export type ObjectPageShellClientProps = {
  model: ObjectPageViewModel;
  viewerUsername: string | null;
  rightRailSlot: ReactNode;
  mobileSocialSlot?: ReactNode;
  children: ReactNode;
};

export function ObjectPageShellClient({
  model,
  viewerUsername,
  rightRailSlot,
  mobileSocialSlot,
  children,
}: ObjectPageShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const effectiveNav = useEffectiveNav();
  const { navigateInstant, isNavigating } = useInstantNavigation();
  const { openLogin } = useLoginModal();
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();

  const statusBadgeLabel = shouldShowObjectStatusBadge(model.lifecycleStatus)
    ? t(objectStatusLabelKey(model.lifecycleStatus, model.objectTypeKey))
    : null;

  const [isEditMode, setEditMode] = useState(false);
  const [isFollowing, setFollowing] = useState(model.isFollowing);
  const [viewerBell, setViewerBell] = useState(model.viewerBell);
  const [followPending, setFollowPending] = useState(false);
  const [bellPending, setBellPending] = useState(false);
  const [isFavorite, setFavorite] = useState(model.isFavorited);
  const [favoritePending, setFavoritePending] = useState(false);
  const defaultPrimaryWhenClean = useMemo(
    () =>
      resolveDefaultPrimarySegmentFromLanding(
        model.defaultLanding,
        model.primaryTabs.map((tab) => tab.segment),
      ),
    [model.defaultLanding, model.primaryTabs],
  );
  const [activePrimarySegment, setActivePrimarySegment] = useState(() =>
    resolvePrimarySegmentForObjectPage(
      model.objectId,
      pathname,
      searchParams,
      defaultPrimaryWhenClean,
    ),
  );
  const [activeGalleryAlbum, setActiveGalleryAlbum] = useState(() =>
    resolveGalleryAlbumForObjectPage(model.objectId, pathname, searchParams),
  );
  const effectiveSearchParams = useMemo(
    () => new URLSearchParams(effectiveNav.search),
    [effectiveNav.search],
  );
  const activeCategoryName = useMemo(() => {
    const categoryPathname =
      effectiveNav.pathname.includes(`/${OBJECT_PAGE_CATEGORY_PATH_SEGMENT}/`)
        ? effectiveNav.pathname
        : pathname;
    const categorySearch =
      effectiveNav.search.length > 0 ? effectiveSearchParams : searchParams;
    return resolveCategoryNameForObjectPage(
      model.objectId,
      categoryPathname,
      categorySearch,
    );
  }, [
    effectiveNav.pathname,
    effectiveNav.search,
    effectiveSearchParams,
    model.objectId,
    pathname,
    searchParams,
  ]);
  const [galleryFullView, setGalleryFullView] = useState<{
    album: ProjectedGalleryAlbumView;
    initialIndex: number;
  } | null>(null);
  const [tagApprovalStats, setTagApprovalStats] = useState<
    import('@/modules/object/domain/tag-approval-stats').TagApprovalStatsIndex | undefined
  >(undefined);

  const tagSectionsFingerprint = useMemo(
    () => tagSectionsFingerprintFromBlocks(model.leftRailBlocks),
    [model.leftRailBlocks],
  );

  useEffect(() => {
    if (!isEditMode || !viewerUsername) {
      setTagApprovalStats(undefined);
      return;
    }
    let cancelled = false;
    void fetchTagApprovalStatsAction(model.objectId).then((stats) => {
      if (!cancelled) {
        setTagApprovalStats(stats);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, model.objectId, viewerUsername, tagSectionsFingerprint]);

  useEffect(() => {
    setActivePrimarySegment(
      resolvePrimarySegmentForObjectPage(
        model.objectId,
        pathname,
        searchParams,
        defaultPrimaryWhenClean,
      ),
    );
    setActiveGalleryAlbum(
      resolveGalleryAlbumForObjectPage(model.objectId, pathname, searchParams),
    );
  }, [
    defaultPrimaryWhenClean,
    model.objectId,
    pathname,
    searchParams,
  ]);

  useEffect(() => {
    setFavorite(model.isFavorited);
  }, [model.isFavorited, model.objectId]);

  useEffect(() => {
    setFollowing(model.isFollowing);
    setViewerBell(model.viewerBell);
  }, [model.isFollowing, model.viewerBell, model.objectId]);

  const onPrimarySelect = useCallback(
    (segment: string) => {
      setActivePrimarySegment(segment);
      if (segment === 'gallery') {
        setActiveGalleryAlbum(null);
      }
      const u = new URLSearchParams(searchParams.toString());
      const { href, method } = buildObjectPrimaryTabNavigation(
        model.objectId,
        segment,
        u,
      );
      navigateInstant({ href, method, scroll: false });
    },
    [model.objectId, navigateInstant, searchParams],
  );

  const supportedUpdateTypes = useMemo(() => {
    const registryEntry =
      OBJECT_TYPE_REGISTRY[model.objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
    return registryEntry?.supported_updates ?? [];
  }, [model.objectTypeKey]);

  const statusUpdatesHref = useMemo(() => {
    if (
      !shouldShowPermanentlyClosedLocationNotice(
        model.lifecycleStatus,
        model.objectTypeKey,
      )
    ) {
      return null;
    }
    if (!supportedUpdateTypes.includes(UPDATE_TYPES.STATUS)) {
      return null;
    }
    return buildObjectUpdatesFieldHref(
      model.objectId,
      new URLSearchParams(searchParams.toString()),
      UPDATE_TYPES.STATUS,
    );
  }, [
    model.lifecycleStatus,
    model.objectId,
    model.objectTypeKey,
    searchParams,
    supportedUpdateTypes,
  ]);

  const onViewFieldUpdates = useCallback(
    (kind: ObjectLeftRailBlockKind) => {
      const updateType = resolveUpdateTypeFilterForBlockKind(
        kind,
        supportedUpdateTypes,
        model.updateTypeCounts,
      );
      setActivePrimarySegment('updates');
      const href = buildObjectUpdatesFieldHref(
        model.objectId,
        new URLSearchParams(searchParams.toString()),
        updateType ?? null,
      );
      navigateInstant({ href, method: 'replace', scroll: false });
    },
    [model.objectId, model.updateTypeCounts, navigateInstant, searchParams, supportedUpdateTypes],
  );

  const onOwnershipSubSelect = useCallback(
    (sub: OwnershipSubType) => {
      const href = buildObjectOwnershipSubHref(
        model.objectId,
        new URLSearchParams(searchParams.toString()),
        sub,
      );
      navigateInstant({ href, method: 'replace', scroll: false });
    },
    [model.objectId, navigateInstant, searchParams],
  );

  const onFollowersSubSelect = useCallback(
    (sub: FollowersSubType) => {
      const href = buildObjectFollowersSubHref(
        model.objectId,
        new URLSearchParams(searchParams.toString()),
        sub,
      );
      navigateInstant({ href, method: 'replace', scroll: false });
    },
    [model.objectId, navigateInstant, searchParams],
  );

  const onOpenGalleryAlbum = useCallback(
    (albumName: string) => {
      setActiveGalleryAlbum(albumName);
      const href = buildObjectGalleryAlbumPath(model.objectId, albumName);
      navigateInstant({ href, method: 'push', scroll: false });
    },
    [model.objectId, navigateInstant],
  );

  const onBackToGalleryAlbums = useCallback(() => {
    setActiveGalleryAlbum(null);
    const href = buildObjectGalleryPath(model.objectId);
    navigateInstant({ href, method: 'replace', scroll: false });
  }, [model.objectId, navigateInstant]);

  const onOpenGalleryPhoto = useCallback(
    (album: ProjectedGalleryAlbumView, photoIndex: number) => {
      setGalleryFullView({ album, initialIndex: photoIndex });
    },
    [],
  );

  const onCloseGalleryFullView = useCallback(() => {
    setGalleryFullView(null);
  }, []);

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
    viewerBell,
    viewerUsername,
    router,
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
    viewerBell,
    viewerUsername,
    router,
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
      const op = buildOdlObjectFavoriteOp({
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
    viewerUsername,
    router,
  ]);

  const galleryPhotosAlbum = useMemo(
    () => resolveGalleryPhotosAlbum(model.galleryAlbums, model.previewGallery),
    [model.galleryAlbums, model.previewGallery],
  );

  const leftRailEditContext =
    isEditMode && viewerUsername
      ? {
          objectId: model.objectId,
          viewerUsername,
          supportedUpdateTypes,
          tagCategoryNames: model.tagCategoryNames,
          galleryAlbumNames: galleryAlbumPickerNames(model.onChainGalleryAlbumNames),
          onChainGalleryAlbumNames: model.onChainGalleryAlbumNames,
          updateTypeCounts: model.updateTypeCounts,
          listCatalogItems: model.listItems,
          listSortCustom: model.listItemsSortCustom,
          onViewFieldUpdates,
        }
      : undefined;

  const defaultNestedTargetId =
    model.defaultLanding.kind === 'nestedInHost'
      ? model.defaultLanding.targetObjectId
      : null;

  const canOpenDescriptionPage =
    Boolean(model.descriptionContent?.trim()) || model.previewGallery.length > 0;

  const rightRail =
    isEditMode && viewerUsername ? (
      <ObjectEditRightRail model={model} />
    ) : (
      rightRailSlot
    );

  const leftRail = (
    <LeftObjectProfileSidebar>
      <ObjectLeftRailPanel
        blocks={model.leftRailBlocks}
        objectTypeKey={model.objectTypeKey}
        editContext={leftRailEditContext}
        objectId={model.objectId}
        activeCategoryName={activeCategoryName}
        defaultNestedTargetId={defaultNestedTargetId}
        canOpenDescriptionPage={canOpenDescriptionPage}
        objectName={model.title}
        galleryPhotosAlbum={galleryPhotosAlbum}
        onOpenGalleryPhoto={onOpenGalleryPhoto}
        supportedUpdateTypes={supportedUpdateTypes}
        updateTypeCounts={model.updateTypeCounts}
        viewerUsername={viewerUsername}
        onRequireLogin={openLogin}
        tagApprovalStats={tagApprovalStats}
        statusUpdatesHref={statusUpdatesHref}
      />
    </LeftObjectProfileSidebar>
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

  const shellContextValue = useMemo(
    () => ({
      activePrimarySegment,
      activeGalleryAlbum,
      activeCategoryName,
      isEditMode,
      onOwnershipSubSelect,
      onFollowersSubSelect,
      onOpenGalleryAlbum,
      onBackToGalleryAlbums,
      onOpenGalleryPhoto,
      isNavigating,
    }),
    [
      activeCategoryName,
      activeGalleryAlbum,
      activePrimarySegment,
      isEditMode,
      isNavigating,
      onOwnershipSubSelect,
      onFollowersSubSelect,
      onBackToGalleryAlbums,
      onOpenGalleryAlbum,
      onOpenGalleryPhoto,
    ],
  );

  const hasNestedPath = Boolean(
    searchParams.get(OBJECT_PAGE_VIEW_PATH_PARAM)?.trim(),
  );

  const mobileLayout = useMemo(
    () =>
      resolveObjectMobileCenterLayout({
        objectTypeKey: model.objectTypeKey,
        activePrimarySegment,
        hasPath: hasNestedPath,
        isEditMode,
      }),
    [
      activePrimarySegment,
      hasNestedPath,
      isEditMode,
      model.objectTypeKey,
    ],
  );

  return (
    <ObjectPageShellProvider value={shellContextValue}>
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
            statusBadgeLabel={statusBadgeLabel}
            statusUpdatesHref={statusUpdatesHref}
            isEditMode={isEditMode}
            isFollowing={isFollowing}
            isBell={viewerBell}
            isFavorite={isFavorite}
            onToggleEdit={() => setEditMode((v) => !v)}
            onFollowToggle={onFollowToggle}
            onBellToggle={onBellToggle}
            onFavoriteToggle={onFavoriteToggle}
            primaryNav={primaryNav}
            galleryPhotosAlbum={galleryPhotosAlbum}
            onOpenGalleryPhoto={onOpenGalleryPhoto}
            editContext={
              isEditMode && viewerUsername
                ? {
                    objectId: model.objectId,
                    viewerUsername,
                    supportedUpdateTypes,
                  }
                : undefined
            }
          />
        }
        leftRail={leftRail}
        mobileLayout={mobileLayout}
        mobileSocialSlot={mobileSocialSlot}
        center={
          <div className="relative min-h-[12rem]">
            <div
              className={isNavigating ? 'pointer-events-none select-none' : undefined}
              aria-hidden={isNavigating ? true : undefined}
            >
              {children}
            </div>
            {isNavigating ? (
              <div
                className="absolute inset-0 z-30 bg-bg/60 pt-2"
                aria-busy="true"
                aria-live="polite"
              >
                <ObjectPageCenterSkeleton />
              </div>
            ) : null}
          </div>
        }
        rightRail={rightRail}
      />
      {galleryFullView ? (
        <ObjectGalleryViewer
          objectId={model.objectId}
          objectName={model.title}
          album={galleryFullView.album}
          allGalleryAlbums={model.galleryAlbums}
          onChainGalleryAlbumNames={model.onChainGalleryAlbumNames}
          initialIndex={galleryFullView.initialIndex}
          onClose={onCloseGalleryFullView}
          viewerUsername={viewerUsername}
          onRequireLogin={openLogin}
          supportedUpdateTypes={supportedUpdateTypes}
          updateTypeCounts={model.updateTypeCounts}
          isVirtualRelatedAlbum={galleryFullView.album.name === RELATED_ALBUM_NAME}
          isReadOnlyGallery={isPageContentVirtualGalleryAlbum(galleryFullView.album)}
        />
      ) : null}
    </ObjectPageShellProvider>
  );
}
