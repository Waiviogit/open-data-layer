/**
 * Public shell-mode API (client + isomorphic). Server-only helpers live in
 * `@/shell-mode/server` so layouts do not pull cookie/headers into client bundles.
 */
export type { ShellModeId, ShellModePreference, ShellModeResolution } from './types';
export { shellModeRegistry } from './shell-mode-registry';
export { resolveShellMode } from './resolve-shell-mode';
export { ShellModeProvider, useShellModeContext } from './shell-mode-provider';
export { useShellMode } from './use-shell-mode';
export { setShellModePreference } from './actions';
export {
  getVisibleMenuKeys,
  shouldCenterMenu,
  shouldHideHero,
  shouldUsePostGrid,
} from './shell-mode-features';
