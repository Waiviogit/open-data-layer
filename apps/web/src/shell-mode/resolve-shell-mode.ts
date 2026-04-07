import type { ShellModeId, ShellModePreference, ShellModeResolution } from './types';

const DEFAULT_MODE: ShellModeId = 'default';

export function resolveShellMode(params: {
  cookiePreference?: ShellModePreference | null;
  defaultPreference?: ShellModePreference;
}): ShellModeResolution {
  const defaultPreference = params.defaultPreference ?? DEFAULT_MODE;

  if (
    params.cookiePreference !== undefined &&
    params.cookiePreference !== null
  ) {
    return {
      preference: params.cookiePreference,
      resolvedMode: params.cookiePreference,
      source: 'cookie',
    };
  }

  return {
    preference: defaultPreference,
    resolvedMode: defaultPreference,
    source: 'default',
  };
}
