export const GALLERY_SWIPE_HORIZONTAL_THRESHOLD_PX = 40;
export const GALLERY_SWIPE_VERTICAL_THRESHOLD_PX = 80;
export const GALLERY_SWIPE_AXIS_DOMINANCE_RATIO = 1.2;
export const GALLERY_DOUBLE_TAP_MAX_MS = 300;
export const GALLERY_DOUBLE_TAP_MAX_DISTANCE_PX = 24;
export const GALLERY_VIEWER_DOUBLE_TAP_ZOOM = 2;
export const GALLERY_VIEWER_MIN_ZOOM = 0.5;
export const GALLERY_VIEWER_MAX_ZOOM = 3;
export const GALLERY_VIEWER_ZOOM_STEP = 0.25;

/** WheelEvent.DOM_DELTA_LINE / PAGE. Pixel mode (0) is the default. Numeric so domain tests stay DOM-free. */
const WHEEL_DELTA_LINE = 1;
const WHEEL_DELTA_PAGE = 2;
const WHEEL_LINE_HEIGHT_PX = 16;
const WHEEL_PAGE_HEIGHT_PX = 800;

/**
 * A typical mouse notch (~100px, pixel mode) scales zoom by about one +/- step.
 * exp(±100 * 0.0025) ≈ 1.284 / 0.779.
 */
export const GALLERY_VIEWER_WHEEL_ZOOM_SENSITIVITY = 0.0025;

export type SwipeAxis = 'horizontal' | 'vertical';

export type Point2D = {
  x: number;
  y: number;
};

export type Size2D = {
  width: number;
  height: number;
};

export function resolveSwipeAxis(dx: number, dy: number): SwipeAxis | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (
    absDx >= GALLERY_SWIPE_HORIZONTAL_THRESHOLD_PX &&
    absDx > absDy * GALLERY_SWIPE_AXIS_DOMINANCE_RATIO
  ) {
    return 'horizontal';
  }

  if (
    absDy >= GALLERY_SWIPE_VERTICAL_THRESHOLD_PX &&
    absDy > absDx * GALLERY_SWIPE_AXIS_DOMINANCE_RATIO
  ) {
    return 'vertical';
  }

  return null;
}

export function shouldCommitSwipe(
  axis: SwipeAxis,
  dx: number,
  dy: number,
): boolean {
  return resolveSwipeAxis(dx, dy) === axis;
}

export function clampPan(
  pan: Point2D,
  zoom: number,
  stageSize: Size2D,
): Point2D {
  if (zoom <= 1 || stageSize.width <= 0 || stageSize.height <= 0) {
    return { x: 0, y: 0 };
  }

  const maxX = (stageSize.width * (zoom - 1)) / 2;
  const maxY = (stageSize.height * (zoom - 1)) / 2;

  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

export function clampZoom(
  zoom: number,
  minZoom: number = GALLERY_VIEWER_MIN_ZOOM,
  maxZoom: number = GALLERY_VIEWER_MAX_ZOOM,
): number {
  if (!Number.isFinite(zoom)) {
    return minZoom;
  }

  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

export function zoomFromPinchDistance({
  startZoom,
  startDistance,
  distance,
}: {
  startZoom: number;
  startDistance: number;
  distance: number;
}): number {
  if (startDistance <= 0 || !Number.isFinite(distance) || distance <= 0) {
    return clampZoom(startZoom);
  }

  return clampZoom(startZoom * (distance / startDistance));
}

export function normalizeWheelDeltaPx(
  deltaY: number,
  deltaMode: number,
): number {
  if (deltaMode === WHEEL_DELTA_LINE) {
    return deltaY * WHEEL_LINE_HEIGHT_PX;
  }

  if (deltaMode === WHEEL_DELTA_PAGE) {
    return deltaY * WHEEL_PAGE_HEIGHT_PX;
  }

  return deltaY;
}

export function zoomFromWheelDelta({
  zoom,
  deltaY,
  deltaMode,
}: {
  zoom: number;
  deltaY: number;
  deltaMode: number;
}): number {
  const pixels = normalizeWheelDeltaPx(deltaY, deltaMode);
  if (!Number.isFinite(pixels) || pixels === 0) {
    return clampZoom(zoom);
  }

  return clampZoom(
    zoom * Math.exp(-pixels * GALLERY_VIEWER_WHEEL_ZOOM_SENSITIVITY),
  );
}

export function panForZoomChange({
  focal,
  stageSize,
  fromZoom,
  toZoom,
  pan,
}: {
  focal: Point2D;
  stageSize: Size2D;
  fromZoom: number;
  toZoom: number;
  pan: Point2D;
}): Point2D {
  if (stageSize.width <= 0 || stageSize.height <= 0) {
    return clampPan(pan, toZoom, stageSize);
  }

  const center = {
    x: stageSize.width / 2,
    y: stageSize.height / 2,
  };

  return clampPan(
    {
      x: pan.x + (focal.x - center.x) * (fromZoom - toZoom),
      y: pan.y + (focal.y - center.y) * (fromZoom - toZoom),
    },
    toZoom,
    stageSize,
  );
}

export function panForZoomAtPoint({
  tap,
  stageSize,
  zoom,
}: {
  tap: Point2D;
  stageSize: Size2D;
  zoom: number;
}): Point2D {
  return panForZoomChange({
    focal: tap,
    stageSize,
    fromZoom: 1,
    toZoom: zoom,
    pan: { x: 0, y: 0 },
  });
}

export function isDoubleTapCandidate(
  previousTap: Point2D & { atMs: number },
  nextTap: Point2D & { atMs: number },
): boolean {
  const elapsedMs = nextTap.atMs - previousTap.atMs;
  if (elapsedMs < 0 || elapsedMs > GALLERY_DOUBLE_TAP_MAX_MS) {
    return false;
  }

  const dx = nextTap.x - previousTap.x;
  const dy = nextTap.y - previousTap.y;
  const distance = Math.hypot(dx, dy);

  return distance <= GALLERY_DOUBLE_TAP_MAX_DISTANCE_PX;
}
