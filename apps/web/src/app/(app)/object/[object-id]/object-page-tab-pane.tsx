'use client';

import type { ReactNode } from 'react';
import { useMemo, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import type {
  FollowersSubType,
  ObjectNestedViewResolved,
  ObjectPageViewModel,
  OwnershipSubType,
  ReviewsFeedSubType,
} from '@/modules/object/domain/object-page.types';
import { REVIEWS_FEED_SUB_VALUES } from '@/modules/object/domain/object-page.types';
import type { RelatedAlbumListView, RelatedAlbumPreviewView } from '@/modules/object/domain/related-album.types';
import {
  ObjectFollowersSubNav,
  ObjectOwnershipSubNav,
  ObjectPrimaryContent,
  ObjectRefListFeed,
} from '@/modules/object';
import { ObjectCategoryObjectsFeed } from '@/modules/object/presentation/components/object-category-objects-feed';
import { ObjectFieldReferencesListFeed } from '@/modules/object/presentation/components/object-field-references-list-feed';
import type { ObjectRefListPageView } from '@/modules/object/infrastructure/object-ref-list.client';
import type { ObjectFieldReferencesPageView } from '@/modules/object/infrastructure/object-field-references.client';
import type { CategoryObjectsPageView } from '@/modules/object/infrastructure/category-objects.client';
import { OwnershipActionButton } from '@/modules/object/presentation/components/ownership-action-button';
import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';
import type { PaginatedObjectExpertListView } from '@/modules/object/domain/types/object-experts';
import { ObjectExpertsAccountList } from '@/modules/object/presentation/components/object-experts-account-list';
import { UserSocialAccountList } from '@/modules/user-social/presentation/components/user-social-account-list';
import { useLoginModal } from '@/modules/auth';

import { loadMoreObjectOwnershipAction } from './ownership/object-ownership.actions';
import { loadMoreObjectFavoritedByAction } from './followers/object-favorited-by.actions';
import { loadMoreObjectExpertsAction } from './experts/object-experts.actions';
import { loadMoreObjectFollowersAction } from './followers/object-followers.actions';
import { loadMoreObjectRefListAction } from './related/load-more-ref-list.actions';
import { loadMoreObjectFieldReferencesAction } from './field-references/load-more-field-references.actions';
import { loadMoreCategoryObjectsAction } from './category/load-more-category-objects.actions';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';
import { useObjectPageShell } from './object-page-shell-context';
import { resolveCategoryNameForObjectPage, resolveFieldReferenceTypeForObjectPage, resolveReviewsFeedSubFromObjectUrl } from './object-page-search';
import { buildObjectReviewsSubHref } from './object-page-navigation';
import { useInstantNavigation } from '@/shared/presentation';
import {
  isAllowedFieldReferenceObjectType,
  isFieldReferenceSourceType,
} from '@/modules/object/domain/field-reference-rules';
import { resolveHostPageContent } from '@/modules/object/domain/resolve-host-page-content';
import { resolveGalleryPhotosAlbum } from '@/modules/object/domain/resolve-gallery-photos-album';

export type ObjectPageTabPaneProps = {
  model: ObjectPageViewModel;
  embeddedFollowersPage: PaginatedUserFollowListView | null;
  embeddedFavoritedByPage: PaginatedUserFollowListView | null;
  embeddedExpertsPage: PaginatedObjectExpertListView | null;
  followersSubType: FollowersSubType;
  followersSort: UserSubscriptionSort;
  embeddedOwnershipPage: PaginatedUserFollowListView | null;
  ownershipSubType: OwnershipSubType;
  ownershipSort: UserSubscriptionSort;
  embeddedRelatedPage: ObjectRefListPageView | null;
  embeddedSimilarPage: ObjectRefListPageView | null;
  embeddedAddOnPage: ObjectRefListPageView | null;
  embeddedCategoryPage: CategoryObjectsPageView | null;
  embeddedFieldReferencesPage: ObjectFieldReferencesPageView | null;
  activeCategoryName: string | null;
  activeFieldReferenceType: string | null;
  viewerUsername: string | null;
  relatedAlbumPreview?: RelatedAlbumPreviewView | null;
  relatedAlbumInitialPage?: RelatedAlbumListView | null;
  initialNestedStack: ObjectNestedViewResolved[];
  defaultNestedContent: ObjectNestedViewResolved | null;
  updatesFeedSlot?: ReactNode;
  postsFeedSlot?: ReactNode;
  threadsFeedSlot?: ReactNode;
  activityFeedSlot?: ReactNode;
};

export function ObjectPageTabPane({
  model,
  embeddedFollowersPage,
  embeddedFavoritedByPage,
  embeddedExpertsPage,
  followersSubType,
  followersSort,
  embeddedOwnershipPage,
  ownershipSubType,
  ownershipSort,
  embeddedRelatedPage,
  embeddedSimilarPage,
  embeddedAddOnPage,
  embeddedCategoryPage,
  embeddedFieldReferencesPage,
  activeCategoryName,
  activeFieldReferenceType,
  viewerUsername,
  relatedAlbumPreview = null,
  relatedAlbumInitialPage = null,
  initialNestedStack,
  defaultNestedContent,
  updatesFeedSlot = null,
  postsFeedSlot = null,
  threadsFeedSlot = null,
  activityFeedSlot = null,
}: ObjectPageTabPaneProps) {
  const {
    activePrimarySegment,
    activeGalleryAlbum,
    onOwnershipSubSelect,
    onFollowersSubSelect,
    onOpenGalleryAlbum,
    onBackToGalleryAlbums,
    onOpenGalleryPhoto,
    isEditMode,
  } = useObjectPageShell();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigateInstant } = useInstantNavigation();
  const categoryNameFromUrl = useMemo(
    () => resolveCategoryNameForObjectPage(model.objectId, pathname, searchParams),
    [model.objectId, pathname, searchParams],
  );
  const effectiveCategoryName = activeCategoryName ?? categoryNameFromUrl;
  const fieldReferenceTypeFromUrl = useMemo(
    () => resolveFieldReferenceTypeForObjectPage(model.objectId, pathname, searchParams),
    [model.objectId, pathname, searchParams],
  );
  const effectiveFieldReferenceType =
    activeFieldReferenceType ?? fieldReferenceTypeFromUrl;
  const activeFeedSubSegment = useMemo(
    () => resolveReviewsFeedSubFromObjectUrl(model.objectId, pathname, searchParams),
    [model.objectId, pathname, searchParams],
  );
  const onFeedSubSelect = useCallback(
    (segment: string) => {
      if (!REVIEWS_FEED_SUB_VALUES.includes(segment as ReviewsFeedSubType)) {
        return;
      }
      const href = buildObjectReviewsSubHref(
        model.objectId,
        new URLSearchParams(searchParams.toString()),
        segment as ReviewsFeedSubType,
      );
      navigateInstant({ href, method: 'replace', scroll: false });
    },
    [model.objectId, navigateInstant, searchParams],
  );
  const { openLogin } = useLoginModal();

  const supportedUpdateTypes = useMemo(() => {
    const registryEntry =
      OBJECT_TYPE_REGISTRY[model.objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
    return registryEntry?.supported_updates ?? [];
  }, [model.objectTypeKey]);

  const followersTabCount =
    model.primaryTabs.find((tab) => tab.segment === 'followers')?.count ?? 0;

  const objectFollowersFeed = useMemo(() => {
    const page =
      followersSubType === 'favorited' ? embeddedFavoritedByPage : embeddedFollowersPage;
    if (page == null) {
      return null;
    }
    const loadMoreAction =
      followersSubType === 'favorited'
        ? loadMoreObjectFavoritedByAction
        : loadMoreObjectFollowersAction;
    const listKind = followersSubType === 'favorited' ? 'favorited_by' : 'followers';
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-card border border-border bg-bg px-card-padding pt-2">
          <ObjectFollowersSubNav
            followedByCount={followersTabCount}
            favoritedByCount={model.favoritedByCount}
            activeSub={followersSubType}
            onSelect={onFollowersSubSelect}
          />
        </div>
        <UserSocialAccountList
          key={`${model.objectId}-${followersSubType}-${followersSort}`}
          profileAccountName={model.objectId}
          listKind={listKind}
          initialPage={page}
          sort={followersSort}
          currentUsername={viewerUsername}
          loadMoreAction={loadMoreAction}
          onBroadcastRevalidate={revalidateObjectAfterBroadcast}
        />
      </div>
    );
  }, [
    embeddedFavoritedByPage,
    embeddedFollowersPage,
    followersSort,
    followersSubType,
    followersTabCount,
    model.favoritedByCount,
    model.objectId,
    onFollowersSubSelect,
    viewerUsername,
  ]);

  const objectExpertsFeed = useMemo(() => {
    if (embeddedExpertsPage == null) {
      return null;
    }
    return (
      <ObjectExpertsAccountList
        key={model.objectId}
        objectId={model.objectId}
        initialPage={embeddedExpertsPage}
        currentUsername={viewerUsername}
        loadMoreAction={loadMoreObjectExpertsAction}
        onBroadcastRevalidate={revalidateObjectAfterBroadcast}
      />
    );
  }, [embeddedExpertsPage, model.objectId, viewerUsername]);

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

  const objectCategoryFeed = useMemo(() => {
    if (effectiveCategoryName == null) {
      return null;
    }
    const page = embeddedCategoryPage ?? {
      items: [],
      hasMore: false,
      cursor: null,
    };
    return (
      <ObjectCategoryObjectsFeed
        key={`${model.objectId}-category-${effectiveCategoryName}`}
        objectId={model.objectId}
        categoryName={effectiveCategoryName}
        initialItems={page.items}
        initialCursor={page.cursor}
        initialHasMore={page.hasMore}
        viewerUsername={viewerUsername}
        onRequireLogin={openLogin}
        loadMoreAction={loadMoreCategoryObjectsAction}
      />
    );
  }, [
    effectiveCategoryName,
    embeddedCategoryPage,
    model.objectId,
    openLogin,
    viewerUsername,
  ]);

  const objectFieldReferencesFeed = useMemo(() => {
    if (effectiveFieldReferenceType == null) {
      return null;
    }
    if (
      !isFieldReferenceSourceType(model.objectTypeKey) ||
      !isAllowedFieldReferenceObjectType(model.objectTypeKey, effectiveFieldReferenceType)
    ) {
      return null;
    }
    if (embeddedFieldReferencesPage == null) {
      return null;
    }
    return (
      <ObjectFieldReferencesListFeed
        key={`${model.objectId}-field-references-${effectiveFieldReferenceType}`}
        objectId={model.objectId}
        referenceObjectType={effectiveFieldReferenceType}
        initialItems={embeddedFieldReferencesPage.items}
        initialCursor={embeddedFieldReferencesPage.cursor}
        initialHasMore={embeddedFieldReferencesPage.hasMore}
        viewerUsername={viewerUsername}
        onRequireLogin={openLogin}
        loadMoreAction={loadMoreObjectFieldReferencesAction}
      />
    );
  }, [
    effectiveFieldReferenceType,
    embeddedFieldReferencesPage,
    model.objectId,
    model.objectTypeKey,
    openLogin,
    viewerUsername,
  ]);

  const loadMoreObjectOwnership = useMemo(
    () => (profileAccountName: string, sort: UserSubscriptionSort, skip: number) =>
      loadMoreObjectOwnershipAction(profileAccountName, ownershipSubType, sort, skip),
    [ownershipSubType],
  );

  const objectOwnershipFeed = useMemo(() => {
    if (embeddedOwnershipPage == null) {
      return null;
    }
    const viewerHasThisOwnership =
      ownershipSubType === 'supervised'
        ? model.hasSupervisedOwnership
        : model.hasExclusiveOwnership;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-card border border-border bg-bg px-card-padding pt-2">
          <ObjectOwnershipSubNav
            supervisedCount={model.supervisedOwnershipCount}
            exclusiveCount={model.exclusiveOwnershipCount}
            activeSub={ownershipSubType}
            onSelect={onOwnershipSubSelect}
          />
        </div>
        <OwnershipActionButton
          objectId={model.objectId}
          ownershipType={ownershipSubType}
          hasOwnership={viewerHasThisOwnership}
          viewerUsername={viewerUsername}
          onRequireLogin={openLogin}
        />
        <UserSocialAccountList
          key={`${model.objectId}-${ownershipSubType}-${ownershipSort}`}
          profileAccountName={model.objectId}
          listKind={
            ownershipSubType === 'supervised'
              ? 'ownership_supervised'
              : 'ownership_exclusive'
          }
          initialPage={embeddedOwnershipPage}
          sort={ownershipSort}
          currentUsername={viewerUsername}
          loadMoreAction={loadMoreObjectOwnership}
          onBroadcastRevalidate={revalidateObjectAfterBroadcast}
        />
      </div>
    );
  }, [
    ownershipSort,
    ownershipSubType,
    embeddedOwnershipPage,
    loadMoreObjectOwnership,
    model.exclusiveOwnershipCount,
    model.hasExclusiveOwnership,
    model.hasSupervisedOwnership,
    model.objectId,
    model.supervisedOwnershipCount,
    onOwnershipSubSelect,
    openLogin,
    viewerUsername,
  ]);

  const menuRootName =
    model.objectTypeKey === 'list' ? model.title : (defaultNestedContent?.name ?? null);

  const hostPageContent = useMemo(
    () => resolveHostPageContent(model),
    [model.objectType, model.objectTypeKey, model.pageContent, model.legalText],
  );

  const galleryPhotosAlbum = useMemo(
    () => resolveGalleryPhotosAlbum(model.galleryAlbums, model.previewGallery),
    [model.galleryAlbums, model.previewGallery],
  );

  return (
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
      menuRootName={menuRootName}
      onFeedSubSelect={onFeedSubSelect}
      objectUpdatesFeed={updatesFeedSlot}
      objectPostsFeed={postsFeedSlot}
      objectThreadsFeed={threadsFeedSlot}
      objectActivityFeed={activityFeedSlot}
      objectFollowersFeed={objectFollowersFeed}
      objectExpertsFeed={objectExpertsFeed}
      objectOwnershipFeed={objectOwnershipFeed}
      objectRelatedFeed={objectRelatedFeed}
      objectSimilarFeed={objectSimilarFeed}
      objectAddOnFeed={objectAddOnFeed}
      objectCategoryFeed={objectCategoryFeed}
      objectFieldReferencesFeed={objectFieldReferencesFeed}
      hostPageContent={hostPageContent}
      hostWidgetConfig={model.widgetConfig}
      descriptionContent={model.descriptionContent}
      previewGallery={model.previewGallery}
      galleryPhotosAlbum={galleryPhotosAlbum}
      galleryAlbums={model.galleryAlbums}
      onChainGalleryAlbumNames={model.onChainGalleryAlbumNames}
      activeGalleryAlbum={activeGalleryAlbum}
      onOpenGalleryAlbum={onOpenGalleryAlbum}
      onBackToGalleryAlbums={onBackToGalleryAlbums}
      onOpenGalleryPhoto={onOpenGalleryPhoto}
      supportedUpdateTypes={supportedUpdateTypes}
      updateTypeCounts={model.updateTypeCounts}
      viewerUsername={viewerUsername}
      onRequireLogin={openLogin}
      objectTypeKey={model.objectTypeKey}
      relatedAlbumPreview={relatedAlbumPreview}
      relatedAlbumInitialPage={relatedAlbumInitialPage}
      isEditMode={isEditMode}
    />
  );
}
