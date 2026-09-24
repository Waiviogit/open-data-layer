import type { MapPosition } from '@/modules/map';

/** Max markers on the discover map (must not exceed query-api DISCOVER_OBJECTS_MAX_LIMIT). */
export const DISCOVER_MAP_MARKERS_LIMIT = 50;

export const DISCOVER_MAP_VIEWPORT_DEBOUNCE_MS = 300;

export const DISCOVER_MAP_DEFAULT_CENTER: MapPosition = [20, 0];
export const DISCOVER_MAP_DEFAULT_ZOOM = 2;

export const DISCOVER_MAP_RAIL_HEIGHT_CLASS = 'h-48';

/** Small inset so a search box fills the rail instead of the 48px map padding. */
export const DISCOVER_MAP_RAIL_FIT_PADDING_PX = 12;

/** How many leading geo listings frame the mobile map on open. */
export const DISCOVER_MAP_INITIAL_FOCUS_COUNT = 10;

/**
 * Mobile feed map fills the space under the shell header and the discover
 * chrome (type, chips, List/Map tabs) without a fixed minimum that overflows the screen.
 */
export const DISCOVER_MAP_FEED_HEIGHT_CLASS =
  'h-[calc(100dvh-var(--shell-header-height,3.5rem)-14rem)]';

/** Zoom when centering on the viewer's geolocation (neighbourhood context). */
export const DISCOVER_MAP_LOCATE_ZOOM = 14;
