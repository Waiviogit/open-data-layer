export function shouldSkipProxySessionRefresh(pathname: string): boolean {
  if (pathname.startsWith('/_next')) {
    return true;
  }
  if (pathname.startsWith('/api/auth')) {
    return true;
  }
  return false;
}
