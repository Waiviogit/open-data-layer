const STORAGE_KEY = 'odl_keychain_accounts';
const MAX_ACCOUNTS = 5;

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getAccountHistory(): string[] {
  if (!canUseLocalStorage()) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

export function pushAccountHistory(username: string): void {
  const trimmed = username.trim();
  if (!trimmed || !canUseLocalStorage()) {
    return;
  }
  const lower = trimmed.toLowerCase();
  const next = [
    trimmed,
    ...getAccountHistory().filter((name) => name.toLowerCase() !== lower),
  ].slice(0, MAX_ACCOUNTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function clearAccountHistory(): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
