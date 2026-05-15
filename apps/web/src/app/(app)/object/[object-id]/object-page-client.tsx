'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ObjectPageViewModel, AuthoritySubType } from '@/modules/object';
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
import type { ObjectEmbeddedUpdatesFeedModel } from '@/modules/object-updates/embedded-updates-feed.model';
import { ObjectUpdatesFeed } from '@/modules/object-updates/presentation/components/object-updates-feed';
import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';
import { UserSocialAccountList } from '@/modules/user-social/presentation/components/user-social-account-list';

import { loadMoreObjectAuthorityAction } from './authority/object-authority.actions';
import { loadMoreObjectFollowersAction } from './followers/object-followers.actions';
import {
  OBJECT_PAGE_AUTHORITY_SUB_PARAM,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
} from './object-page-search';
import { loadMoreObjectUpdatesFeedAction } from './updates/updates-feed.actions';

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
}: ObjectPageClientProps) {
  const defaultFeedSub = model.feedSubTabs[0]?.segment ?? 'posts';

  const router = useRouter();
  const searchParams = useSearchParams();

  const [isEditMode, setEditMode] = useState(false);
  const [isFollowing, setFollowing] = useState(false);
  const [isFavorite, setFavorite] = useState(false);
  const [activePrimarySegment, setActivePrimarySegment] =
    useState(initialPrimarySegment);
  const [activeFeedSubSegment, setActiveFeedSubSegment] =
    useState(defaultFeedSub);

  useEffect(() => {
    setActivePrimarySegment(initialPrimarySegment);
  }, [initialPrimarySegment]);

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

  const onFavoriteToggle = useCallback(() => {
    setFavorite((v) => !v);
  }, []);

  const updatesFeedKey = [
    embeddedUpdatesFeed.filters.sort,
    embeddedUpdatesFeed.filters.update_type ?? '',
    embeddedUpdatesFeed.filters.locale ?? '',
  ].join('|');

  const objectUpdatesFeed = useMemo(
    () => (
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
      />
    ),
    [embeddedUpdatesFeed, model.objectId, updatesFeedKey],
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
        />
      </div>
    );
  }, [
    embeddedAuthorityPage,
    authoritySubType,
    authoritySort,
    model.administrativeAuthorityCount,
    model.objectId,
    model.ownershipAuthorityCount,
    onAuthoritySubSelect,
    viewerUsername,
    loadMoreObjectAuthority,
  ]);

  const leftRail = (
    <LeftObjectProfileSidebar>
      <ObjectLeftRailPanel blocks={model.leftRailBlocks} />
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
          isFavorite={isFavorite}
          onToggleEdit={() => setEditMode((v) => !v)}
          onFollowToggle={() => setFollowing((v) => !v)}
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
          onFeedSubSelect={setActiveFeedSubSegment}
          objectUpdatesFeed={objectUpdatesFeed}
          objectFollowersFeed={objectFollowersFeed}
          objectAuthorityFeed={objectAuthorityFeed}
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
