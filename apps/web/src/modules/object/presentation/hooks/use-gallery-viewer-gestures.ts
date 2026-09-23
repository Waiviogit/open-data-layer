'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  clampPan,
  GALLERY_VIEWER_DOUBLE_TAP_ZOOM,
  isDoubleTapCandidate,
  panForZoomAtPoint,
  panForZoomChange,
  resolveSwipeAxis,
  shouldCommitSwipe,
  zoomFromPinchDistance,
  zoomFromWheelDelta,
  type Point2D,
  type Size2D,
  type SwipeAxis,
} from '../../domain/gallery-viewer-gestures';

const CLICK_SUPPRESS_MS = 400;

type GestureMode = 'idle' | 'single' | 'pinch' | 'ignore';

type PinchSnapshot = {
  pointerIds: [number, number];
  startDistance: number;
  startZoom: number;
  startPan: Point2D;
  startMidpoint: Point2D;
};

export type UseGalleryViewerGesturesOptions = {
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: Point2D;
  setPan: (pan: Point2D) => void;
  onGoNext: () => void;
  onGoPrev: () => void;
  onClose: () => void;
  /** Double-tap zoom, pinch, wheel, and drag-to-pan while zoomed. Swipe nav/close still work when false. */
  zoomGesturesEnabled: boolean;
  canNavigate: boolean;
};

export type UseGalleryViewerGesturesResult = {
  stageRef: (node: HTMLDivElement | null) => void;
  transformStyle: {
    transform: string;
    opacity: number;
    transition: string;
  };
  pointerHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onDoubleClick: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
};

function readStageSize(stage: HTMLDivElement | null): Size2D {
  if (!stage) {
    return { width: 0, height: 0 };
  }

  const rect = stage.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
}

function readLocalPoint(event: ReactPointerEvent<HTMLDivElement>): Point2D {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function capturePointer(event: ReactPointerEvent<HTMLDivElement>): void {
  if (typeof event.currentTarget.setPointerCapture !== 'function') {
    return;
  }

  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Some browsers reject capture for detached or unsupported pointer ids.
  }
}

function releasePointer(event: ReactPointerEvent<HTMLDivElement>): void {
  if (typeof event.currentTarget.hasPointerCapture !== 'function') {
    return;
  }

  try {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  } catch {
    // Ignore release failures when capture was never established.
  }
}

function pointerDistance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerMidpoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function clientToLocal(point: Point2D, stage: HTMLElement): Point2D {
  const rect = stage.getBoundingClientRect();
  return {
    x: point.x - rect.left,
    y: point.y - rect.top,
  };
}

