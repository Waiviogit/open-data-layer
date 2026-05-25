'use client';

import { useEffect } from 'react';

import {
  getHivesignerToken,
  hydrateHivesignerTokenFromCookie,
} from '../../infrastructure/hivesigner-token';
import {
  getWalletFacade,
  ODL_WALLET_PROVIDER_SESSION_KEY,
} from '../../infrastructure/wallet-facade.client';

/**
 * After a full reload, cookie session is valid but `DefaultWalletFacade` loses `activeProvider`.
 * Keychain login stores `'keychain'` in sessionStorage; HiveSigner stores token + provider after OAuth.
 */
export function useHydrateWalletProvider(): void {
  useEffect(() => {
    if (hydrateHivesignerTokenFromCookie()) {
      getWalletFacade().setActiveProvider('hivesigner');
      return;
    }

    const raw = sessionStorage.getItem(ODL_WALLET_PROVIDER_SESSION_KEY);
    if (raw === 'keychain') {
      getWalletFacade().setActiveProvider('keychain');
      return;
    }
    if (raw === 'hivesigner' && getHivesignerToken()) {
      getWalletFacade().setActiveProvider('hivesigner');
    }
  }, []);
}
