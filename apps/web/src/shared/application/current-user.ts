/**
 * Authenticated principal for authorization policies and use cases.
 * Refine fields when auth is wired (roles, permissions, etc.).
 *
 * @see docs/apps/web/spec/architecture.md
 */

export type UserId = string;

export interface CurrentUser {
  readonly id: UserId;
  /** Hive account name (same as id when auth is Hive-based). */
  readonly username: string;
  /** Application role slug; extend when RBAC is defined. */
  readonly role: string;
}
