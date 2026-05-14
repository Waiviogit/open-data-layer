'use client';

import { useCallback, useMemo, useState } from 'react';

import type { ObjectPageViewModel } from '@/modules/object';
import {
  LeftObjectProfileSidebar,
  ObjectHero,
  ObjectLeftRailPanel,
  ObjectPrimaryContent,
  ObjectPrimaryNav,
  ObjectRightSidebar,
  ObjectViewShell,
} from '@/modules/object';

export type ObjectPageClientProps = {
  model: ObjectPageViewModel;
};

export function ObjectPageClient({ model }: ObjectPageClientProps) {
  const defaultPrimary = model.primaryTabs[0]?.segment ?? 'reviews';
  const defaultFeedSub = model.feedSubTabs[0]?.segment ?? 'posts';

  const [isEditMode, setEditMode] = useState(false);
  const [isFollowing, setFollowing] = useState(false);
  const [isFavorite, setFavorite] = useState(false);
  const [activePrimarySegment, setActivePrimarySegment] =
    useState(defaultPrimary);
  const [activeFeedSubSegment, setActiveFeedSubSegment] =
    useState(defaultFeedSub);

  const primaryNav = useMemo(
    () => (
      <ObjectPrimaryNav
        tabs={model.primaryTabs}
        activeSegment={activePrimarySegment}
        onSelect={setActivePrimarySegment}
      />
    ),
    [model.primaryTabs, activePrimarySegment],
  );

  const onFavoriteToggle = useCallback(() => {
    setFavorite((v) => !v);
  }, []);

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
          activePrimarySegment={activePrimarySegment}
          activeFeedSubSegment={activeFeedSubSegment}
          feedSubTabs={model.feedSubTabs}
          title={model.title}
          objectType={model.objectType}
          onFeedSubSelect={setActiveFeedSubSegment}
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
