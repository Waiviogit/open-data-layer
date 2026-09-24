/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { GalleryRankModal } from './gallery-rank-modal';

const broadcast = jest.fn().mockResolvedValue({ transactionId: 'tx1' });

jest.mock('@/modules/auth', () => ({
  useHydrateWalletProvider: () => undefined,
  getWalletFacade: () => ({ broadcast }),
}));

jest.mock('@/config/odl-network-provider', () => ({
  useOdlCustomJsonId: () => 'waivio.mainnet',
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/modules/notifications', () => ({
  awaitTrxConfirmation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/infrastructure/query/refresh-after-broadcast', () => ({
  refreshAfterBroadcast: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/infrastructure/query/revalidate-after-broadcast.server', () => ({
  revalidateObjectAfterBroadcast: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/presentation', () => ({
  AppModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="app-modal">{children}</div> : null,
  AppModalCloseButton: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      close
    </button>
  ),
  MODAL_Z_INDEX_GALLERY: 150,
  ObjectThumbnail: () => null,
}));

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        gallery_rank_label: 'Gallery rank',
        gallery_rank_current: 'Current rank: {value}',
        gallery_rank_your_rank: 'Your rank',
        gallery_rank_confirm: 'Confirm',
        gallery_rank_cancel: 'Cancel',
        gallery_rank_confirming: 'Confirming…',
      };
      return map[key] ?? key;
    },
  }),
}));

const YOUTUBE = 'https://www.youtube.com/watch?v=YCLDgh8WJFA';

describe('GalleryRankModal', () => {
  beforeEach(() => {
    broadcast.mockClear();
  });

  it('seeds slider at max when viewer rank is null', () => {
    render(
      <GalleryRankModal
        open
        onClose={jest.fn()}
        updateId="u1"
        objectId="obj1"
        rankScore={5000}
        viewerRank={null}
        viewerUsername="alice"
      />,
    );

    expect(screen.getByRole('slider')).toHaveValue('10000');
  });

  it('broadcasts rank_vote only on Confirm', async () => {
    const onClose = jest.fn();
    render(
      <GalleryRankModal
        open
        onClose={onClose}
        updateId="u1"
        objectId="obj1"
        rankScore={5000}
        viewerRank={null}
        viewerUsername="alice"
      />,
    );

    fireEvent.change(screen.getByRole('slider'), { target: { value: '8000' } });
    expect(broadcast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(broadcast).toHaveBeenCalledTimes(1);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not broadcast when closed without Confirm', () => {
    const onClose = jest.fn();
    render(
      <GalleryRankModal
        open
        onClose={onClose}
        updateId="u1"
        objectId="obj1"
        rankScore={5000}
        viewerRank={null}
        viewerUsername="alice"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onClose).toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('shows a video poster instead of an image thumbnail for youtube urls', () => {
    render(
      <GalleryRankModal
        open
        onClose={jest.fn()}
        updateId="u1"
        objectId="obj1"
        rankScore={5000}
        viewerRank={null}
        viewerUsername="alice"
        imagePreviewUrl={YOUTUBE}
      />,
    );

    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://img.youtube.com/vi/YCLDgh8WJFA/hqdefault.jpg',
    );
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('calls onRequireLogin on Confirm when guest', () => {
    const onRequireLogin = jest.fn();
    render(
      <GalleryRankModal
        open
        onClose={jest.fn()}
        updateId="u1"
        objectId="obj1"
        rankScore={5000}
        viewerRank={null}
        onRequireLogin={onRequireLogin}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onRequireLogin).toHaveBeenCalledTimes(1);
    expect(broadcast).not.toHaveBeenCalled();
  });
});
