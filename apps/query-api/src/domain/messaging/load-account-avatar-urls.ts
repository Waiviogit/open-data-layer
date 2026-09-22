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

  const rows = await accounts.findByNames(unique);
  for (const name of unique) {
    urls.set(name, null);
  }
  for (const row of rows) {
    urls.set(row.name, avatarUrlFromJoinedAccountRow(row));
  }
  return urls;
}
