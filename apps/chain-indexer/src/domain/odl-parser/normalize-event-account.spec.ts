import { resolveEventAccount } from './normalize-event-account';

describe('resolveEventAccount', () => {
  it('reports mismatch when payload account differs from posting auth', () => {
    expect(resolveEventAccount('bob', 'alice')).toEqual({
      account: 'bob',
      mismatch: true,
    });
  });

  it('treats account names differing only by case or padding as matching', () => {
    expect(resolveEventAccount('alice', ' Alice ')).toEqual({
      account: 'alice',
      mismatch: false,
    });
  });

  it('falls back to posting auth when payload account is empty', () => {
    expect(resolveEventAccount('alice', '')).toEqual({
      account: 'alice',
      mismatch: false,
    });
  });
});
