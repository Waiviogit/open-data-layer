/**
 * Discriminated union for expected success/failure in use cases and server actions.
 * Prefer over throw for validation, authorization, and not-found paths.
 *
 * @see docs/apps/web/spec/web-conventions.md
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function fail<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is { ok: true; value: T } {
  return r.ok === true;
}

export function isFail<T, E>(r: Result<T, E>): r is { ok: false; error: E } {
  return r.ok === false;
}
