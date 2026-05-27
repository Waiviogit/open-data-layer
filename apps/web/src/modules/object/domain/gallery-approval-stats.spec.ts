import {
  EMPTY_GALLERY_APPROVAL_STAT,
  resolveGalleryPhotoApprovalStat,
  type GalleryApprovalStatsIndex,
} from './gallery-approval-stats';

describe('resolveGalleryPhotoApprovalStat', () => {
  const index: GalleryApprovalStatsIndex = {
    byUpdateId: {
      'upd-1': { approvePercent: 80, forCount: 4, againstCount: 1 },
    },
    byUrl: {
      'https://example.com/photo.jpg': {
        approvePercent: 50,
        forCount: 2,
        againstCount: 2,
      },
    },
  };

  it('prefers update_id lookup', () => {
    expect(
      resolveGalleryPhotoApprovalStat(
        { update_id: 'upd-1', url: 'https://example.com/other.jpg' },
        index,
      ),
    ).toEqual({ approvePercent: 80, forCount: 4, againstCount: 1 });
  });

  it('falls back to url lookup when update_id is missing', () => {
    expect(
      resolveGalleryPhotoApprovalStat(
        { url: 'https://example.com/photo.jpg' },
        {
          byUpdateId: {},
          byUrl: {
            'https://example.com/photo.jpg': {
              approvePercent: 50,
              forCount: 2,
              againstCount: 2,
            },
          },
        },
      ),
    ).toEqual({ approvePercent: 50, forCount: 2, againstCount: 2 });
  });

  it('matches urls after normalization', () => {
    expect(
      resolveGalleryPhotoApprovalStat(
        { url: 'https://example.com/photo.jpg#thumb' },
        {
          byUpdateId: {},
          byUrl: {
            'https://example.com/photo.jpg': {
              approvePercent: 75,
              forCount: 3,
              againstCount: 1,
            },
          },
        },
      ),
    ).toEqual({ approvePercent: 75, forCount: 3, againstCount: 1 });
  });

  it('returns empty stat when nothing matches', () => {
    expect(
      resolveGalleryPhotoApprovalStat({ url: 'https://example.com/missing.jpg' }, index),
    ).toEqual(EMPTY_GALLERY_APPROVAL_STAT);
  });

  it('resolves synthetic avatar row via image update url index', () => {
    expect(
      resolveGalleryPhotoApprovalStat(
        { url: 'https://example.com/avatar.jpg', isAvatar: true },
        {
          byUpdateId: {},
          byUrl: {
            'https://example.com/avatar.jpg': {
              approvePercent: 100,
              forCount: 1,
              againstCount: 0,
            },
          },
        },
      ),
    ).toEqual({ approvePercent: 100, forCount: 1, againstCount: 0 });
  });
});
