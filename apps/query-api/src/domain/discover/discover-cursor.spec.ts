import {
  decodeDiscoverObjectCursor,
  encodeDiscoverObjectCursor,
} from './discover-cursor';

describe('discover object cursor', () => {
  it('round-trips encode/decode', () => {
    const encoded = encodeDiscoverObjectCursor({
      sort: 'newest',
      seq: 42,
      weight: 1.5,
      object_id: 'obj-1',
    });
    const decoded = decodeDiscoverObjectCursor(encoded);
    expect(decoded).toEqual({
      sort: 'newest',
      seq: 42,
      weight: 1.5,
      object_id: 'obj-1',
    });
  });

  it('returns null for invalid cursor', () => {
    expect(decodeDiscoverObjectCursor('not-valid')).toBeNull();
  });
});
