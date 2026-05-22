import {
  buildDiscoverHrefFromSearch,
  pickDefaultSearchFilterTab,
} from './search-nav-list';

describe('pickDefaultSearchFilterTab', () => {
  it('picks type with highest count', () => {
    expect(
      pickDefaultSearchFilterTab({ product: 10, business: 50, list: 5 }, 100),
    ).toBe('business');
  });

  it('falls back to users when no object counts', () => {
    expect(pickDefaultSearchFilterTab({}, 5)).toBe('users');
  });
});

describe('buildDiscoverHrefFromSearch', () => {
  it('builds discover URL for object type', () => {
    expect(buildDiscoverHrefFromSearch('product', 'test')).toBe(
      '/discover?q=test&type=product',
    );
  });

  it('builds discover URL for users', () => {
    expect(buildDiscoverHrefFromSearch('users', 'test')).toBe(
      '/discover?q=test&users=1',
    );
  });
});
