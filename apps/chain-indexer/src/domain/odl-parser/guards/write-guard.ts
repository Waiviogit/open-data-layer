import { Inject, Injectable } from '@nestjs/common';

export interface WriteGuardContext {
  action: 'update_create' | 'update_vote' | 'rank_vote';
  object_type: string;
  object_id: string;
  object_creator: string;
  /** Hive account that signed the event. */
  event_creator: string;
  /** Present for update_create. */
  update_type?: string;
}

export interface WriteGuard {
  /** Return true if this guard applies to the given context. */
  supports(ctx: WriteGuardContext): boolean;
  /** Return null if allowed, or a rejection reason string if blocked. */
  check(ctx: WriteGuardContext): string | null;
}

export const WRITE_GUARDS = Symbol('WRITE_GUARDS');

@Injectable()
export class WriteGuardRunner {
  constructor(@Inject(WRITE_GUARDS) private readonly guards: WriteGuard[]) {}

  check(ctx: WriteGuardContext): string | null {
    for (const guard of this.guards) {
      if (guard.supports(ctx)) {
        const rejection = guard.check(ctx);
        if (rejection) return rejection;
      }
    }
    return null;
  }
}
