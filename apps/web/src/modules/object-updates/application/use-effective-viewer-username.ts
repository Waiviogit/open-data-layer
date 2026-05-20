'use client';

import { useEffect, useState } from 'react';

import { createAuthBffClient } from '@/modules/auth/infrastructure/clients/auth-bff.client';

/**
 * Prefer server-rendered username; on the client, recover session via BFF refresh
 * when cookies exist but the RSC pass did not receive the user (e.g. stale shell).
 */
export function useEffectiveViewerUsername(
  serverUsername: string | null | undefined,
): string | null {
  const [username, setUsername] = useState<string | null>(serverUsername ?? null);

  useEffect(() => {
    setUsername(serverUsername ?? null);
    if (serverUsername) {
      return;
    }

    let cancelled = false;
    void createAuthBffClient()
      .refresh()
      .then((session) => {
        if (!cancelled) {
          setUsername(session.user.username);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsername(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [serverUsername]);

  return username;
}
