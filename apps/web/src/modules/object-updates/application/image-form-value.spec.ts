import {
  normalizeImageCidOrUrlFormValue,
  sanitizeImageCidOrUrlFormValue,
} from './image-form-value';

describe('normalizeImageCidOrUrlFormValue', () => {
  it('keeps only cid when cid is set', () => {
    expect(
      normalizeImageCidOrUrlFormValue({
        cid: 'bafyTest',
        url: 'https://example.com/ipfs-gateway/content/image/other',
      }),
    ).toEqual({ cid: 'bafyTest' });
  });

  it('maps content-gateway display URL to cid', () => {
    expect(
      normalizeImageCidOrUrlFormValue({
        url: 'https://example.com/ipfs-gateway/content/image/bafyFromGateway',
      }),
    ).toEqual({ cid: 'bafyFromGateway' });
  });

  it('keeps external https URL as url', () => {
    expect(
      normalizeImageCidOrUrlFormValue({
        url: 'https://cdn.example.com/photo.jpg',
      }),
    ).toEqual({ url: 'https://cdn.example.com/photo.jpg' });
  });
});

describe('sanitizeImageCidOrUrlFormValue', () => {
  it('drops empty url and normalizes to cid-only for upload shape', () => {
    expect(
      sanitizeImageCidOrUrlFormValue({ cid: 'bafyX', url: '' }),
    ).toEqual({ cid: 'bafyX' });
  });
});
