'use client';

import { useEffect, useId, useState, type SVGProps } from 'react';
import { createPortal } from 'react-dom';

import {
  AppMap,
  AppMarker,
  MapInvalidateSizeOnMount,
  MapProvider,
} from '@/modules/map';

import {
  OBJECT_MAP_MODAL_MIN_HEIGHT_PX,
  OBJECT_MAP_PREVIEW_MIN_HEIGHT_PX,
  OBJECT_MAP_PREVIEW_ZOOM,
} from '../constants/object-map-preview';

export type ObjectGeoPreviewProps = {
  latitude: number;
  longitude: number;
  /** Accessible label for the marker / region. */
  label: string;
};

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

const OBJECT_GEO_ZOOM_UI = {
  position: 'topright' as const,
  compact: true,
};

function IconExpandLarge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <polyline points="15 10 21 10 21 16" />
      <polyline points="9 14 3 14 3 8" />
      <line x1="21" x2="14" y1="10" y2="3" />
      <line x1="14" x2="21" y1="21" y2="14" />
      <line x1="3" x2="10" y1="14" y2="21" />
      <line x1="10" x2="3" y1="3" y2="10" />
    </svg>
  );
}

function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

function OsmCreditLine(props: { className?: string }) {
  const { className } = props;
  return (
    <p className={className ?? 'mt-2 text-center text-caption text-muted'}>
      <a
        href={OSM_COPYRIGHT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-border underline-offset-2 hover:text-fg"
      >
        © OpenStreetMap contributors
      </a>
    </p>
  );
}

/** Leaflet-backed preview + fullscreen modal; client-only via maps module dynamic import. */
export function ObjectGeoPreview({ latitude, longitude, label }: ObjectGeoPreviewProps) {
  const center = [latitude, longitude] as const;
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return (): void => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return (): void => {
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  const modal =
    expanded && typeof document !== 'undefined' ? (
      createPortal(
        <div
          className="fixed inset-0 z-[240] flex flex-col bg-bg"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <span id={titleId} className="sr-only">
            {label}
          </span>
          <div className="flex shrink-0 justify-end border-b border-border px-2 py-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close map"
              className="rounded-btn p-2 text-fg-secondary hover:bg-surface-alt hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <IconClose />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 px-3 pb-1 pt-2">
            <AppMap
              center={center}
              zoom={OBJECT_MAP_PREVIEW_ZOOM}
              showBuiltInAttribution={false}
              zoomUi={OBJECT_GEO_ZOOM_UI}
              className="h-full w-full rounded-btn border border-border"
              style={{ minHeight: OBJECT_MAP_MODAL_MIN_HEIGHT_PX, width: '100%' }}
            >
              <MapInvalidateSizeOnMount />
              <AppMarker position={center}>
                <span className="sr-only">{label}</span>
              </AppMarker>
            </AppMap>
          </div>

          <div className="shrink-0 pb-4 pt-1">
            <OsmCreditLine />
          </div>
        </div>,
        document.body,
      )
    ) : null;

  return (
    <MapProvider>
      <div>
        <div className="relative">
          <AppMap
            center={center}
            zoom={OBJECT_MAP_PREVIEW_ZOOM}
            showBuiltInAttribution={false}
            zoomUi={OBJECT_GEO_ZOOM_UI}
            className="w-full rounded-btn border border-border"
            style={{ minHeight: OBJECT_MAP_PREVIEW_MIN_HEIGHT_PX, width: '100%' }}
          >
            <AppMarker position={center}>
              <span className="sr-only">{label}</span>
            </AppMarker>
          </AppMap>

          <div className="pointer-events-none absolute bottom-3 right-3 z-[1100]">
            <button
              type="button"
              aria-label="Open map fullscreen"
              onClick={() => setExpanded(true)}
              className="pointer-events-auto flex size-9 cursor-pointer items-center justify-center rounded-btn border border-border/80 bg-surface text-fg shadow-sm hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <IconExpandLarge className="text-fg-secondary" />
            </button>
          </div>
        </div>

        <OsmCreditLine />
        {modal}
      </div>
    </MapProvider>
  );
}
