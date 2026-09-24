'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  fetchFavoritesMapAction,
  loadMoreFavoritesMapAction,
} from '@/app/(app)/user-profile/[name]/map-feed.actions';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { ObjectCard } from '@/modules/feed/presentation';
import {
  AppMap,
  AppMarker,
  AppPopup,
  MAP_EMBED_STACK_CLASS,
  MapFitBounds,
  MapProvider,
  type MapPosition,
} from '@/modules/map';
import { FeedColumn } from '@/shared/presentation/layout';
import { useInfiniteScroll } from '@/shared/presentation';

import { useLoginModal } from '@/modules/auth';

import type { FavoritesMapPage, MapBoundingBox } from '../../domain/types/favorites-map';
import {
  MAP_LIST_PAGE_SIZE,
  MAP_MARKERS_LIMIT,
  MAP_RELOAD_DISTANCE_KM,
  boxCenter,
  extractObjectGeo,
  haversineDistanceKm,
  mapBoxesEqual,
} from '../../domain/types/favorites-map';
import { ProfileMapSidebarListSkeleton } from './profile-map-sidebar-list-skeleton';

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
const DEFAULT_MAP_CENTER: MapPosition = [20, 0];
const DEFAULT_MAP_ZOOM = 2;
const MAP_ZOOM_UI = { position: 'topright' as const, compact: true };
const VIEWPORT_DEBOUNCE_MS = 300;

const EMPTY_PAGE: FavoritesMapPage = { items: [], hasMore: false };

export type ProfileMapViewProps = {
  accountName: string;
  viewerUsername?: string | null;
};

