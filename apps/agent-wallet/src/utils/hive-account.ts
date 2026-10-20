import { isHiveAccountName } from '@opden-data-layer/hive-account';

export function normalizeHiveAccount(account: string): string {
  return account.trim().replace(/^@/, '').toLowerCase();
}

export function isValidHiveAccountName(account: string): boolean {
  return isHiveAccountName(normalizeHiveAccount(account));
}
