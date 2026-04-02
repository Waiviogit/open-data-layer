/**
 * Authenticated principal for authorization policies and use cases.
 * Refine fields when auth is wired (roles, permissions, etc.).
 *
 * @see docs/apps/web/spec/architecture.md
 */

export type UserId = string;

export interface CurrentUser {
  readonly id: UserId;
  /** Application role slug; extend when RBAC is defined. */
  readonly role: string;
}
