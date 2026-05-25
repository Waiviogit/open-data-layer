const storage = new Map<string, string>();

beforeAll(() => {
  Object.defineProperty(globalThis, 'sessionStorage', {
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
  clearHivesignerToken,
  getHivesignerToken,
  hydrateHivesignerTokenFromCookie,
  ODL_HS_TOKEN_COOKIE,
  ODL_HS_TOKEN_STORAGE_KEY,
} from './hivesigner-token';
import { ODL_WALLET_PROVIDER_SESSION_KEY } from './wallet-facade.client';

describe('hivesigner-token', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      configurable: true,
    });
  });

  it('hydrates token from cookie into sessionStorage', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: `${ODL_HS_TOKEN_COOKIE}=abc123` },
      configurable: true,
    });

    expect(hydrateHivesignerTokenFromCookie()).toBe(true);
    expect(getHivesignerToken()).toBe('abc123');
    expect(sessionStorage.getItem(ODL_WALLET_PROVIDER_SESSION_KEY)).toBe('hivesigner');
  });

  it('clears stored token', () => {
    sessionStorage.setItem(ODL_HS_TOKEN_STORAGE_KEY, 'token');
    clearHivesignerToken();
    expect(getHivesignerToken()).toBeNull();
  });
});
