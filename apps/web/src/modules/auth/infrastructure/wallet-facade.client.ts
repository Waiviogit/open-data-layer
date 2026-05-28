'use client';

import type { WalletFacade } from '../domain/types';

import { createAuthBffClient } from './clients/auth-bff.client';
import { createWalletFacade } from './wallet-facade';
import { ODL_HS_TOKEN_STORAGE_KEY } from './hivesigner-token.constants';

/** sessionStorage key for HiveSigner provider (session-scoped; token is sensitive). */
export const ODL_WALLET_PROVIDER_SESSION_KEY = 'odl_wallet_provider';

/**
 * localStorage key for Keychain provider persistence across browser sessions.
 * Keychain signs via browser extension — no sensitive token is stored here.
 */
export const ODL_KEYCHAIN_PERSISTENT_KEY = 'odl_keychain_active';

let _facade: WalletFacade | null = null;

export function getWalletFacade(): WalletFacade {
  if (!_facade) {
    _facade = createWalletFacade(createAuthBffClient());
  }
  return _facade;
}

/**
 * Clears all wallet session state: resets active provider and removes both
 * the sessionStorage (HiveSigner) and localStorage (Keychain) persistence keys.
 * Call this on logout.
 */
export function clearWalletSession(): void {
  getWalletFacade().setActiveProvider(null);
  try {
    localStorage.removeItem(ODL_KEYCHAIN_PERSISTENT_KEY);
    // HiveSigner token + provider marker (both in localStorage)
    localStorage.removeItem(ODL_WALLET_PROVIDER_SESSION_KEY);
    localStorage.removeItem(ODL_HS_TOKEN_STORAGE_KEY);
    // Legacy sessionStorage cleanup
    sessionStorage.removeItem(ODL_WALLET_PROVIDER_SESSION_KEY);
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}
