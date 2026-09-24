const SCROLL_KEY = '__odlScrollY';
/** Discover's RSC round trip on back is often past 1.5s; the loop must still be pending when the list mounts. */
const RESTORE_TIMEOUT_MS = 8000;

let restorePending = false;
let restoreFrame = 0;
let removeAbortListeners: (() => void) | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** Drop saved scroll so a copied history state does not restore the previous page's offset. */
export function historyStateWithoutSavedScroll(state: unknown): unknown {
  if (!isRecord(state) || !(SCROLL_KEY in state)) {
    return state;
  }
  const { [SCROLL_KEY]: _saved, ...rest } = state;
  return rest;
}

export function readSavedScrollY(state: unknown): number | null {
  if (!isRecord(state)) {
    return null;
  }
  const saved = state[SCROLL_KEY];
  if (typeof saved !== 'number' || !Number.isFinite(saved) || saved < 0) {
    return null;
  }
  return saved;
}

/** Stamp the current window offset onto the current history entry. */
export function rememberScrollForCurrentEntry(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const state = window.history.state;
  const next = isRecord(state)
    ? { ...state, [SCROLL_KEY]: window.scrollY }
    : { [SCROLL_KEY]: window.scrollY };
  window.history.replaceState(next, '');
}

/**
 * Instant jump. Restoring `scroll-behavior` in the same turn lets Chrome animate
 * the scroll against the stylesheet's `smooth` value.
 */
function scrollWindowTo(y: number): void {
  const root = document.documentElement;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, y);
  requestAnimationFrame(() => {
    root.style.scrollBehavior = '';
  });
}

export function scrollToTopNow(): void {
  scrollWindowTo(0);
}

export function isScrollRestorePending(): boolean {
  return restorePending;
}

function finishScrollRestore(): void {
  restorePending = false;
  if (restoreFrame !== 0) {
    cancelAnimationFrame(restoreFrame);
    restoreFrame = 0;
  }
  removeAbortListeners?.();
  removeAbortListeners = null;
}

/**
 * Restore `y` once the document is tall enough. Aborts on user input or after
 * {@link RESTORE_TIMEOUT_MS}. Pending stays true until then so a detail route
 * does not scroll to top over an in-flight back navigation.
 */
export function beginScrollRestore(y: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  finishScrollRestore();
  restorePending = true;
  const started = performance.now();

  const abort = () => finishScrollRestore();
  window.addEventListener('wheel', abort, { passive: true });
  window.addEventListener('touchstart', abort, { passive: true });
  window.addEventListener('keydown', abort);
  removeAbortListeners = () => {
    window.removeEventListener('wheel', abort);
    window.removeEventListener('touchstart', abort);
    window.removeEventListener('keydown', abort);
  };

  const tick = (now: number) => {
    if (!restorePending) {
      return;
    }
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight >= y + window.innerHeight) {
      scrollWindowTo(y);
      const maxY = Math.max(0, docHeight - window.innerHeight);
      const target = Math.min(y, maxY);
      if (Math.abs(window.scrollY - target) <= 2) {
        finishScrollRestore();
        return;
      }
    }
    if (now - started >= RESTORE_TIMEOUT_MS) {
      finishScrollRestore();
      return;
    }
    restoreFrame = requestAnimationFrame(tick);
  };

  restoreFrame = requestAnimationFrame(tick);
}

/** Test-only reset of the module-level restore loop. */
export function resetScrollRestoreForTests(): void {
  finishScrollRestore();
}
