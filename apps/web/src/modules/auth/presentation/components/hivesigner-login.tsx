'use client';

import { useCallback, useState } from 'react';

import { createAuthBffClient, redirectToHiveSigner } from '../../infrastructure';

const bff = createAuthBffClient();

export function useHivesignerLogin() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signIn = useCallback(async () => {
    setError(null);
    setPending(true);
    try {
      const ch = await bff.challenge({
        provider: 'hivesigner',
        username: '',
      });
      if (!ch.authorizeUrl) {
        throw new Error('authorizeUrl not returned — check HiveSigner env on auth-api');
      }
      redirectToHiveSigner(ch.authorizeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Challenge failed');
    } finally {
      setPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { signIn, error, pending, clearError };
}
