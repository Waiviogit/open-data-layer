/**
 * @jest-environment jsdom
 */
import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';

import type { ProjectedGalleryAlbumView } from '../../domain/object-page.types';
import { ObjectGalleryViewer } from './object-gallery-viewer';

jest.mock('@/shared/presentation', () => ({
  ModalShell: ({ children }: { children: import('react').ReactNode }) => (
    <div data-testid="gallery-viewer-shell">{children}</div>
  ),
  MODAL_Z_INDEX_GALLERY: 1000,
  UserAvatar: () => null,
}));

jest.mock('./gallery-media-item', () => ({
  GalleryMediaItem: ({ src }: { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="gallery-viewer-image" src={src} alt="" />
  ),
  isGalleryVideoUrl: (url: string) => url.includes('youtube.com'),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/config/odl-network-provider', () => ({
  useOdlCustomJsonId: () => 'odl-test',
}));

jest.mock('@/modules/auth', () => ({
  useHydrateWalletProvider: () => undefined,
  getWalletFacade: () => ({ broadcast: jest.fn() }),
}));

jest.mock('@/modules/notifications', () => ({
  awaitTrxConfirmation: jest.fn(),
}));

jest.mock('@/shared/infrastructure/query/revalidate-after-broadcast.server', () => ({
  revalidateObjectAfterBroadcast: jest.fn(),
}));

jest.mock('@/shared/infrastructure/query/refresh-after-broadcast', () => ({
  refreshAfterBroadcast: jest.fn(),
}));

jest.mock('@/app/(app)/object/[object-id]/gallery/gallery-approval.actions', () => ({
  fetchGalleryApprovalStatsAction: jest.fn().mockResolvedValue({ byUpdateId: {}, byUrl: {} }),
}));

jest.mock('@opden-data-layer/hive-broadcast', () => ({
  buildGalleryItemBroadcastOp: jest.fn(),
  buildOdlUpdateVoteOp: jest.fn(),
}));

jest.mock('@/modules/object-updates/application/broadcast-odl-op-with-overflow', () => ({
  broadcastOdlOpWithOverflow: jest.fn(),
}));

jest.mock('@/modules/object-updates/presentation/components/add-update-modal', () => ({
  AddUpdateModal: () => null,
}));

jest.mock('@/modules/object-updates/presentation/components/update-vote-controls', () => ({
  UpdateVoteControls: () => null,
}));

jest.mock('./gallery-rank-trigger-button', () => ({
  GalleryRankTriggerButton: () => null,
}));

const messages = {
  gallery: 'Gallery',
  close: 'Close',
  object_detail_gallery_prev: 'Previous photo',
  object_detail_gallery_next: 'Next photo',
  object_gallery_zoom_in: 'Zoom in',
  object_gallery_zoom_out: 'Zoom out',
};

const album: ProjectedGalleryAlbumView = {
  name: 'Photos',
  items: [
    { url: 'https://example.com/photo-1.jpg', rankScore: null, isAvatar: false },
    { url: 'https://example.com/photo-2.jpg', rankScore: null, isAvatar: false },
  ],
};

function renderViewer(overrides: Partial<ComponentProps<typeof ObjectGalleryViewer>> = {}) {
  const onClose = jest.fn();

  render(
    <I18nProvider locale="en-US" messages={messages}>
      <ObjectGalleryViewer
        objectId="obj-1"
        objectName="Test object"
        album={album}
        allGalleryAlbums={[album]}
        initialIndex={0}
        onClose={onClose}
        viewerUsername={null}
        onRequireLogin={jest.fn()}
        supportedUpdateTypes={[]}
        isReadOnlyGallery
        {...overrides}
      />
    </I18nProvider>,
  );

  return { onClose };
}

function getStage(): HTMLElement {
  return screen.getByTestId('gallery-viewer-image').parentElement!.parentElement!;
}

function ensurePointerEventPolyfill() {
  if (typeof PointerEvent !== 'undefined') {
    return;
  }

  class MockPointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  Object.defineProperty(globalThis, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: MockPointerEvent,
  });
}

function dispatchPointer(
  target: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: PointerEventInit,
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      isPrimary: true,
      ...init,
    }),
  );
}

function swipe(
  stage: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  dispatchPointer(stage, 'pointerdown', {
    clientX: from.x,
    clientY: from.y,
    pointerId: 1,
  });
  dispatchPointer(stage, 'pointermove', {
    clientX: to.x,
    clientY: to.y,
    pointerId: 1,
  });
  dispatchPointer(stage, 'pointerup', {
    clientX: to.x,
    clientY: to.y,
    pointerId: 1,
  });
}

describe('ObjectGalleryViewer gestures', () => {
  beforeEach(() => {
    ensurePointerEventPolyfill();
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 400,
      right: 400,
      width: 400,
      height: 400,
      toJSON: () => ({}),
    });

    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = jest.fn();
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = jest.fn();
    }
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = jest.fn().mockReturnValue(true);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('swipes left to advance to the next photo', async () => {
    renderViewer();
    const stage = getStage();

    act(() => {
      swipe(stage, { x: 200, y: 200 }, { x: 120, y: 200 });
    });

    await waitFor(() => {
      expect(screen.getByTestId('gallery-viewer-image')).toHaveAttribute(
        'src',
        'https://example.com/photo-2.jpg',
      );
    });
  });

  it('swipes right to go to the previous photo', async () => {
    renderViewer({ initialIndex: 1 });
    const stage = getStage();

    act(() => {
      swipe(stage, { x: 120, y: 200 }, { x: 200, y: 200 });
    });

    await waitFor(() => {
      expect(screen.getByTestId('gallery-viewer-image')).toHaveAttribute(
        'src',
        'https://example.com/photo-1.jpg',
      );
    });
  });

  it('swipes down to close the viewer', () => {
    const { onClose } = renderViewer();
    const stage = getStage();

    swipe(stage, { x: 200, y: 100 }, { x: 200, y: 220 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('double-clicks to zoom in at 1x', () => {
    renderViewer();
    const stage = getStage();

    fireEvent.doubleClick(stage, { clientX: 300, clientY: 200 });

    const transformLayer = screen.getByTestId('gallery-viewer-image').parentElement!;
    expect(transformLayer.style.transform).toContain('scale(2)');
  });

  it('does not close when dragging vertically while zoomed', () => {
    const { onClose } = renderViewer();
    const stage = getStage();

    fireEvent.doubleClick(stage, { clientX: 200, clientY: 200 });
    swipe(stage, { x: 200, y: 100 }, { x: 200, y: 220 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not zoom on double-click for video items', () => {
    const videoAlbum: ProjectedGalleryAlbumView = {
      name: 'Videos',
      items: [{ url: 'https://youtube.com/watch?v=abc', rankScore: null, isAvatar: false }],
    };

    renderViewer({ album: videoAlbum, allGalleryAlbums: [videoAlbum] });
    const stage = getStage();

    fireEvent.doubleClick(stage, { clientX: 200, clientY: 200 });

    const transformLayer = screen.getByTestId('gallery-viewer-image').parentElement!;
    expect(transformLayer.style.transform).toBe('');
  });
});
