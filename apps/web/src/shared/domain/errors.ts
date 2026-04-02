/**
 * Base error shapes for web app modules. Feature modules may extend with their own code unions.
 *
 * @see docs/apps/web/spec/architecture.md
 */

export class UnauthorizedError extends Error {
  readonly name = 'UnauthorizedError';

  constructor(message = 'Unauthorized') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
