'use client';

import { useEffect } from 'react';

import {
  getHivesignerToken,
  hydrateHivesignerTokenFromCookie,
} from '../../infrastructure/hivesigner-token';
import {
  getWalletFacade,
  ODL_KEYCHAIN_PERSISTENT_KEY,
  ODL_WALLET_PROVIDER_SESSION_KEY,
} from '../../infrastructure/wallet-facade.client';

/**
 * After a full reload, cookie session is valid but `DefaultWalletFacade` loses `activeProvider`.
 * Both Keychain and HiveSigner state is persisted in `localStorage` so the provider survives
 * browser restarts while the refresh cookie (7 days) is still valid.
 *
 * - Keychain: `ODL_KEYCHAIN_PERSISTENT_KEY` in localStorage (no sensitive token in our code).
 * - HiveSigner: token + provider marker in localStorage; also restored from the short-lived
 *   handoff cookie written by the BFF OAuth callback.
 * - Legacy: old `sessionStorage['odl_wallet_provider'] = 'keychain'` entries are migrated
 *   to localStorage on first mount so existing sessions are not disrupted.
 */
export function useHydrateWalletProvider(): void {
  useEffect(() => {
    if (hydrateHivesignerTokenFromCookie()) {
      getWalletFacade().setActiveProvider('hivesigner');
      return;
    }

    // Keychain: check localStorage first (persists across browser restarts)
    try {
      if (localStorage.getItem(ODL_KEYCHAIN_PERSISTENT_KEY)) {
        getWalletFacade().setActiveProvider('keychain');
        return;
      }
    } catch {
      // ignore private mode / storage errors
    }

    // HiveSigner: check localStorage (provider marker + token both live there)
    try {
      const raw = localStorage.getItem(ODL_WALLET_PROVIDER_SESSION_KEY);
      if (raw === 'hivesigner' && getHivesignerToken()) {
        getWalletFacade().setActiveProvider('hivesigner');
        return;
      }
    } catch {
      // ignore private mode / storage errors
    }

    // Backward compat: migrate old sessionStorage 'keychain' entry
    try {
      const legacy = sessionStorage.getItem(ODL_WALLET_PROVIDER_SESSION_KEY);
      if (legacy === 'keychain') {
        localStorage.setItem(ODL_KEYCHAIN_PERSISTENT_KEY, '1');
        sessionStorage.removeItem(ODL_WALLET_PROVIDER_SESSION_KEY);
        getWalletFacade().setActiveProvider('keychain');
      }
    } catch {
      // ignore storage errors
    }
  }, []);
}
