'use client';

/** Keychain may return a hex string or an object with signature fields. */
type KeychainSignBufferResult = string | { signature?: string; sig?: string };

type KeychainResponse = {
  success: boolean;
  error?: string;
  result?: KeychainSignBufferResult;
};

/** Broadcast callback — result shape varies by Keychain version; see keychain-signer extraction. */
export type KeychainBroadcastResponse = {
  success: boolean;
  error?: string;
  result?: unknown;
};

/** Hive Keychain wire operation tuple (operation name + payload). */
export type KeychainWireOperation = readonly [string, Record<string, unknown>];

export type HiveKeychainWindow = Window & {
  hive_keychain?: {
    requestSignBuffer: (
      username: string,
      message: string,
      keyType: string,
      callback: (response: KeychainResponse) => void,
    ) => void;
    requestBroadcast: (
      account: string,
      operations: KeychainWireOperation[],
      key: 'Posting' | 'Active' | 'Memo',
      callback: (response: KeychainBroadcastResponse) => void,
      rpc?: string | null,
    ) => void;
  };
};

function extractSignatureFromResult(result: unknown): string | null {
  if (typeof result === 'string' && result.trim().length > 0) {
    return result.trim();
  }
  if (result && typeof result === 'object') {
    const o = result as Record<string, unknown>;
    const sig = o.signature ?? o.sig;
    if (typeof sig === 'string' && sig.trim().length > 0) {
      return sig.trim();
    }
  }
  return null;
}

export async function signBufferWithKeychain(
  username: string,
  message: string,
): Promise<{ signature: string; signedMessage: string }> {
  const win = window as HiveKeychainWindow;
  const kc = win.hive_keychain;
  if (!kc?.requestSignBuffer) {
    throw new Error('Hive Keychain extension not found');
  }
  return new Promise((resolve, reject) => {
    kc.requestSignBuffer(username, message, 'Posting', (response) => {
      const signature = extractSignatureFromResult(response.result);
      if (!response.success || !signature) {
        reject(new Error(response.error ?? 'Sign failed'));
        return;
      }
      resolve({ signature, signedMessage: message });
    });
  });
}
