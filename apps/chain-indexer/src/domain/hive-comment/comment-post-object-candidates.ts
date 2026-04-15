/**
 * Object id candidates from comment/post body (hashtags, `/object/slug`, including inside URLs).
 * Used by `parsePostObjectsForInsert` (root posts) and comment-driven object binding.
 *
 * @see docs/spec/data-model/post-json-metadata-objects.md
 */

/** `#token` where token is word chars or hyphen (aligned with legacy Waivio hashtag parsing). */
export const RE_HASHTAGS = /#([\w-]+)/g;

/** Relative or in-URL `/object/<object_id>` segments (same character class as post-objects index). */
export const OBJECT_PATH_BODY_RE = /\/object\/([a-z0-9._-]+)/gi;

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.filter((s) => s.length > 0))];
}

export function extractHashtagObjectIdsFromBody(body: string): string[] {
  if (!body) {
    return [];
  }
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(RE_HASHTAGS);
  while ((m = re.exec(body)) !== null) {
    const token = m[1]?.trim();
    if (token) {
      out.push(token);
    }
  }
  return uniqueNonEmpty(out);
}

export function extractObjectPathSlugsFromBody(body: string): string[] {
  if (!body) {
    return [];
  }
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(OBJECT_PATH_BODY_RE);
  while ((m = re.exec(body)) !== null) {
    const id = m[1]?.trim();
    if (id) {
      out.push(id);
    }
  }
  return uniqueNonEmpty(out);
}

/**
 * All unique object id candidates from body text (hashtags + `/object/` matches, including in full URLs).
 */
export function extractObjectIdsFromCommentBody(body: string): string[] {
  return uniqueNonEmpty([
    ...extractHashtagObjectIdsFromBody(body),
    ...extractObjectPathSlugsFromBody(body),
  ]);
}
