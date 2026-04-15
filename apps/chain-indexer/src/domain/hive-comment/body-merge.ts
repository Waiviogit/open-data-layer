import { applyPatch } from 'diff';

/**
 * If stored chain body is a unified-diff patch (starts with `@@`), apply it to `incomingBody`.
 * On failure returns `patchText` (chain body) per reference behavior.
 */
export function mergeHiveCommentBody(incomingBody: string, chainBody: string): string {
  if (!chainBody.startsWith('@@')) {
    return chainBody;
  }
  try {
    const result = applyPatch(incomingBody, chainBody, { fuzzFactor: 2 });
    if (result === false) {
      return chainBody;
    }
    return result;
  } catch {
    return chainBody;
  }
}
