'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  encryptEphemeralOneWay,
  isHiveMemoCiphertext,
  normalizeHiveMemoCiphertext,
} from '@opden-data-layer/hive-memo-crypto';

import { useHydrateWalletProvider } from '@/modules/auth';

import {
  readEncryptLockState,
  writeEncryptLockMemoProbed,
} from '../domain/messaging.helpers';
import type { SendEncryptedMessageInput } from '../domain/messaging.types';
import { canUseKeychainMemoCrypto } from '../infrastructure/memo-crypto-capability';
import {
  encodeMessageWithKeychain,
  probeKeychainMemoKey,
} from '../infrastructure/keychain-memo-crypto.adapter';
import { fetchMemoPublicKey } from '../infrastructure/memo-public-key.client';

export type BuildEncryptedMessageInput = {
  body: string;
  recipient: string;
  viewerUsername: string;
  oneWayConsent: boolean;
};

export type BuildEncryptedMessageResult =
  | { ok: true; input: SendEncryptedMessageInput }
  | { ok: false; error: 'consent_required' | 'encrypt_failed'; message?: string };

export function useMessagingEncryptSend(viewerUsername: string | null) {
  useHydrateWalletProvider();
  const viewer = viewerUsername?.trim() ?? '';
  const [hasMemoKey, setHasMemoKey] = useState<boolean | null>(null);
  const [probePending, setProbePending] = useState(false);
  const keychainMemoAvailable = canUseKeychainMemoCrypto();

  useEffect(() => {
    if (!viewer) {
      setHasMemoKey(null);
      return;
    }
    setHasMemoKey(readEncryptLockState(viewer).memoProbed ? true : null);
  }, [viewer]);

  const ensureMemoKeyProbed = useCallback(async (): Promise<boolean> => {
    if (!viewer) {
      setHasMemoKey(null);
      return false;
    }
    if (!keychainMemoAvailable) {
      setHasMemoKey(false);
      return false;
    }
    if (hasMemoKey !== null) {
      return hasMemoKey;
    }
    if (readEncryptLockState(viewer).memoProbed) {
      setHasMemoKey(true);
      return true;
    }
    setProbePending(true);
    try {
      const ok = await probeKeychainMemoKey(viewer);
      setHasMemoKey(ok);
      if (ok) {
        writeEncryptLockMemoProbed(viewer);
      }
      return ok;
    } finally {
      setProbePending(false);
    }
  }, [hasMemoKey, keychainMemoAvailable, viewer]);

  const buildEncryptedMessage = useCallback(
    async (input: BuildEncryptedMessageInput): Promise<BuildEncryptedMessageResult> => {
      const recipient = input.recipient.trim();
      const plaintext = input.body.trim();
      if (!viewer || !recipient || !plaintext) {
        return { ok: false, error: 'encrypt_failed' };
      }

      let ciphertext: string | null = null;
      let mode: 'memo' | 'ephemeral' = 'memo';
      let keychainError: string | null = null;

      if (keychainMemoAvailable) {
        try {
          ciphertext = await encodeMessageWithKeychain(viewer, recipient, plaintext);
          mode = 'memo';
        } catch (err) {
          keychainError = err instanceof Error ? err.message : null;
        }
      }

      if (ciphertext == null) {
        if (!input.oneWayConsent) {
          return {
            ok: false,
            error: 'consent_required',
            message: keychainError ?? undefined,
          };
        }
        try {
          const { memo_public_key: recipientMemoPublic } = await fetchMemoPublicKey(recipient);
          ciphertext = normalizeHiveMemoCiphertext(
            encryptEphemeralOneWay(recipientMemoPublic, plaintext),
          );
          mode = 'ephemeral';
        } catch {
          return { ok: false, error: 'encrypt_failed' };
        }
      }

      if (!isHiveMemoCiphertext(ciphertext)) {
        return { ok: false, error: 'encrypt_failed' };
      }

      return {
        ok: true,
        input: { ciphertext, mode, to: recipient },
      };
    },
    [keychainMemoAvailable, viewer],
  );

  return {
    hasMemoKey,
    keychainMemoAvailable,
    probePending,
    ensureMemoKeyProbed,
    buildEncryptedMessage,
  };
}
