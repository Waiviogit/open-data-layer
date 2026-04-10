'use client';

import type { WalletFacade } from '../domain/types';

import { createAuthBffClient } from './clients/auth-bff.client';
import { createWalletFacade } from './wallet-facade';

/** Session key for restoring Keychain as active provider after reload (see `useHydrateWalletProvider`). */
export const ODL_WALLET_PROVIDER_SESSION_KEY = 'odl_wallet_provider';

let _facade: WalletFacade | null = null;

export function getWalletFacade(): WalletFacade {
  if (!_facade) {
    _facade = createWalletFacade(createAuthBffClient());
  }
  return _facade;
}
