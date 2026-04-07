import type { ShellModeId } from './types';

/**
 * Per-mode UI behavior for profile and feed. Centralizes mode checks so new
 * modes or renames require updates in one place.
 */
export function shouldHideHero(mode: ShellModeId): boolean {
  return mode === 'twitter';
}

export function shouldUsePostGrid(mode: ShellModeId): boolean {
  return mode === 'instagram';
}

/** When non-null, only these primary nav keys are shown (see user-menu). */
export function getVisibleMenuKeys(mode: ShellModeId): Set<string> | null {
  if (mode === 'instagram') {
    return new Set<string>(['feed', 'transfers']);
  }
  return null;
}

export function shouldCenterMenu(mode: ShellModeId): boolean {
  return mode === 'instagram';
}
