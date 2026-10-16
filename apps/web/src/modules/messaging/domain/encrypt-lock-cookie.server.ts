import 'server-only';

import { cookies } from 'next/headers';

import { encryptLockEnabledFromCookie } from './messaging.helpers';
import { ENCRYPT_LOCK_COOKIE } from './messaging.types';

/** Server-side: whether this viewer left the compose lock on. */
export async function readEncryptLockEnabledCookie(username: string): Promise<boolean> {
  const store = await cookies();
  return encryptLockEnabledFromCookie(store.get(ENCRYPT_LOCK_COOKIE)?.value, username);
}
