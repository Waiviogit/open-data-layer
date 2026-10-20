/**
 * True for the account-root profile URL (`/@account` or `/user-profile/account`).
 * Post permalinks (`/@account/permlink`) and reserved profile tabs are excluded.
 */
export function isAccountRootProfilePath(pathname: string | null | undefined): boolean {
  return accountNameFromRootProfilePath(pathname) != null;
}

/** Account segment from `/@account` or `/user-profile/account`; otherwise null. */
export function accountNameFromRootProfilePath(
  pathname: string | null | undefined,
): string | null {
  if (pathname == null || pathname === '') {
    return null;
  }
  if (pathname.startsWith('/@')) {
    const parts = pathname.slice(2).split('/').filter(Boolean);
    return parts.length === 1 ? decodeURIComponent(parts[0] ?? '') : null;
  }
  if (pathname.startsWith('/user-profile/')) {
    const parts = pathname.slice('/user-profile/'.length).split('/').filter(Boolean);
    return parts.length === 1 ? decodeURIComponent(parts[0] ?? '') : null;
  }
  return null;
}
