'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { GlobeIcon, LocateIcon, MaximizeIcon, MinimizeIcon } from '@/icons';
import {
  AppMap,
  AppMarker,
  AppPopup,
  MAP_EMBED_STACK_CLASS,
  MapFitBounds,
  MapInvalidateSizeOnMount,
  MapProvider,
  type MapBoundingBox,
  type MapPosition,
} from '@/modules/map';
import { OBJECT_MAP_MODAL_MIN_HEIGHT_PX } from '@/modules/object/presentation/constants/object-map-preview';
import type { SocialProjectedObjectView } from '@/modules/user-social/application/dto/user-social.dto';

import {
  DISCOVER_MAP_FEED_HEIGHT_CLASS,
  DISCOVER_MAP_INITIAL_FOCUS_COUNT,
  DISCOVER_MAP_LOCATE_ZOOM,
  DISCOVER_MAP_MARKERS_LIMIT,
  DISCOVER_MAP_RAIL_HEIGHT_CLASS,
  DISCOVER_MAP_VIEWPORT_DEBOUNCE_MS,
} from '../../constants/discover-map.constants';
import {
  discoverBoxToFitBoundsPositions,
  discoverBoxToMapBoundingBox,
  discoverBoxesEqual,
  extractDiscoverGeo,
  mapBoundingBoxToDiscoverBox,
  mapViewChangeToDiscoverMapView,
  resolveDiscoverMapCamera,
} from '../../domain/discover-map';
import type { DiscoverBox, DiscoverMapView } from '../../domain/discover-url';
import { fetchDiscoverObjects } from '../../infrastructure/discover.client';

const MAP_ZOOM_UI = { position: 'topright' as const, compact: true };
/** Second fit after Leaflet invalidateSize timeouts (50ms, 280ms). */
const FEED_MAP_REFIT_DELAY_MS = 320;
const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

const MAP_OVERLAY_BUTTON_CLASS =
  'pointer-events-auto flex size-9 cursor-pointer items-center justify-center rounded-btn border border-border bg-surface text-fg shadow-card hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60';

export type DiscoverMapPanelVariant = 'rail' | 'fullscreen' | 'feed';

export type DiscoverMapPanelProps = {
  objectType: string;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
  box: DiscoverBox | null;
  mapView: DiscoverMapView | null;
  variant?: DiscoverMapPanelVariant;
  onApplyArea: (box: DiscoverBox) => void;
  onViewChange?: (view: DiscoverMapView) => void;
  onExpand?: () => void;
  onMinimize?: () => void;
};

function objectDisplayName(fields: Record<string, unknown>): string {
  const name = fields.name;
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }
  const title = fields.title;
  if (typeof title === 'string' && title.trim().length > 0) {
    return title.trim();
  }
  return '';
}

