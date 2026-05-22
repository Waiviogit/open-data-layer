'use client';

import { useCallback, useState } from 'react';

import { pushAccountHistory } from '../../domain/account-history';
import {
  getWalletFacade,
  ODL_WALLET_PROVIDER_SESSION_KEY,
} from '../../infrastructure/wallet-facade.client';

export type UseKeychainLoginOptions = {
  onLoginSuccess?: () => void;
};

export function useKeychainLogin({ onLoginSuccess }: UseKeychainLoginOptions = {}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signIn = useCallback(
    async (username: string) => {
      const trimmed = username.trim();
      if (!trimmed) {
        return;
      }
      setError(null);
      setPending(true);
      try {
        await getWalletFacade().login('keychain', trimmed);
        try {
          sessionStorage.setItem(ODL_WALLET_PROVIDER_SESSION_KEY, 'keychain');
        } catch {
          // ignore quota / private mode
        }
        pushAccountHistory(trimmed);
        onLoginSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
        setPending(false);
      }
    },
    [onLoginSuccess],
  );

  const clearError = useCallback(() => setError(null), []);

  return { signIn, error, pending, clearError };
}
