import { resolveInitialDiscoverType } from './resolve-initial-discover-type';

describe('resolveInitialDiscoverType', () => {
  it('navigates to remembered type when URL has no type', () => {
    expect(
      resolveInitialDiscoverType({
        objectType: null,
        usersMode: false,
        remembered: 'restaurant',
      }),
    ).toEqual({ action: 'navigate', type: 'restaurant' });
  });

  it('navigates to product when remembered type is invalid', () => {
    expect(
      resolveInitialDiscoverType({
        objectType: null,
        usersMode: false,
        remembered: 'not-a-type',
      }),
    ).toEqual({ action: 'navigate', type: 'product' });
  });

  it('does nothing when URL already has a type', () => {
    expect(
      resolveInitialDiscoverType({
        objectType: 'book',
        usersMode: false,
        remembered: 'restaurant',
      }),
    ).toEqual({ action: 'none' });
  });

  it('does nothing in users mode', () => {
    expect(
      resolveInitialDiscoverType({
        objectType: null,
        usersMode: true,
        remembered: 'restaurant',
      }),
    ).toEqual({ action: 'none' });
  });

  it('navigates to product when no remembered type', () => {
    expect(
      resolveInitialDiscoverType({
        objectType: null,
        usersMode: false,
        remembered: null,
      }),
    ).toEqual({ action: 'navigate', type: 'product' });
  });
});
