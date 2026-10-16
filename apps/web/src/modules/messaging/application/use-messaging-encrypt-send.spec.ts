/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import {
  readEncryptLockState,
  writeEncryptLockMemoProbed,
} from '../domain/messaging.helpers';
import { useMessagingEncryptSend } from './use-messaging-encrypt-send';

const getActiveProvider = jest.fn();
const probeKeychainMemoKey = jest.fn();

jest.mock('@/modules/auth', () => ({
  useHydrateWalletProvider: jest.fn(),
  getWalletFacade: () => ({
    getActiveProvider,
  }),
}));

jest.mock('../infrastructure/keychain-memo-crypto.adapter', () => ({
  probeKeychainMemoKey: (...args: unknown[]) => probeKeychainMemoKey(...args),
  encodeMessageWithKeychain: jest.fn(),
}));

describe('useMessagingEncryptSend', () => {
  beforeEach(() => {
    localStorage.clear();
    getActiveProvider.mockReturnValue('keychain');
    probeKeychainMemoKey.mockReset();
    probeKeychainMemoKey.mockResolvedValue(true);
  });

  it('skips Keychain when a successful memo probe is already stored', async () => {
    writeEncryptLockMemoProbed('alice');
    const { result } = renderHook(() => useMessagingEncryptSend('alice'));

    await act(async () => {
      await expect(result.current.ensureMemoKeyProbed()).resolves.toBe(true);
    });

    expect(probeKeychainMemoKey).not.toHaveBeenCalled();
    expect(result.current.hasMemoKey).toBe(true);
  });

  it('persists memoProbed after a successful Keychain probe', async () => {
    const { result } = renderHook(() => useMessagingEncryptSend('alice'));

    await act(async () => {
      await expect(result.current.ensureMemoKeyProbed()).resolves.toBe(true);
    });

    expect(probeKeychainMemoKey).toHaveBeenCalledWith('alice');
    expect(readEncryptLockState('alice').memoProbed).toBe(true);
  });

  it('does not persist memoProbed after a failed Keychain probe', async () => {
    probeKeychainMemoKey.mockResolvedValue(false);
    const { result } = renderHook(() => useMessagingEncryptSend('alice'));

    await act(async () => {
      await expect(result.current.ensureMemoKeyProbed()).resolves.toBe(false);
    });

    expect(readEncryptLockState('alice').memoProbed).toBe(false);
  });
});
