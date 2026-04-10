'use client';

import { useEffect } from 'react';

import {
  getWalletFacade,
  ODL_WALLET_PROVIDER_SESSION_KEY,
} from '../../infrastructure/wallet-facade.client';

/**
 * After a full reload, cookie session is valid but `DefaultWalletFacade` loses `activeProvider`.
 * Keychain login stores `'keychain'` in sessionStorage; this hook restores it so broadcast works.
 * HiveSigner / HiveAuth hydration is not implemented yet.
 */
export function useHydrateWalletProvider(): void {
  useEffect(() => {
    const raw = sessionStorage.getItem(ODL_WALLET_PROVIDER_SESSION_KEY);
    if (raw === 'keychain') {
      getWalletFacade().setActiveProvider('keychain');
    }
  }, []);
}