export function useGalleryViewerGestures({
  zoom,
  setZoom,
  pan,
  setPan,
  onGoNext,
  onGoPrev,
  onClose,
  zoomGesturesEnabled,
  canNavigate,
}: UseGalleryViewerGesturesOptions): UseGalleryViewerGesturesResult {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null);
  const setStageNode = useCallback((node: HTMLDivElement | null) => {
    stageRef.current = node;
    setStageElement((current) => (current === node ? current : node));
  }, []);
  const pointersRef = useRef<Map<number, Point2D>>(new Map());
  const gestureModeRef = useRef<GestureMode>('idle');
  const pinchRef = useRef<PinchSnapshot | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef<Point2D | null>(null);
  const lockedAxisRef = useRef<SwipeAxis | null>(null);
  const dragOffsetRef = useRef<Point2D>({ x: 0, y: 0 });
  const lastTapRef = useRef<(Point2D & { atMs: number }) | null>(null);
  const suppressClickRef = useRef(false);
  const panStartRef = useRef<Point2D>({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });
  const [isPointerActive, setIsPointerActive] = useState(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const clearSwipePreview = useCallback(() => {
    dragOffsetRef.current = { x: 0, y: 0 };
    setDragOffset({ x: 0, y: 0 });
    lockedAxisRef.current = null;
  }, []);

  const resetDrag = useCallback(() => {
    clearSwipePreview();
    pointerStartRef.current = null;
    activePointerIdRef.current = null;
    pinchRef.current = null;
    gestureModeRef.current = 'idle';
    setIsPointerActive(false);
  }, [clearSwipePreview]);

  const suppressFollowingClick = useCallback(() => {
    suppressClickRef.current = true;
    lastTapRef.current = null;
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, CLICK_SUPPRESS_MS);
    }
  }, []);

  const applyZoom = useCallback(
    (nextZoom: number, nextPan: Point2D) => {
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
    },
    [setPan, setZoom],
  );

  const beginPinch = useCallback(
    (firstId: number, secondId: number) => {
      const stage = stageRef.current;
      const first = pointersRef.current.get(firstId);
      const second = pointersRef.current.get(secondId);
      if (!stage || !first || !second) {
        return;
      }

      const startDistance = pointerDistance(first, second);
      if (startDistance <= 0) {
        return;
      }

      pinchRef.current = {
        pointerIds: [firstId, secondId],
        startDistance,
        startZoom: zoomRef.current,
        startPan: { ...panRef.current },
        startMidpoint: clientToLocal(pointerMidpoint(first, second), stage),
      };
      gestureModeRef.current = 'pinch';
      activePointerIdRef.current = null;
      pointerStartRef.current = null;
      clearSwipePreview();
      setIsPointerActive(true);
    },
    [clearSwipePreview],
  );

  const applyPinch = useCallback(() => {
    const pinch = pinchRef.current;
    const stage = stageRef.current;
    if (!pinch || !stage) {
      return;
    }

    const first = pointersRef.current.get(pinch.pointerIds[0]);
    const second = pointersRef.current.get(pinch.pointerIds[1]);
    if (!first || !second) {
      return;
    }

    const nextZoom = zoomFromPinchDistance({
      startZoom: pinch.startZoom,
      startDistance: pinch.startDistance,
      distance: pointerDistance(first, second),
    });
    const midpoint = clientToLocal(pointerMidpoint(first, second), stage);
    const stageSize = readStageSize(stage);
    const zoomedPan = panForZoomChange({
      focal: pinch.startMidpoint,
      stageSize,
      fromZoom: pinch.startZoom,
      toZoom: nextZoom,
      pan: pinch.startPan,
    });
    applyZoom(
      nextZoom,
      clampPan(
        {
          x: zoomedPan.x + (midpoint.x - pinch.startMidpoint.x),
          y: zoomedPan.y + (midpoint.y - pinch.startMidpoint.y),
        },
        nextZoom,
        stageSize,
      ),
    );
  }, [applyZoom]);

  const adoptPanFromPointer = useCallback(
    (pointerId: number) => {
      const point = pointersRef.current.get(pointerId);
      if (!point) {
        return;
      }

      pinchRef.current = null;
      gestureModeRef.current = 'single';
      activePointerIdRef.current = pointerId;
      pointerStartRef.current = { ...point };
      panStartRef.current = { ...panRef.current };
      clearSwipePreview();
      setIsPointerActive(true);
    },
    [clearSwipePreview],
  );

  const finishPinch = useCallback(
    (liftedId: number) => {
      const pinch = pinchRef.current;
      if (pinch && !pinch.pointerIds.includes(liftedId)) {
        return;
      }

      const remaining = [...pointersRef.current.keys()];
      if (remaining.length >= 2 && zoomGesturesEnabled) {
        beginPinch(remaining[0], remaining[1]);
        return;
      }

      if (
        remaining.length === 1 &&
        zoomRef.current > 1 &&
        zoomGesturesEnabled
      ) {
        adoptPanFromPointer(remaining[0]);
        suppressFollowingClick();
        return;
      }

      pinchRef.current = null;
      suppressFollowingClick();
      if (remaining.length === 0) {
        resetDrag();
        return;
      }

      gestureModeRef.current = 'ignore';
      activePointerIdRef.current = null;
      pointerStartRef.current = null;
      clearSwipePreview();
      setIsPointerActive(false);
    },
    [
      adoptPanFromPointer,
      beginPinch,
      resetDrag,
      suppressFollowingClick,
      zoomGesturesEnabled,
    ],
  );

  const toggleZoomAtPoint = useCallback(
    (tap: Point2D) => {
      const stageSize = readStageSize(stageRef.current);
      const currentZoom = zoomRef.current;

      if (currentZoom > 1) {
        applyZoom(1, { x: 0, y: 0 });
        return;
      }

      const nextZoom = GALLERY_VIEWER_DOUBLE_TAP_ZOOM;
      applyZoom(
        nextZoom,
        panForZoomAtPoint({ tap, stageSize, zoom: nextZoom }),
      );
    },
    [applyZoom],
  );

  const startSinglePointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      gestureModeRef.current = 'single';
      activePointerIdRef.current = event.pointerId;
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
      lockedAxisRef.current = null;
      dragOffsetRef.current = { x: 0, y: 0 };
      setDragOffset({ x: 0, y: 0 });
      panStartRef.current = { ...panRef.current };
      setIsPointerActive(true);
    },
    [],
  );

  useEffect(() => {
    // ModalShell mounts children after its own effect, so the stage ref is
    // null on the viewer's first effect. Re-subscribe when the node appears.
    if (!stageElement || !zoomGesturesEnabled) {
      return;
    }

    const stage = stageElement;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (pinchRef.current) {
        return;
      }

      const rect = stage.getBoundingClientRect();
      const currentZoom = zoomRef.current;
      const nextZoom = zoomFromWheelDelta({
        zoom: currentZoom,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
      });
      if (nextZoom === currentZoom) {
        return;
      }

      applyZoom(
        nextZoom,
        panForZoomChange({
          focal: {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          },
          stageSize: { width: rect.width, height: rect.height },
          fromZoom: currentZoom,
          toZoom: nextZoom,
          pan: panRef.current,
        }),
      );
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [applyZoom, stageElement, zoomGesturesEnabled]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      capturePointer(event);

      if (gestureModeRef.current === 'ignore') {
        return;
      }

      if (!zoomGesturesEnabled) {
        if (activePointerIdRef.current != null) {
          pointersRef.current.delete(event.pointerId);
          return;
        }

        startSinglePointer(event);
        return;
      }

      if (pointersRef.current.size >= 2) {
        const ids = [...pointersRef.current.keys()];
        beginPinch(ids[0], ids[1]);
        return;
      }

      startSinglePointer(event);
    },
    [beginPinch, startSinglePointer, zoomGesturesEnabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (
        zoomGesturesEnabled &&
        gestureModeRef.current !== 'ignore' &&
        gestureModeRef.current !== 'pinch' &&
        pointersRef.current.size >= 2
      ) {
        const ids = [...pointersRef.current.keys()];
        beginPinch(ids[0], ids[1]);
      }

      if (gestureModeRef.current === 'pinch') {
        applyPinch();
        return;
      }

      if (
        gestureModeRef.current !== 'single' ||
        activePointerIdRef.current !== event.pointerId ||
        !pointerStartRef.current
      ) {
        return;
      }

      const dx = event.clientX - pointerStartRef.current.x;
      const dy = event.clientY - pointerStartRef.current.y;

      if (zoomRef.current > 1 && zoomGesturesEnabled) {
        const stageSize = readStageSize(stageRef.current);
        const nextPan = clampPan(
          {
            x: panStartRef.current.x + dx,
            y: panStartRef.current.y + dy,
          },
          zoomRef.current,
          stageSize,
        );
        panRef.current = nextPan;
        setPan(nextPan);
        return;
      }

      if (!lockedAxisRef.current) {
        lockedAxisRef.current = resolveSwipeAxis(dx, dy);
      }

      if (lockedAxisRef.current === 'horizontal') {
        dragOffsetRef.current = { x: dx, y: 0 };
        setDragOffset({ x: dx, y: 0 });
        return;
      }

      if (lockedAxisRef.current === 'vertical' && dy > 0) {
        dragOffsetRef.current = { x: 0, y: dy };
        setDragOffset({ x: 0, y: dy });
      }
    },
    [applyPinch, beginPinch, setPan, zoomGesturesEnabled],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const tracked =
        pointersRef.current.has(event.pointerId) ||
        activePointerIdRef.current === event.pointerId;
      if (!tracked) {
        return;
      }

      const start = pointerStartRef.current;
      const dx = start ? event.clientX - start.x : 0;
      const dy = start ? event.clientY - start.y : 0;
      const localPoint = readLocalPoint(event);
      const nowMs = Date.now();
      const mode = gestureModeRef.current;
      const wasActiveSingle =
        mode === 'single' && activePointerIdRef.current === event.pointerId;

      pointersRef.current.delete(event.pointerId);
      releasePointer(event);

      if (mode === 'pinch') {
        finishPinch(event.pointerId);
        return;
      }

      if (mode === 'ignore') {
        if (pointersRef.current.size === 0) {
          resetDrag();
        }
        return;
      }

      if (!wasActiveSingle || !start) {
        return;
      }

      if (zoomRef.current <= 1) {
        const axis = lockedAxisRef.current ?? resolveSwipeAxis(dx, dy);

        if (
          axis === 'horizontal' &&
          canNavigate &&
          shouldCommitSwipe('horizontal', dx, dy)
        ) {
          suppressFollowingClick();
          if (dx < 0) {
            onGoNext();
          } else {
            onGoPrev();
          }
        } else if (
          axis === 'vertical' &&
          shouldCommitSwipe('vertical', dx, dy) &&
          dy > 0
        ) {
          suppressClickRef.current = true;
          onClose();
        } else if (
          Math.abs(dx) <= 8 &&
          Math.abs(dy) <= 8 &&
          lastTapRef.current &&
          isDoubleTapCandidate(lastTapRef.current, {
            ...localPoint,
            atMs: nowMs,
          })
        ) {
          if (zoomGesturesEnabled) {
            toggleZoomAtPoint(localPoint);
          }
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { ...localPoint, atMs: nowMs };
        }
      }

      resetDrag();
    },
    [
      canNavigate,
      finishPinch,
      onClose,
      onGoNext,
      onGoPrev,
      resetDrag,
      suppressFollowingClick,
      toggleZoomAtPoint,
      zoomGesturesEnabled,
    ],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        !pointersRef.current.has(event.pointerId) &&
        activePointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      const mode = gestureModeRef.current;
      pointersRef.current.delete(event.pointerId);
      releasePointer(event);

      if (mode === 'pinch') {
        finishPinch(event.pointerId);
        return;
      }

      if (mode === 'ignore') {
        if (pointersRef.current.size === 0) {
          resetDrag();
        }
        return;
      }

      if (activePointerIdRef.current === event.pointerId) {
        resetDrag();
      }
    },
    [finishPinch, resetDrag],
  );

  const onDoubleClick = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!zoomGesturesEnabled || suppressClickRef.current) {
        return;
      }

      event.preventDefault();
      toggleZoomAtPoint(readLocalPoint(event));
      lastTapRef.current = null;
    },
    [toggleZoomAtPoint, zoomGesturesEnabled],
  );

  const totalPanX = pan.x + dragOffset.x;
  const totalPanY = pan.y + dragOffset.y;
  const dismissOpacity =
    zoom <= 1 && dragOffset.y > 0 ? Math.max(0.35, 1 - dragOffset.y / 240) : 1;

  return {
    stageRef: setStageNode,
    transformStyle: {
      transform: `translate3d(${totalPanX}px, ${totalPanY}px, 0) scale(${zoom})`,
      opacity: dismissOpacity,
      transition: isPointerActive
        ? 'none'
        : 'transform 0.15s ease, opacity 0.15s ease',
    },
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onDoubleClick,
    },
  };
}
