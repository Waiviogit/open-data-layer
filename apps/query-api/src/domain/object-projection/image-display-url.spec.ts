import { UPDATE_TYPES } from '@opden-data-layer/core';
import { feedItemImagePreviewUrls } from './image-display-url';

describe('feedItemImagePreviewUrls affiliateButton', () => {
  it('lists the button image URL', () => {
    expect(
      feedItemImagePreviewUrls(
        UPDATE_TYPES.AFFILIATE_BUTTON,
        null,
        { url: 'https://img/btn.png' },
        undefined,
      ),
    ).toEqual(['https://img/btn.png']);
  });

  it('resolves a CID button through the content gateway', () => {
    expect(
      feedItemImagePreviewUrls(
        UPDATE_TYPES.AFFILIATE_BUTTON,
        null,
        { cid: 'bafyButton' },
        'https://ipfs.example',
      ),
    ).toEqual(['https://ipfs.example/ipfs-gateway/content/image/bafyButton']);
  });
});
