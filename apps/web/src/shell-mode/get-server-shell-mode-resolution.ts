import { getCookieShellMode } from './shell-mode-cookie';
import { resolveShellMode } from './resolve-shell-mode';
import type { ShellModeResolution } from './types';

export async function getServerShellModeResolution(): Promise<ShellModeResolution> {
  const cookiePreference = await getCookieShellMode();

  return resolveShellMode({
    cookiePreference,
  });
}