export function ProfileMapView({ accountName, viewerUsername }: ProfileMapViewProps) {
  const { t } = useI18n();
  const { openLogin } = useLoginModal();
  const [listPage, setListPage] = useState<FavoritesMapPage>(EMPTY_PAGE);
  const [markerItems, setMarkerItems] = useState<FavoritesMapPage['items']>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showReload, setShowReload] = useState(false);
  const [listError, setListError] = useState(false);
  const [hasLoadedListOnce, setHasLoadedListOnce] = useState(false);
  const [currentBox, setCurrentBox] = useState<MapBoundingBox | null>(null);
  const [listPending, startListTransition] = useTransition();
  const [markersPending, startMarkersTransition] = useTransition();

  const lastFetchedBoxRef = useRef<MapBoundingBox | null>(null);
  const lastMarkersFetchBoxRef = useRef<MapBoundingBox | null>(null);
  const initialListLoadedRef = useRef(false);
  const awaitingFitBaselineRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = useCallback(
    (box: MapBoundingBox, skip = 0, append = false) => {
      startListTransition(async () => {
        const result =
          skip === 0
            ? await fetchFavoritesMapAction(accountName, box, 0, MAP_LIST_PAGE_SIZE)
            : await loadMoreFavoritesMapAction(accountName, box, skip, MAP_LIST_PAGE_SIZE);
        if (!result.ok) {
          if (!append) {
            setListError(true);
            setListPage(EMPTY_PAGE);
            setHasLoadedListOnce(true);
          }
          return;
        }
        setListError(false);
        const page = result.page;
        if (!append) {
          setHasLoadedListOnce(true);
        }
        setListPage((prev) => ({
          items: append ? [...prev.items, ...page.items] : page.items,
          hasMore: page.hasMore,
        }));
        lastFetchedBoxRef.current = box;
        setShowReload(false);
      });
    },
    [accountName],
  );

  const fetchMarkers = useCallback(
    (box: MapBoundingBox) => {
      startMarkersTransition(async () => {
        const result = await fetchFavoritesMapAction(accountName, box, 0, MAP_MARKERS_LIMIT);
        if (!result.ok) {
          return;
        }
        const page = result.page;
        if (page.items.length >= 2) {
          awaitingFitBaselineRef.current = true;
        }
        setMarkerItems((prev) => {
          if (
            prev.length === page.items.length &&
            prev.every((item, index) => item.object_id === page.items[index]?.object_id)
          ) {
            return prev;
          }
          return page.items;
        });
      });
    },
    [accountName],
  );

  const refreshMapFeed = useCallback(() => {
    if (!currentBox) {
      return;
    }
    fetchList(currentBox);
    fetchMarkers(currentBox);
  }, [currentBox, fetchList, fetchMarkers]);

  const onViewportChange = useCallback(
    (box: MapBoundingBox) => {
      const normalized: MapBoundingBox = {
        topPoint: [box.topPoint[0], box.topPoint[1]] as const,
        bottomPoint: [box.bottomPoint[0], box.bottomPoint[1]] as const,
      };

      setCurrentBox((prev) => (prev && mapBoxesEqual(prev, normalized) ? prev : normalized));

      if (awaitingFitBaselineRef.current) {
        lastFetchedBoxRef.current = normalized;
        setShowReload(false);
        awaitingFitBaselineRef.current = false;
      } else if (lastFetchedBoxRef.current) {
        const prev = boxCenter(lastFetchedBoxRef.current);
        const next = boxCenter(normalized);
        const distanceKm = haversineDistanceKm(
          prev.latitude,
          prev.longitude,
          next.latitude,
          next.longitude,
        );
        setShowReload(distanceKm > MAP_RELOAD_DISTANCE_KM);
      }

      if (
        lastMarkersFetchBoxRef.current &&
        mapBoxesEqual(lastMarkersFetchBoxRef.current, normalized)
      ) {
        return;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        if (
          lastMarkersFetchBoxRef.current &&
          mapBoxesEqual(lastMarkersFetchBoxRef.current, normalized)
        ) {
          return;
        }
        lastMarkersFetchBoxRef.current = normalized;
        fetchMarkers(normalized);
        if (!initialListLoadedRef.current) {
          initialListLoadedRef.current = true;
          fetchList(normalized);
        }
      }, VIEWPORT_DEBOUNCE_MS);
    },
    [fetchList, fetchMarkers],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const onReload = useCallback(() => {
    if (!currentBox) {
      return;
    }
    fetchList(currentBox);
  }, [currentBox, fetchList]);

  const onLoadMore = useCallback(() => {
    if (!currentBox || !listPage.hasMore || listPending) {
      return;
    }
    fetchList(currentBox, listPage.items.length, true);
  }, [currentBox, fetchList, listPage.hasMore, listPage.items.length, listPending]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: listPage.hasMore,
    isLoading: listPending,
    onLoadMore,
  });

  const markersWithGeo = useMemo(() => {
    const entries: { objectId: string; item: FavoritesMapPage['items'][number]; position: MapPosition }[] =
      [];
    for (const item of markerItems) {
      const geo = extractObjectGeo(item.fields);
      if (geo) {
        entries.push({
          objectId: item.object_id,
          item,
          position: [geo.latitude, geo.longitude],
        });
      }
    }
    return entries;
  }, [markerItems]);

  const fitBoundsPositions = useMemo(
    () => markersWithGeo.map((m) => m.position),
    [markersWithGeo],
  );

  const showListSkeleton =
    listPending || (!hasLoadedListOnce && listPage.items.length === 0 && !listError);
  const showListEmpty =
    hasLoadedListOnce && !listPending && listPage.items.length === 0 && !listError;

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-0 flex-col overflow-hidden lg:flex-row">
      <aside className="flex max-h-[40vh] min-h-0 shrink-0 flex-col overflow-hidden border-border lg:h-full lg:max-h-full lg:w-[38%] lg:max-w-xl lg:shrink-0 lg:border-r">
        {showReload ? (
          <div className="border-b border-border py-2 ps-gutter sm:ps-gutter-sm">
            <button
              type="button"
              className="text-body-sm font-weight-strong text-accent hover:underline"
              onClick={onReload}
              disabled={listPending}
            >
              {t('profile_map_reload')}
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto pb-card-padding pe-card-padding pt-card-padding">
          {listError ? (
            <p className="text-body-sm text-muted">{t('profile_map_load_error')}</p>
          ) : showListSkeleton ? (
            <ProfileMapSidebarListSkeleton />
          ) : showListEmpty ? (
            <p className="text-body-sm text-muted">{t('favorites_empty')}</p>
          ) : (
            <FeedColumn>
              <ul className="flex flex-col gap-card-padding">
                {listPage.items.map((o) => (
                  <ObjectCard
                    key={o.object_id}
                    object={o}
                    layout="mapSidebar"
                    viewerUsername={viewerUsername}
                    onRequireLogin={openLogin}
                    onMouseEnter={() => setHighlightedId(o.object_id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    onAdministrativeAuthorityChange={refreshMapFeed}
                  />
                ))}
              </ul>
              {listPage.hasMore ? (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <div ref={sentinelRef} aria-hidden className="h-px w-full" />
                  <button
                    type="button"
                    className="sr-only"
                    disabled={listPending}
                    onClick={onLoadMore}
                  >
                    {t('drafts_load_more')}
                  </button>
                </div>
              ) : null}
            </FeedColumn>
          )}
        </div>
        {showReload ? (
          <div className="border-t border-border py-2 ps-gutter lg:hidden sm:ps-gutter-sm">
            <button
              type="button"
              className="text-body-sm font-weight-strong text-accent hover:underline"
              onClick={onReload}
              disabled={listPending}
            >
              {t('profile_map_reload')}
            </button>
          </div>
        ) : null}
      </aside>

      <div className={`relative h-full min-h-0 flex-1 max-lg:min-h-[240px] ${MAP_EMBED_STACK_CLASS}`}>
        <MapProvider>
          <AppMap
            center={DEFAULT_MAP_CENTER}
            zoom={DEFAULT_MAP_ZOOM}
            className="h-full w-full"
            showBuiltInAttribution={false}
            zoomUi={MAP_ZOOM_UI}
            onViewportChange={onViewportChange}
          >
            {fitBoundsPositions.length >= 2 ? (
              <MapFitBounds positions={fitBoundsPositions} />
            ) : null}
            {markersWithGeo.map((marker) => (
              <AppMarker
                key={marker.objectId}
                position={marker.position}
                highlighted={highlightedId === marker.objectId}
                dimmed={highlightedId != null && highlightedId !== marker.objectId}
                onClick={() => setHighlightedId(marker.objectId)}
              >
                <AppPopup className="map-object-popup">
                  <ObjectCard object={marker.item} layout="popup" as="div" />
                </AppPopup>
              </AppMarker>
            ))}
          </AppMap>
        </MapProvider>
        {markersPending ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-btn bg-surface/90 px-2 py-1 text-body-xs text-muted shadow-card">
            …
          </span>
        ) : null}
        <p className="pointer-events-none absolute bottom-2 right-2 z-[400] text-[10px] text-muted">
          <a
            href={OSM_COPYRIGHT_URL}
            className="pointer-events-auto underline"
            target="_blank"
            rel="noopener noreferrer"
            suppressHydrationWarning
          >
            © OpenStreetMap
          </a>
        </p>
      </div>
    </div>
  );
}
