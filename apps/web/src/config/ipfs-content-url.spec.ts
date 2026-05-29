import {
  extractCidFromContentGatewayUrl,
  imageContentUrlForCid,
} from './ipfs-content-url';

describe('imageContentUrlForCid', () => {
  it('builds gateway content path', () => {
    expect(imageContentUrlForCid('https://example.com', 'bafy1')).toBe(
      'https://example.com/ipfs-gateway/content/image/bafy1',
    );
  });
});

describe('extractCidFromContentGatewayUrl', () => {
  it('extracts cid from display URL', () => {
    expect(
      extractCidFromContentGatewayUrl(
        'http://localhost:7300/ipfs-gateway/content/image/bafyBee',
      ),
    ).toBe('bafyBee');
  });
});
