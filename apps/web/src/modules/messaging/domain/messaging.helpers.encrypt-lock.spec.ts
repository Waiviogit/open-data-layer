/**
 * @jest-environment jsdom
 */
import {
  encryptLockEnabledFromCookie,
  readEncryptLockState,
  writeEncryptLockEnabled,
  writeEncryptLockMemoProbed,
} from './messaging.helpers';
import { ENCRYPT_LOCK_COOKIE, encryptLockStorageKey } from './messaging.types';

describe('encrypt lock storage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${ENCRYPT_LOCK_COOKIE}=; Max-Age=0; path=/`;
  });

  it('returns defaults when nothing is stored', () => {
    expect(readEncryptLockState('alice')).toEqual({
      enabled: false,
      memoProbed: false,
    });
  });

  it('returns defaults for a blank username', () => {
    expect(readEncryptLockState('   ')).toEqual({
      enabled: false,
      memoProbed: false,
    });
  });

  it('round-trips enabled without setting memoProbed', () => {
    writeEncryptLockEnabled('Alice', true);
    expect(readEncryptLockState('alice')).toEqual({
      enabled: true,
      memoProbed: false,
    });
    expect(document.cookie).toContain(`${ENCRYPT_LOCK_COOKIE}=alice`);
  });

  it('clears the SSR cookie when the lock is turned off', () => {
    writeEncryptLockEnabled('alice', true);
    expect(document.cookie).toContain(`${ENCRYPT_LOCK_COOKIE}=alice`);
    writeEncryptLockEnabled('alice', false);
    expect(document.cookie).not.toContain(`${ENCRYPT_LOCK_COOKIE}=alice`);
  });

  it('treats a cookie as enabled only for the matching viewer', () => {
    expect(encryptLockEnabledFromCookie('alice', 'Alice')).toBe(true);
    expect(encryptLockEnabledFromCookie('alice', 'bob')).toBe(false);
    expect(encryptLockEnabledFromCookie(undefined, 'alice')).toBe(false);
  });

  it('keeps memoProbed after lock is turned off', () => {
    writeEncryptLockEnabled('alice', true);
    writeEncryptLockMemoProbed('alice');
    writeEncryptLockEnabled('alice', false);
    expect(readEncryptLockState('alice')).toEqual({
      enabled: false,
      memoProbed: true,
    });
  });

  it('isolates state per user', () => {
    writeEncryptLockEnabled('alice', true);
    writeEncryptLockMemoProbed('alice');
    expect(readEncryptLockState('bob')).toEqual({
      enabled: false,
      memoProbed: false,
    });
  });

  it('ignores invalid JSON', () => {
    localStorage.setItem(encryptLockStorageKey('alice'), '{not-json');
    expect(readEncryptLockState('alice')).toEqual({
      enabled: false,
      memoProbed: false,
    });
  });

  it('ignores non-object JSON', () => {
    localStorage.setItem(encryptLockStorageKey('alice'), '"yes"');
    expect(readEncryptLockState('alice')).toEqual({
      enabled: false,
      memoProbed: false,
    });
  });

  it('treats a stored memoProbed false as unset', () => {
    localStorage.setItem(
      encryptLockStorageKey('alice'),
      JSON.stringify({ enabled: true, memoProbed: false }),
    );
    expect(readEncryptLockState('alice')).toEqual({
      enabled: true,
      memoProbed: false,
    });
  });
});
