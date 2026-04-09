/** Aligns with auth-api session usernames (trim + lowercase). */
export function normalizeHiveAccount(name: string): string {
  return name.trim().toLowerCase();
}