export function DiscoverMapPanel({
  objectType,
  q,
  tags,
  sort,
  box,
  mapView,
  variant = 'rail',
  onApplyArea,
  onViewChange,
  onExpand,
  onMinimize,
}: DiscoverMapPanelProps) {
  const { t } = useI18n();
  const isFullscreen = variant === 'fullscreen';
  const isFeed = variant === 'feed';
  const isInteractiveMap = isFullscreen || isFeed;
  const [pendingBox, setPendingBox] = useState<MapBoundingBox | null>(
    box ? discoverBoxToMapBoundingBox(box) : null,
  );
  const latestViewportBoxRef = useRef<MapBoundingBox | null>(pendingBox);
  const [markerItems, setMarkerItems] = useState<SocialProjectedObjectView[]>([]);
  const [markersPending, startMarkersTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedFitRevision, setFeedFitRevision] = useState(0);

  const cameraMapView = isFeed ? null : mapView;
  const cameraBox = isFeed ? null : box;
  const initialCamera = useMemo(
    () => resolveDiscoverMapCamera(cameraMapView, cameraBox),
    [cameraMapView, cameraBox],
  );
  const [mapCenter, setMapCenter] = useState<MapPosition>(initialCamera.center);
  const [mapZoom, setMapZoom] = useState(initialCamera.zoom);
  const [userLocation, setUserLocation] = useState<MapPosition | null>(null);
  const previousCenterBeforeLocateRef = useRef<MapPosition | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);

  useEffect(() => {
    setMapCenter(initialCamera.center);
    setMapZoom(initialCamera.zoom);
    setUserLocation(null);
    previousCenterBeforeLocateRef.current = null;
    setLocateError(false);
  }, [initialCamera.center, initialCamera.zoom]);

  useEffect(() => {
    if (box) {
      const next = discoverBoxToMapBoundingBox(box);
      latestViewportBoxRef.current = next;
      setPendingBox(next);
    }
  }, [box]);

  const commitViewportBox = useCallback((viewportBox: MapBoundingBox) => {
    const normalized: MapBoundingBox = {
      topPoint: [viewportBox.topPoint[0], viewportBox.topPoint[1]] as const,
      bottomPoint: [viewportBox.bottomPoint[0], viewportBox.bottomPoint[1]] as const,
    };
    latestViewportBoxRef.current = normalized;

    if (isInteractiveMap) {
      setPendingBox(normalized);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setPendingBox(normalized);
    }, DISCOVER_MAP_VIEWPORT_DEBOUNCE_MS);
  }, [isInteractiveMap]);

  const canSearchArea = useMemo(() => {
    const viewportBox = latestViewportBoxRef.current ?? pendingBox;
    if (!viewportBox) {
      return false;
    }
    if (!box) {
      return true;
    }
    return !discoverBoxesEqual(mapBoundingBoxToDiscoverBox(viewportBox), box);
  }, [pendingBox, box]);

  useEffect(() => {
    startMarkersTransition(async () => {
      const page = await fetchDiscoverObjects({
        objectType,
        q: q || undefined,
        tags,
        sort,
        box: box ?? undefined,
        limit: DISCOVER_MAP_MARKERS_LIMIT,
      });
      if (page) {
        setMarkerItems(page.items);
      }
    });
  }, [objectType, q, tags, sort, box]);

  const onViewportChange = useCallback(
    (viewportBox: MapBoundingBox) => {
      commitViewportBox(viewportBox);
    },
    [commitViewportBox],
  );

  const handleViewChange = useCallback(
    (view: { center: MapPosition; zoom: number; box: MapBoundingBox }) => {
      commitViewportBox(view.box);
      onViewChange?.(mapViewChangeToDiscoverMapView(view));
    },
    [commitViewportBox, onViewChange],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const onSearchArea = () => {
    const viewportBox = latestViewportBoxRef.current ?? pendingBox;
    if (!viewportBox) {
      return;
    }
    onApplyArea(mapBoundingBoxToDiscoverBox(viewportBox));
  };

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError(true);
      return;
    }

    previousCenterBeforeLocateRef.current = mapCenter;
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location: MapPosition = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(location);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocateError(true);
      },
    );
  }, [mapCenter]);

  const markersWithGeo = useMemo(() => {
    const entries: {
      objectId: string;
      item: SocialProjectedObjectView;
      position: MapPosition;
      label: string;
    }[] = [];
    for (const item of markerItems) {
      const geo = extractDiscoverGeo(item.fields);
      if (!geo) {
        continue;
      }
      entries.push({
        objectId: item.object_id,
        item,
        position: [geo.latitude, geo.longitude],
        label: objectDisplayName(item.fields) || item.object_id,
      });
    }
    return entries;
  }, [markerItems]);

  const feedFocusKey = isFeed
    ? markersWithGeo
        .slice(0, DISCOVER_MAP_INITIAL_FOCUS_COUNT)
        .map((marker) => marker.objectId)
        .join('|')
    : '';

  const fitBoundsPositions = useMemo(() => {
    if (userLocation) {
      if (previousCenterBeforeLocateRef.current) {
        return [previousCenterBeforeLocateRef.current, userLocation] as const;
      }
      return null;
    }
    if (isFeed) {
      const topMarkers = markersWithGeo.slice(0, DISCOVER_MAP_INITIAL_FOCUS_COUNT);
      const positions = topMarkers.map((marker) => marker.position);
      return positions.length >= 2 ? positions : null;
    }
    if (initialCamera.fitBox) {
      return discoverBoxToFitBoundsPositions(initialCamera.fitBox);
    }
    if (mapView != null || box != null) {
      return null;
    }
    const topMarkers = markersWithGeo.slice(0, DISCOVER_MAP_INITIAL_FOCUS_COUNT);
    const positions = topMarkers.map((marker) => marker.position);
    return positions.length >= 2 ? positions : null;
  }, [isFeed, initialCamera.fitBox, mapView, box, markersWithGeo, userLocation]);

  useEffect(() => {
    if (!isFeed || feedFocusKey.length === 0) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFeedFitRevision((revision) => revision + 1);
    }, FEED_MAP_REFIT_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isFeed, feedFocusKey]);

  useEffect(() => {
    if (userLocation && !previousCenterBeforeLocateRef.current) {
      setMapCenter(userLocation);
      setMapZoom(DISCOVER_MAP_LOCATE_ZOOM);
    }
  }, [userLocation]);

  useEffect(() => {
    const focusSingleMarker =
      markersWithGeo.length === 1 &&
      !userLocation &&
      (isFeed || (mapView == null && box == null));
    if (focusSingleMarker) {
      setMapCenter(markersWithGeo[0]!.position);
      setMapZoom(DISCOVER_MAP_LOCATE_ZOOM);
    }
  }, [isFeed, mapView, box, userLocation, markersWithGeo]);

  const mapSurfaceClassName = isFullscreen
    ? 'size-full rounded-btn border border-border'
    : isFeed
      ? 'size-full border-0'
      : 'h-full w-full rounded-btn border border-border';

  const locateControl = (
    <>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1100]">
        <button
          type="button"
          aria-label="Show my location"
          onClick={handleLocate}
          disabled={locating}
          className={MAP_OVERLAY_BUTTON_CLASS}
        >
          <LocateIcon size={18} className="text-fg-secondary" />
        </button>
      </div>
      {locateError ? (
        <p className="pointer-events-none absolute bottom-14 left-3 z-[1100] rounded-btn border border-border bg-surface px-2 py-1 text-caption text-error shadow-card">
          Location unavailable
        </p>
      ) : null}
    </>
  );

  const showEmptyState = box != null && !markersPending && markersWithGeo.length === 0;

  const searchAreaButton = (
    <button
      type="button"
      className={`rounded-pill border border-border bg-surface px-2.5 py-0.5 text-caption font-weight-label text-fg-secondary shadow-card enabled:text-fg enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50${isInteractiveMap ? ' pointer-events-auto' : ''}`}
      disabled={!canSearchArea}
      onClick={onSearchArea}
    >
      {t('discover_search_area')}
    </button>
  );

  const mapStackClassName = isFullscreen
    ? `${MAP_EMBED_STACK_CLASS} min-h-0 flex-1`
    : isFeed
      ? `${MAP_EMBED_STACK_CLASS} ${DISCOVER_MAP_FEED_HEIGHT_CLASS}`
      : `${MAP_EMBED_STACK_CLASS} ${DISCOVER_MAP_RAIL_HEIGHT_CLASS}`;

  const mapContent = (
    <div className={`relative ${mapStackClassName}`}>
      <MapProvider>
        <AppMap
          center={mapCenter}
          zoom={mapZoom}
          className={mapSurfaceClassName}
          style={
            isFullscreen
              ? { minHeight: OBJECT_MAP_MODAL_MIN_HEIGHT_PX, width: '100%' }
              : isFeed
                ? { width: '100%', height: '100%' }
                : undefined
          }
          showBuiltInAttribution={false}
          zoomUi={MAP_ZOOM_UI}
          onViewportChange={onViewportChange}
          onViewChange={onViewChange ? handleViewChange : undefined}
        >
          {isInteractiveMap ? <MapInvalidateSizeOnMount /> : null}
          {fitBoundsPositions ? (
            <MapFitBounds
              key={isFeed ? feedFitRevision : 'fit'}
              positions={fitBoundsPositions}
            />
          ) : null}
          {userLocation ? (
            <AppMarker position={userLocation} variant="user-location">
              <span className="sr-only">Your location</span>
            </AppMarker>
          ) : null}
          {markersWithGeo.map((marker) => (
            <AppMarker key={marker.objectId} position={marker.position}>
              <AppPopup className="map-object-popup" maxWidth={240}>
                <Link
                  href={`/object/${encodeURIComponent(marker.objectId)}`}
                  className="text-body-sm font-weight-label text-accent hover:underline"
                >
                  {marker.label}
                </Link>
              </AppPopup>
            </AppMarker>
          ))}
        </AppMap>
      </MapProvider>

      {locateControl}

      {isInteractiveMap ? (
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-[1100]">{searchAreaButton}</div>
          {isFullscreen && onMinimize ? (
            <div className="pointer-events-none absolute bottom-3 right-3 z-[1100]">
              <button
                type="button"
                aria-label="Close fullscreen map"
                onClick={onMinimize}
                className={MAP_OVERLAY_BUTTON_CLASS}
              >
                <MinimizeIcon size={18} className="text-fg-secondary" />
              </button>
            </div>
          ) : null}
          {isFeed && onExpand ? (
            <div className="pointer-events-none absolute bottom-3 right-3 z-[1100]">
              <button
                type="button"
                aria-label={t('discover_map_expand')}
                onClick={onExpand}
                className={MAP_OVERLAY_BUTTON_CLASS}
              >
                <MaximizeIcon size={18} className="text-fg-secondary" />
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {markersPending && !isInteractiveMap ? (
        <span className="pointer-events-none absolute left-3 top-3 rounded-btn bg-surface/90 px-2 py-1 text-body-xs text-muted shadow-card">
          …
        </span>
      ) : null}
      {showEmptyState ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 z-[400] px-3 text-center text-body-xs text-muted">
          {t('discover_map_no_results')}
        </p>
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
  );

  if (isFullscreen) {
    return <div className="flex h-full min-h-0 flex-1 flex-col">{mapContent}</div>;
  }

  if (isFeed) {
    return (
      <div className="overflow-hidden rounded-card border border-border">{mapContent}</div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-border px-gutter py-2">
        <div className="inline-flex min-w-0 items-center gap-1.5 text-body-sm font-weight-label text-fg">
          <GlobeIcon size={16} className="shrink-0 text-fg-secondary" />
          <span>{t('discover_map')}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {searchAreaButton}
          {onExpand ? (
            <button
              type="button"
              className="rounded-btn p-1 text-fg-secondary hover:bg-ghost-surface hover:text-fg"
              aria-label={t('discover_map_expand')}
              onClick={onExpand}
            >
              <MaximizeIcon size={16} />
            </button>
          ) : null}
        </div>
      </div>
      {mapContent}
    </div>
  );
}
