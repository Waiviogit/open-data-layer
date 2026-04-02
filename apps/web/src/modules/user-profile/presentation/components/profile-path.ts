/**
 * Parses path segments after the account name for both public (`/@name/...`)
 * and internal (`/user-profile/name/...`) URLs.
 */
export function getSegmentsAfterAccount(pathname: string): string[] {
  let parts: string[];
  if (pathname.startsWith('/@')) {
    parts = pathname.slice(2).split('/').filter(Boolean);
  } else if (pathname.startsWith('/user-profile/')) {
    parts = pathname.slice('/user-profile/'.length).split('/').filter(Boolean);
  } else {
    return [];
  }
  return parts.slice(1);
}
