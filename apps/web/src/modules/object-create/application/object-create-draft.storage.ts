import type { ObjectCreateState } from '../domain/object-create.types';

const DRAFT_KEY_PREFIX = 'object-create:draft:';

export function draftStorageKey(username: string): string {
  return `${DRAFT_KEY_PREFIX}${username}`;
}

export function loadObjectCreateDraft(
  username: string,
): Partial<ObjectCreateState> | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(draftStorageKey(username));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Partial<ObjectCreateState>;
  } catch {
    return null;
  }
}

export function saveObjectCreateDraft(
  username: string,
  state: ObjectCreateState,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      draftStorageKey(username),
      JSON.stringify(state),
    );
  } catch {
    // Quota or private mode — ignore.
  }
}

export function clearObjectCreateDraft(username: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(draftStorageKey(username));
  } catch {
    // ignore
  }
}
