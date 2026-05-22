const storage = new Map<string, string>();

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
    configurable: true,
  });
});

import {
  clearAccountHistory,
  getAccountHistory,
  pushAccountHistory,
} from './account-history';

describe('account-history', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('returns empty list when storage is empty', () => {
    expect(getAccountHistory()).toEqual([]);
  });

  it('prepends new usernames and deduplicates case-insensitively', () => {
    pushAccountHistory('alice');
    pushAccountHistory('bob');
    pushAccountHistory('Alice');
    expect(getAccountHistory()).toEqual(['Alice', 'bob']);
  });

  it('caps history at five accounts', () => {
    for (let i = 1; i <= 6; i += 1) {
      pushAccountHistory(`user${i}`);
    }
    expect(getAccountHistory()).toHaveLength(5);
    expect(getAccountHistory()[0]).toBe('user6');
  });

  it('clears stored history', () => {
    pushAccountHistory('alice');
    clearAccountHistory();
    expect(getAccountHistory()).toEqual([]);
  });
});
