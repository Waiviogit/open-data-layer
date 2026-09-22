'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { DiscoverBox, DiscoverMapView } from '../../domain/discover-url';
import { DiscoverActiveChips } from './discover-active-chips';
import { DiscoverMapPanel } from './discover-map-panel';
import {
  DiscoverMobileHeader,
  type DiscoverMobileTab,
} from './discover-mobile-header';
import { DiscoverObjectFeed } from './discover-object-feed';
import { DiscoverSortSelect } from './discover-sort-select';
import { DiscoverUserFeed } from './discover-user-feed';

export type DiscoverFeedProps = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
  box: DiscoverBox | null;
  map: DiscoverMapView | null;
  mapView: DiscoverMapView | null;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
  showFilters: boolean;
  showMap: boolean;
  mobileTab: DiscoverMobileTab;
  onMobileTabChange: (tab: DiscoverMobileTab) => void;
  onOpenTypeSheet: () => void;
  onOpenFilterSheet: () => void;
  onApplyMapArea: (box: DiscoverBox) => void;
  onMapViewChange?: (view: DiscoverMapView) => void;
  onExpandMap: () => void;
};

export function DiscoverFeed({
  usersMode,
  objectType,
  q,
  tags,
  sort,
  box,
  map,
  mapView,
  viewerUsername,
  onRequireLogin,
  showFilters,
  showMap,
  mobileTab,
  onMobileTabChange,
  onOpenTypeSheet,
  onOpenFilterSheet,
  onApplyMapArea,
  onMapViewChange,
  onExpandMap,
}: DiscoverFeedProps) {
  const { t } = useI18n();

  const mapObjectType =
    showMap && objectType && objectType !== 'all' ? objectType : null;

  const showMobileMap =
    mobileTab === 'map' && mapObjectType != null;

  return (
    <main className="min-w-0">
      <DiscoverMobileHeader
        usersMode={usersMode}
        objectType={objectType}
        q={q}
        tags={tags}
        sort={sort}
        box={box}
        map={map}
        showFilters={showFilters}
        showMap={showMap}
        mobileTab={mobileTab}
        onMobileTabChange={onMobileTabChange}
        onOpenTypeSheet={onOpenTypeSheet}
        onOpenFilterSheet={onOpenFilterSheet}
      />

      <div className="mb-4 hidden items-center justify-between gap-3 lg:flex">
        <h1 className="text-heading font-weight-label text-fg">{t('discover_page_title')}</h1>
        {!usersMode ? (
          <DiscoverSortSelect
            usersMode={usersMode}
            objectType={objectType}
            q={q}
            tags={tags}
            sort={sort}
            box={box}
            map={map}
          />
        ) : null}
      </div>

      <div className="hidden lg:block">
        <DiscoverActiveChips
          usersMode={usersMode}
          objectType={objectType}
          q={q}
          tags={tags}
          sort={sort}
          box={box}
          map={map}
        />
      </div>

      {usersMode ? (
        <DiscoverUserFeed q={q} />
      ) : objectType ? (
        <>
          {showMobileMap ? (
            <div className="lg:hidden">
              <DiscoverMapPanel
                variant="feed"
                objectType={mapObjectType}
                q={q}
                tags={tags}
                sort={sort}
                box={box}
                mapView={mapView}
                onApplyArea={onApplyMapArea}
                onViewChange={onMapViewChange}
                onExpand={onExpandMap}
              />
            </div>
          ) : null}
          <div className={showMobileMap ? 'hidden lg:block' : undefined}>
            <DiscoverObjectFeed
              objectType={objectType}
              q={q}
              tags={tags}
              sort={sort}
              box={box}
              viewerUsername={viewerUsername}
              onRequireLogin={onRequireLogin}
              hideType={objectType !== 'all'}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}
