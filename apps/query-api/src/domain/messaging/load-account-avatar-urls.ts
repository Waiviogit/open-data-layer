import type { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { avatarUrlFromJoinedAccountRow } from '../users/resolve-avatar-url-from-hive-metadata';

export async function loadAccountAvatarUrls(
  accounts: AccountsCurrentRepository,
  names: readonly string[],
): Promise<Map<string, string | null>> {
  const unique = [
    ...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
  ];
  const urls = new Map<string, string | null>();
  if (unique.length === 0) {
    return urls;
  }

  const lookupNames = [
    ...new Set(unique.flatMap((name) => [name, name.toLowerCase()])),
  ];
  const rows = await accounts.findByNames(lookupNames);
  const byLower = new Map<string, string | null>();
  for (const row of rows) {
    byLower.set(row.name.toLowerCase(), avatarUrlFromJoinedAccountRow(row));
  }
  for (const name of unique) {
    urls.set(name, byLower.get(name.toLowerCase()) ?? null);
  }
  return urls;
}
