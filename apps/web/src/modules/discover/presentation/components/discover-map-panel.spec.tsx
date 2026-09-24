/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { LocaleId, Messages } from '@/i18n/types';
import { OBJECT_MAP_MODAL_MIN_HEIGHT_PX } from '@/modules/object/presentation/constants/object-map-preview';

import { DiscoverMapPanel } from './discover-map-panel';

const fetchDiscoverObjects = jest.fn();
let latestOnViewportChange: ((box: {
  topPoint: readonly [number, number];
  bottomPoint: readonly [number, number];
}) => void) | undefined;
let latestOnViewChange:
  | ((view: {
      center: readonly [number, number];
      zoom: number;
      box: {
        topPoint: readonly [number, number];
        bottomPoint: readonly [number, number];
      };
    }) => void)
  | undefined;
let latestMapProps: {
  center?: readonly [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  onViewChange?: unknown;
  children?: React.ReactNode;
} = {};

jest.mock('../../infrastructure/discover.client', () => ({
  fetchDiscoverObjects: (...args: unknown[]) => fetchDiscoverObjects(...args),
}));

jest.mock('@/shared/presentation', () => ({
  AVATAR_PLACEHOLDER_SRC: '/avatar-placeholder.png',
  ObjectThumbnail: () => null,
  shouldUnoptimizeRemoteImage: () => false,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/modules/object/presentation/components/star-rating', () => ({
  StarRating: () => <div data-testid="star-rating" />,
}));

jest.mock('@/modules/object/presentation/components/administrative-heart-button', () => ({
  AdministrativeHeartButton: () => null,
}));

jest.mock('@/modules/map', () => ({
  MAP_EMBED_STACK_CLASS: 'map-embed',
  AppMap: ({
    onViewportChange,
    onViewChange,
    center,
    zoom,
    style,
    children,
  }: {
    onViewportChange?: (box: {
      topPoint: readonly [number, number];
      bottomPoint: readonly [number, number];
    }) => void;
    onViewChange?: (view: {
      center: readonly [number, number];
      zoom: number;
      box: {
        topPoint: readonly [number, number];
        bottomPoint: readonly [number, number];
      };
    }) => void;
    center?: readonly [number, number];
    zoom?: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }) => {
    latestOnViewportChange = onViewportChange;
    latestOnViewChange = onViewChange;
    latestMapProps = { center, zoom, style, onViewChange, children };
    return (
      <div data-testid="mock-map">
        {children}
      </div>
    );
  },
  AppMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AppPopup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MapFitBounds: ({
    positions,
    paddingPx,
  }: {
    positions: readonly unknown[];
    paddingPx?: number;
  }) => (
    <div
      data-testid="map-fit-bounds"
      data-positions={JSON.stringify(positions)}
      data-padding={paddingPx ?? ''}
    />
  ),
  MapInvalidateSizeOnMount: () => <div data-testid="map-invalidate-size" />,
  MapProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const messages = {
  discover_map: 'Map',
  discover_search_area: 'Search area',
  discover_map_expand: 'Expand map',
  discover_map_no_results: 'No objects with a location in this area',
} as Messages;

const APPLIED_BOX = { swLng: -123.2, swLat: 49.1, neLng: -123.0, neLat: 49.3 };
const MAP_VIEW = { latitude: 49.2, longitude: -123.1, zoom: 12 };

function renderPanel(
  props: Partial<React.ComponentProps<typeof DiscoverMapPanel>> = {},
) {
  const onApplyArea = jest.fn();
  render(
    <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
      <DiscoverMapPanel
        objectType="restaurant"
        q=""
        tags={[]}
        sort="rank"
        box={null}
        mapView={null}
        onApplyArea={onApplyArea}
        {...props}
      />
    </I18nProvider>,
  );
  return { onApplyArea };
}

describe('DiscoverMapPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchDiscoverObjects.mockReset();
    fetchDiscoverObjects.mockResolvedValue({ items: [], cursor: null, hasMore: false });
    latestOnViewportChange = undefined;
    latestOnViewChange = undefined;
    latestMapProps = {};
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requests markers with the documented page size limit', async () => {
    renderPanel();
    await waitFor(() => {
      expect(fetchDiscoverObjects).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  it('keeps Search area disabled while viewport matches applied box', async () => {
    renderPanel({ box: APPLIED_BOX });

    latestOnViewportChange?.({
      topPoint: [-123.0, 49.3],
      bottomPoint: [-123.2, 49.1],
    });
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Search area' })).toBeDisabled();
    });
  });

  it('applies the current viewport as the new search area', async () => {
    const { onApplyArea } = renderPanel({ box: APPLIED_BOX });

    latestOnViewportChange?.({
      topPoint: [-122.5, 49.5],
      bottomPoint: [-123.5, 48.5],
    });
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Search area' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Search area' }));

    expect(onApplyArea).toHaveBeenCalledTimes(1);
    expect(onApplyArea).toHaveBeenCalledWith({
      swLng: -123.5,
      swLat: 48.5,
      neLng: -122.5,
      neLat: 49.5,
    });
  });

  it('does not refetch markers on viewport pan alone', async () => {
    renderPanel({ box: APPLIED_BOX });
    expect(fetchDiscoverObjects).toHaveBeenCalledTimes(1);

    latestOnViewportChange?.({
      topPoint: [-122.5, 49.5],
      bottomPoint: [-123.5, 48.5],
    });
    jest.advanceTimersByTime(300);

    expect(fetchDiscoverObjects).toHaveBeenCalledTimes(1);
  });

  it('refetches markers when applied box changes', async () => {
    const { rerender } = render(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <DiscoverMapPanel
          objectType="restaurant"
          q=""
          tags={[]}
          sort="rank"
          box={APPLIED_BOX}
          mapView={null}
          onApplyArea={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(fetchDiscoverObjects).toHaveBeenCalledTimes(1);

    rerender(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <DiscoverMapPanel
          objectType="restaurant"
          q=""
          tags={[]}
          sort="rank"
          box={{ swLng: -124, swLat: 48, neLng: -122, neLat: 50 }}
          mapView={null}
          onApplyArea={jest.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(fetchDiscoverObjects).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when boxed fetch returns no geo markers', async () => {
    fetchDiscoverObjects.mockResolvedValue({
      items: [
        {
          object_id: 'no-geo',
          object_type: 'restaurant',
          semantic_type: null,
          weight: 1,
          fields: { name: 'No Geo Place' },
          isFavorited: false,
          hasSupervisedOwnership: false,
          hasExclusiveOwnership: false,
        },
      ],
      cursor: null,
      hasMore: false,
    });

    renderPanel({ box: APPLIED_BOX });

    await waitFor(() => {
      expect(screen.getByText('No objects with a location in this area')).toBeInTheDocument();
    });
  });

  it('initializes AppMap from map URL camera', () => {
    renderPanel({ mapView: MAP_VIEW });
    expect(latestMapProps.center).toEqual([MAP_VIEW.latitude, MAP_VIEW.longitude]);
    expect(latestMapProps.zoom).toBe(MAP_VIEW.zoom);
  });

  it('forwards onViewChange from AppMap', () => {
    const onViewChange = jest.fn();
    renderPanel({ onViewChange });

    latestOnViewChange?.({
      center: [49.2, -123.1],
      zoom: 12,
      box: {
        topPoint: [-123.0, 49.3],
        bottomPoint: [-123.2, 49.1],
      },
    });

    expect(onViewChange).toHaveBeenCalledWith({
      latitude: 49.2,
      longitude: -123.1,
      zoom: 12,
    });
  });

  it('fullscreen variant mounts MapInvalidateSizeOnMount and minHeight', () => {
    renderPanel({ variant: 'fullscreen' });
    expect(screen.getByTestId('map-invalidate-size')).toBeInTheDocument();
    expect(latestMapProps.style).toEqual(
      expect.objectContaining({ minHeight: OBJECT_MAP_MODAL_MIN_HEIGHT_PX }),
    );
  });

  it('centers the map on the viewer location and fits previous center when locate is clicked', async () => {
    const geolocation = {
      getCurrentPosition: jest.fn((success: PositionCallback) => {
        success({
          coords: {
            latitude: 49.28,
            longitude: -123.12,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      }),
    };
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: geolocation,
    });

    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Show my location' }));

    await waitFor(() => {
      const fitBounds = screen.getByTestId('map-fit-bounds');
      expect(fitBounds).toBeInTheDocument();
      const positions = JSON.parse(fitBounds.getAttribute('data-positions') ?? '[]');
      expect(positions).toEqual([
        [20, 0],
        [49.28, -123.12],
      ]);
    });
  });

  it('applies search area immediately in fullscreen without debounce delay', async () => {
    const onApplyArea = jest.fn();
    renderPanel({ variant: 'fullscreen', onApplyArea });

    latestOnViewportChange?.({
      topPoint: [-122.5, 49.5],
      bottomPoint: [-123.5, 48.5],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Search area' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Search area' }));

    expect(onApplyArea).toHaveBeenCalledWith({
      swLng: -123.5,
      swLat: 48.5,
      neLng: -122.5,
      neLat: 49.5,
    });
  });

  it('does not fit marker bounds on the rail when a stored camera is set', async () => {
    fetchDiscoverObjects.mockResolvedValue({
      items: [
        {
          object_id: 'r1',
          object_type: 'restaurant',
          semantic_type: null,
          weight: 10,
          fields: { name: 'R1', geo: { latitude: 49.2, longitude: -123.1 } },
          isFavorited: false,
          hasSupervisedOwnership: false,
          hasExclusiveOwnership: false,
        },
        {
          object_id: 'r2',
          object_type: 'restaurant',
          semantic_type: null,
          weight: 9,
          fields: { name: 'R2', geo: { latitude: 49.3, longitude: -123.2 } },
          isFavorited: false,
          hasSupervisedOwnership: false,
          hasExclusiveOwnership: false,
        },
      ],
      cursor: null,
      hasMore: false,
    });

    renderPanel({ mapView: MAP_VIEW });

    await waitFor(() => {
      expect(fetchDiscoverObjects).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('map-fit-bounds')).not.toBeInTheDocument();
  });

  it('fits the rail to the search box without replacing the camera afterwards', async () => {
    const { rerender } = render(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <DiscoverMapPanel
          objectType="restaurant"
          q=""
          tags={[]}
          sort="rank"
          box={null}
          mapView={MAP_VIEW}
          onApplyArea={jest.fn()}
        />
      </I18nProvider>,
    );
    expect(latestMapProps.zoom).toBe(MAP_VIEW.zoom);

    rerender(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <DiscoverMapPanel
          objectType="restaurant"
          q=""
          tags={[]}
          sort="rank"
          box={APPLIED_BOX}
          mapView={MAP_VIEW}
          onApplyArea={jest.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      const fitBounds = screen.getByTestId('map-fit-bounds');
      const positions = JSON.parse(fitBounds.getAttribute('data-positions') ?? '[]');
      expect(positions).toEqual([
        [APPLIED_BOX.swLat, APPLIED_BOX.swLng],
        [APPLIED_BOX.neLat, APPLIED_BOX.neLng],
      ]);
    });
    expect(screen.getByTestId('map-fit-bounds')).toHaveAttribute('data-padding', '12');
    expect(latestMapProps.zoom).toBe(MAP_VIEW.zoom);
    expect(latestMapProps.center).toEqual([MAP_VIEW.latitude, MAP_VIEW.longitude]);
  });

  it('fits the feed map to the first markers even when a camera is stored', async () => {
    fetchDiscoverObjects.mockResolvedValue({
      items: [
        {
          object_id: 'r1',
          object_type: 'restaurant',
          semantic_type: null,
          weight: 10,
          fields: { name: 'R1', geo: { latitude: 49.2, longitude: -123.1 } },
          isFavorited: false,
          hasSupervisedOwnership: false,
          hasExclusiveOwnership: false,
        },
        {
          object_id: 'r2',
          object_type: 'restaurant',
          semantic_type: null,
          weight: 9,
          fields: { name: 'R2', geo: { latitude: 49.3, longitude: -123.2 } },
          isFavorited: false,
          hasSupervisedOwnership: false,
          hasExclusiveOwnership: false,
        },
      ],
      cursor: null,
      hasMore: false,
    });

    renderPanel({ variant: 'feed', mapView: MAP_VIEW, box: APPLIED_BOX });

    await waitFor(() => {
      const fitBounds = screen.getByTestId('map-fit-bounds');
      const positions = JSON.parse(fitBounds.getAttribute('data-positions') ?? '[]');
      expect(positions).toEqual([
        [49.2, -123.1],
        [49.3, -123.2],
      ]);
    });
    expect(latestMapProps.center).toEqual([20, 0]);
    expect(latestMapProps.zoom).toBe(2);
  });

  it('fits bounds to the top 5-10 markers when no box or mapView is provided', async () => {
    fetchDiscoverObjects.mockResolvedValue({
      items: [
        {
          object_id: 'r1',
          object_type: 'restaurant',
          semantic_type: null,
          weight: 10,
          fields: { name: 'R1', geo: { latitude: 49.2, longitude: -123.1 } },
          isFavorited: false,
          hasSupervisedOwnership: false,
          hasExclusiveOwnership: false,
        },
        {
          object_id: 'r2',
          object_type: 'restaurant',
          semantic_type: null,
          weight: 9,
          fields: { name: 'R2', geo: { latitude: 49.3, longitude: -123.2 } },
          isFavorited: false,
          hasSupervisedOwnership: false,
          hasExclusiveOwnership: false,
        },
      ],
      cursor: null,
      hasMore: false,
    });

    renderPanel();

    await waitFor(() => {
      const fitBounds = screen.getByTestId('map-fit-bounds');
      expect(fitBounds).toBeInTheDocument();
      const positions = JSON.parse(fitBounds.getAttribute('data-positions') ?? '[]');
      expect(positions).toEqual([
        [49.2, -123.1],
        [49.3, -123.2],
      ]);
    });
    expect(screen.getByText('R1')).toBeInTheDocument();
  });
});
