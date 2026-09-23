import {
  clampPan,
  clampZoom,
  GALLERY_SWIPE_HORIZONTAL_THRESHOLD_PX,
  GALLERY_SWIPE_VERTICAL_THRESHOLD_PX,
  GALLERY_VIEWER_MAX_ZOOM,
  GALLERY_VIEWER_MIN_ZOOM,
  GALLERY_VIEWER_WHEEL_ZOOM_SENSITIVITY,
  isDoubleTapCandidate,
  panForZoomAtPoint,
  panForZoomChange,
  resolveSwipeAxis,
  shouldCommitSwipe,
  zoomFromPinchDistance,
  zoomFromWheelDelta,
} from './gallery-viewer-gestures';

describe('gallery-viewer-gestures', () => {
  describe('resolveSwipeAxis', () => {
    it('returns horizontal when dx dominates and exceeds threshold', () => {
      expect(resolveSwipeAxis(-80, 10)).toBe('horizontal');
      expect(resolveSwipeAxis(80, 10)).toBe('horizontal');
    });

    it('returns vertical when dy dominates and exceeds threshold', () => {
      expect(resolveSwipeAxis(10, 100)).toBe('vertical');
      expect(resolveSwipeAxis(10, -100)).toBe('vertical');
    });

    it('returns null when movement is below threshold or ambiguous', () => {
      expect(resolveSwipeAxis(20, 5)).toBeNull();
      expect(resolveSwipeAxis(50, 45)).toBeNull();
    });
  });

  describe('shouldCommitSwipe', () => {
    it('matches resolved axis', () => {
      expect(
        shouldCommitSwipe(
          'horizontal',
          -GALLERY_SWIPE_HORIZONTAL_THRESHOLD_PX,
          0,
        ),
      ).toBe(true);
      expect(
        shouldCommitSwipe('vertical', 0, GALLERY_SWIPE_VERTICAL_THRESHOLD_PX),
      ).toBe(true);
      expect(
        shouldCommitSwipe('horizontal', 0, GALLERY_SWIPE_VERTICAL_THRESHOLD_PX),
      ).toBe(false);
    });
  });

  describe('clampPan', () => {
    it('returns zero pan at 1x zoom', () => {
      expect(
        clampPan({ x: 100, y: 100 }, 1, { width: 400, height: 300 }),
      ).toEqual({
        x: 0,
        y: 0,
      });
    });

    it('clamps pan to stage bounds at higher zoom', () => {
      const stageSize = { width: 400, height: 200 };
      const zoom = 2;

      expect(clampPan({ x: 500, y: -500 }, zoom, stageSize)).toEqual({
        x: 200,
        y: -100,
      });
    });
  });

  describe('clampZoom', () => {
    it('clamps to the viewer range and rejects non-finite values', () => {
      expect(clampZoom(1)).toBe(1);
      expect(clampZoom(0.1)).toBe(GALLERY_VIEWER_MIN_ZOOM);
      expect(clampZoom(8)).toBe(GALLERY_VIEWER_MAX_ZOOM);
      expect(clampZoom(Number.NaN)).toBe(GALLERY_VIEWER_MIN_ZOOM);
    });
  });

  describe('zoomFromPinchDistance', () => {
    it('scales zoom by the finger-distance ratio', () => {
      expect(
        zoomFromPinchDistance({
          startZoom: 1,
          startDistance: 100,
          distance: 200,
        }),
      ).toBe(2);
    });

    it('clamps when the pinch would leave the viewer range', () => {
      expect(
        zoomFromPinchDistance({
          startZoom: 2,
          startDistance: 100,
          distance: 400,
        }),
      ).toBe(GALLERY_VIEWER_MAX_ZOOM);
      expect(
        zoomFromPinchDistance({
          startZoom: 1,
          startDistance: 100,
          distance: 20,
        }),
      ).toBe(GALLERY_VIEWER_MIN_ZOOM);
    });

    it('keeps the start zoom when distance is unusable', () => {
      expect(
        zoomFromPinchDistance({
          startZoom: 1.5,
          startDistance: 0,
          distance: 40,
        }),
      ).toBe(1.5);
    });
  });

  describe('zoomFromWheelDelta', () => {
    it('zooms in on negative delta and out on positive delta', () => {
      const zoomIn = zoomFromWheelDelta({
        zoom: 1,
        deltaY: -100,
        deltaMode: 0,
      });
      const zoomOut = zoomFromWheelDelta({
        zoom: 1,
        deltaY: 100,
        deltaMode: 0,
      });

      expect(zoomIn).toBeCloseTo(
        Math.exp(100 * GALLERY_VIEWER_WHEEL_ZOOM_SENSITIVITY),
      );
      expect(zoomOut).toBeCloseTo(
        Math.exp(-100 * GALLERY_VIEWER_WHEEL_ZOOM_SENSITIVITY),
      );
      expect(zoomIn).toBeGreaterThan(1);
      expect(zoomOut).toBeLessThan(1);
    });

    it('treats line and page delta modes as pixel equivalents', () => {
      expect(
        zoomFromWheelDelta({ zoom: 1, deltaY: -1, deltaMode: 1 }),
      ).toBeCloseTo(zoomFromWheelDelta({ zoom: 1, deltaY: -16, deltaMode: 0 }));
      expect(
        zoomFromWheelDelta({ zoom: 1, deltaY: -1, deltaMode: 2 }),
      ).toBeCloseTo(GALLERY_VIEWER_MAX_ZOOM);
    });

    it('clamps at the viewer limits', () => {
      expect(zoomFromWheelDelta({ zoom: 3, deltaY: -500, deltaMode: 0 })).toBe(
        GALLERY_VIEWER_MAX_ZOOM,
      );
      expect(zoomFromWheelDelta({ zoom: 0.5, deltaY: 500, deltaMode: 0 })).toBe(
        GALLERY_VIEWER_MIN_ZOOM,
      );
    });
  });

  describe('panForZoomChange', () => {
    it('matches panForZoomAtPoint when starting from 1x and zero pan', () => {
      const stageSize = { width: 400, height: 400 };
      const focal = { x: 300, y: 200 };

      expect(
        panForZoomChange({
          focal,
          stageSize,
          fromZoom: 1,
          toZoom: 2,
          pan: { x: 0, y: 0 },
        }),
      ).toEqual(panForZoomAtPoint({ tap: focal, stageSize, zoom: 2 }));
    });

    it('keeps the focal point stable when zoom changes from an existing pan', () => {
      const stageSize = { width: 400, height: 400 };

      expect(
        panForZoomChange({
          focal: { x: 300, y: 200 },
          stageSize,
          fromZoom: 2,
          toZoom: 3,
          pan: { x: -40, y: 10 },
        }),
      ).toEqual({
        x: -140,
        y: 10,
      });
    });

    it('returns zero pan when the next zoom is 1x or below', () => {
      expect(
        panForZoomChange({
          focal: { x: 300, y: 200 },
          stageSize: { width: 400, height: 400 },
          fromZoom: 2,
          toZoom: 1,
          pan: { x: -40, y: 10 },
        }),
      ).toEqual({ x: 0, y: 0 });
    });
  });

  describe('panForZoomAtPoint', () => {
    it('centers tap point under finger when zooming in', () => {
      const stageSize = { width: 400, height: 400 };
      const zoom = 2;

      expect(
        panForZoomAtPoint({
          tap: { x: 300, y: 200 },
          stageSize,
          zoom,
        }),
      ).toEqual({
        x: -100,
        y: expect.closeTo(0),
      });
    });

    it('returns zero pan when zoom is 1x', () => {
      expect(
        panForZoomAtPoint({
          tap: { x: 300, y: 200 },
          stageSize: { width: 400, height: 400 },
          zoom: 1,
        }),
      ).toEqual({ x: 0, y: 0 });
    });
  });

  describe('isDoubleTapCandidate', () => {
    it('accepts taps within time and distance limits', () => {
      expect(
        isDoubleTapCandidate(
          { x: 100, y: 100, atMs: 1000 },
          { x: 110, y: 105, atMs: 1200 },
        ),
      ).toBe(true);
    });

    it('rejects taps that are too far apart in time or space', () => {
      expect(
        isDoubleTapCandidate(
          { x: 100, y: 100, atMs: 1000 },
          { x: 100, y: 100, atMs: 1500 },
        ),
      ).toBe(false);
      expect(
        isDoubleTapCandidate(
          { x: 100, y: 100, atMs: 1000 },
          { x: 150, y: 100, atMs: 1100 },
        ),
      ).toBe(false);
    });
  });
});
