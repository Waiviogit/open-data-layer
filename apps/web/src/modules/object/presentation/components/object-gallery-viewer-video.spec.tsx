/**
 * @jest-environment jsdom
 */
import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';

import type { ProjectedGalleryAlbumView } from '../../domain/object-page.types';
import { ObjectGalleryViewer } from './object-gallery-viewer';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} />
  ),
}));

jest.mock('@/shared/presentation', () => ({
  ModalShell: ({ children }: { children: import('react').ReactNode }) => (
    <div data-testid="gallery-viewer-shell">{children}</div>
  ),
  MODAL_Z_INDEX_GALLERY: 1000,
  UserAvatar: () => null,
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
  close: 'Close',
  play_video: 'Play video',
  close_video: 'Close video',
  object_detail_gallery_prev: 'Previous photo',
  object_detail_gallery_next: 'Next photo',
};

const videoA = 'https://www.youtube.com/watch?v=abcdefghijk';
const videoB = 'https://www.youtube.com/watch?v=bbcdefghijk';
const photo = 'https://cdn.example.com/photo.jpg';

function album(urls: string[]): ProjectedGalleryAlbumView {
  return {
    name: 'Videos',
    items: urls.map((url) => ({ url, rankScore: null, isAvatar: false })),
  };
}

function renderViewer(urls: string[], overrides: Partial<ComponentProps<typeof ObjectGalleryViewer>> = {}) {
  const nextAlbum = album(urls);
  render(
    <I18nProvider locale="en-US" messages={messages}>
      <ObjectGalleryViewer
        objectId="obj-1"
        objectName="Test object"
        album={nextAlbum}
        allGalleryAlbums={[nextAlbum]}
        initialIndex={0}
        onClose={jest.fn()}
        viewerUsername={null}
        onRequireLogin={jest.fn()}
        supportedUpdateTypes={[]}
        isReadOnlyGallery
        {...overrides}
      />
    </I18nProvider>,
  );
}

describe('ObjectGalleryViewer host player', () => {
  it('opens a video in the host iframe with no app chrome', () => {
    renderViewer([videoA]);

    const frames = document.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveAttribute('src', 'https://www.youtube.com/embed/abcdefghijk');
    expect(frames[0]).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(screen.queryByRole('button', { name: 'Play video' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close video' })).toBeNull();
  });

  it('swaps the host iframe when moving between videos', () => {
    renderViewer([videoA, videoB]);

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

    const frames = document.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveAttribute('src', 'https://www.youtube.com/embed/bbcdefghijk');
  });

  it('shows a photo in the lightbox without an iframe', () => {
    renderViewer([photo]);

    expect(document.querySelector('iframe')).toBeNull();
  });

  it('removes the host iframe when the lightbox moves to a photo', () => {
    renderViewer([videoA, photo]);
    expect(document.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abcdefghijk',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

    expect(document.querySelector('iframe')).toBeNull();
  });
});
