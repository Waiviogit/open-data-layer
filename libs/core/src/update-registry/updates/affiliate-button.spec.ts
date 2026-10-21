import { UPDATE_AFFILIATE_BUTTON } from './affiliate-button';

describe('UPDATE_AFFILIATE_BUTTON', () => {
  it('accepts a URL-only button image', () => {
    const result = UPDATE_AFFILIATE_BUTTON.schema.safeParse({
      url: 'https://img/btn.png',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ url: 'https://img/btn.png' });
    }
  });

  it('accepts a CID-only button image', () => {
    const result = UPDATE_AFFILIATE_BUTTON.schema.safeParse({ cid: 'bafyButton' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ cid: 'bafyButton' });
    }
  });

  it('rejects cid and url together', () => {
    expect(
      UPDATE_AFFILIATE_BUTTON.schema.safeParse({
        cid: 'bafyX',
        url: 'https://img/btn.png',
      }).success,
    ).toBe(false);
  });

  it('rejects an empty object', () => {
    expect(UPDATE_AFFILIATE_BUTTON.schema.safeParse({}).success).toBe(false);
  });

  it('rejects a bare URL string', () => {
    expect(
      UPDATE_AFFILIATE_BUTTON.schema.safeParse('https://img/btn.png').success,
    ).toBe(false);
  });
});
